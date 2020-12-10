import * as vscode from 'vscode';
import * as path from 'path';
import { Execute } from './execute';
import { Config } from './config';
import { Log } from './log';
import { Head } from './head';
import { Parser } from './parser';
import { Decoration } from './decoration';
import { Folding } from './folding';
import { Calendar } from './calendar';
import { Level } from './level';
import { State } from './state';

enum CalendarMode {
	none = 'none',
	schedule = 'SCHEDULED',
	deadline = 'DEADLINE'
}

export class Org implements vscode.Disposable {
	private config: Config;
	private log: Log;
	private updateTimer: NodeJS.Timer | undefined;
	private parser: Parser;
	private decoration: Decoration;
	private folding: Folding;
	private calendar: Calendar;
	private calendarMode: CalendarMode;
	private calendarEditor: vscode.TextEditor | undefined;
	private calendarHead: Head | undefined;
	private level: Level;
	private state: State;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.log = Log.getInstance();
		this.parser = new Parser(context);
		this.decoration = new Decoration(this.parser);
		this.folding = new Folding(context);
		this.calendar = new Calendar(context);
		this.calendarMode = CalendarMode.none;
		this.level = new Level(this.parser);
		this.state = new State(this.parser);

		// Register Providers
		if (this.config.get('fold')) {
			context.subscriptions.push(vscode.languages.registerFoldingRangeProvider('org', this.folding));
		}
		context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('Calendar', this.calendar));

		// Register Commands
		context.subscriptions.push(vscode.commands.registerCommand('org-code.promote.head', () => this.level.changeHeadLevel(-1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.demote.head', () => this.level.changeHeadLevel(1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.promote.tree', () => this.level.changeTreeLevel(-1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.demote.tree', () => this.level.changeTreeLevel(1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.set.state', () => this.state.setState()));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.rotate.next.state', () => this.state.rotateState(1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.rotate.prev.state', () => this.state.rotateState(-1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.open.calendar', async (mode: CalendarMode) => this.openCalendar(mode)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.go.prev.date', () => this.calendar.goDate(-1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.go.next.date', () => this.calendar.goDate(1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.go.prev.week', () => this.calendar.goDate(-7)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.go.next.week', () => this.calendar.goDate(7)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.set.date', async () => this.setDate()));

		// open new document
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				if (editor.document.languageId === 'org') {
					this.startUpdate();
				} else {
					this.stopUpdate();
				}
			}
		}, null, context.subscriptions);

		// modify current document
		vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				if (editor.document.languageId === 'org') {
					this.startUpdate();
				} else {
					this.stopUpdate();
				}
			}
		}, null, context.subscriptions);

		// current document
		if (vscode.window.activeTextEditor) {
			const editor = vscode.window.activeTextEditor;
			if (editor.document.languageId === 'org') {
				this.startUpdate();
			} else {
				this.stopUpdate();
			}
		}
	}

	dispose(): void {
		this.stopUpdate();
		this.decoration.dispose();
	}

	private async update(self: Org): Promise<void> {
		await self.parser.parse();
		if (self.config.get('indent')) {
			self.decoration.updateDecorations();
		}
	}

	startUpdate(): void {
		const delay: number = this.config.get('updateDelay');
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
			this.updateTimer = undefined;
		}
		this.updateTimer = setTimeout(this.update, delay, this);
	}

	stopUpdate(): void {
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
			this.updateTimer = undefined;
		}
	}

	async openCalendar(mode: CalendarMode): Promise<void> {
		this.calendarEditor = vscode.window.activeTextEditor;
		if (!this.calendarEditor) {
			return Promise.resolve();
		}
		const position = this.calendarEditor.selection.active;
		this.calendarHead = this.parser.getHead(position.line);
		if (!this.calendarHead) {
			return Promise.resolve();
		}
		this.calendarMode = mode;
		await this.calendar.openCalendar();
		return Promise.resolve();
	}

	async setDate(): Promise<void> {
		const date = this.calendar.getDate()
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		if (!this.calendarEditor || !this.calendarHead || this.calendarMode == CalendarMode.none) {
			return Promise.resolve();
		}
		const editor = vscode.window.activeTextEditor;
		if (editor !== this.calendarEditor) {
			return Promise.resolve();
		}
		let line = this.calendarHead.rangeHead.start.line + 1;
		let column = 0;
		let length = 0;
		if (this.calendarHead.scheduleColumn < 0 && this.calendarHead.deadlineColumn < 0) {
			// new line
			await editor.edit((editBuilder) => {
				editBuilder.insert(new vscode.Position(line, 0), '\n');
			});
		} else {
			// remove previous date
			if (this.calendarMode == CalendarMode.schedule && this.calendarHead.scheduleColumn >= 0) {
				column = this.calendarHead.scheduleColumn;
				length = this.calendarHead.schedule.length;
			} else if (this.calendarMode == CalendarMode.deadline && this.calendarHead.deadlineColumn >= 0) {
				column = this.calendarHead.deadlineColumn;
				length = this.calendarHead.deadline.length;
			}
			if (length > 0) {
				await editor.edit((editBuilder) => {
					editBuilder.delete(new vscode.Range(line, column, line, column + length));
				});
			}
			// remove white space
			const dateLine = editor.document.lineAt(line);
			const regex = /(^\s+|\s+$)/g;
			let match;
			let range: vscode.Range | undefined;
			let whiteSpace: vscode.Range[] = [];
			while (match = regex.exec(dateLine.text)) {
				whiteSpace.push(new vscode.Range(line, match.index, line, match.index + match[0].length));
			}
			while (range = whiteSpace.pop()) {
				await editor.edit((editBuilder) => {
					editBuilder.delete(range!);
				});
			}
		}
		// insert new date
		const space = (editor.document.lineAt(line).text.length > 0) ? ' ' : '';
		const text = this.calendarMode + ': <' + date.toISOString().slice(0, 10) + ' ' + date.toLocaleString('en-US', { weekday: 'short' }) + '>' + space;
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(line, 0), text);
		});
		return Promise.resolve();
	}
}

let org: Org | undefined;

export function activate(context: vscode.ExtensionContext): void {
	org = new Org(context);
	console.log('"org-code" is now active!');
}

export function deactivate(): void {
	if (org) {
		org.dispose();
		org = undefined;
	}
	console.log('"org-code" is now inactive!');
}