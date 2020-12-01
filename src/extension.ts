import * as vscode from 'vscode';
import * as path from 'path';
import { Execute } from './execute';
import { Config } from './config';
import { Log } from './log';
import { Parser } from './parser';
import { Decoration } from './decoration';
import { Folding } from './folding';
import { State } from './state';

export class Org implements vscode.Disposable {
	private config: Config;
	private log: Log;
	private updateTimer: NodeJS.Timer | undefined;
	private parser: Parser;
	private decoration: Decoration;
	private folding: Folding;
	private state: State;
	private level: number;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.log = Log.getInstance();
		this.parser = new Parser(context);
		this.decoration = new Decoration(this.parser);
		this.folding = new Folding(context);
		this.state = new State(this.parser);
		this.level = this.config.get('headLevel');

		// Register Folding Range Provider
		if (this.config.get('fold')) {
			context.subscriptions.push(vscode.languages.registerFoldingRangeProvider('org', this.folding));
		}

		// Register Commands
		context.subscriptions.push(vscode.commands.registerCommand('org-code.set.state', () => this.state.setState()));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.rotate.next.state', () => this.state.rotateState(1)));
		context.subscriptions.push(vscode.commands.registerCommand('org-code.rotate.prev.state', () => this.state.rotateState(-1)));

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