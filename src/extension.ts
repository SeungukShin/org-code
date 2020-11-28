import * as vscode from 'vscode';
import * as path from 'path';
import { Execute } from './execute';
import { Config } from './config';
import { Log } from './log';
import { Decoration } from './decoration';
import { Folding } from './folding';

export class Org implements vscode.Disposable {
	private config: Config;
	private log: Log;
	private decoration: Decoration;
	private folding: Folding;
	private level: number;
	private todoState: string;
	private doneState: string;
	private state: string;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.log = Log.getInstance();
		this.decoration = new Decoration(context);
		this.folding = new Folding(context);
		this.level = this.config.get('headLevel');
		this.todoState = this.config.get('todoState');
		this.doneState = this.config.get('doneState');
		this.state = this.todoState + ' ' + this.doneState;

		// Register Folding Range Provider
		if (this.config.get('fold')) {
			context.subscriptions.push(vscode.languages.registerFoldingRangeProvider('org', this.folding));
		}

		// Register Commands
		context.subscriptions.push(vscode.commands.registerCommand('org-code.set.state', () => this.setState()));

		// open new document
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				if (editor.document.languageId === 'org') {
					if (this.config.get('fold') && this.config.get('foldOnStart')) {
						vscode.commands.executeCommand('editor.foldAll');
					}
					if (this.config.get('indent')) {
						this.decoration.startDecorations();
					}
				} else {
					this.decoration.stopDecorations();
				}
			}
		}, null, context.subscriptions);

		// modify current document
		vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				if (editor.document.languageId === 'org') {
					if (this.config.get('indent')) {
						this.decoration.startDecorations();
					}
				} else {
					this.decoration.stopDecorations();
				}
			}
		}, null, context.subscriptions);

		// current document
		if (vscode.window.activeTextEditor) {
			const editor = vscode.window.activeTextEditor;
			if (editor.document.languageId === 'org') {
				if (this.config.get('fold') && this.config.get('foldOnStart')) {
					vscode.commands.executeCommand('editor.foldAll');
				}
				if (this.config.get('indent')) {
					this.decoration.startDecorations();
				}
			} else {
				this.decoration.stopDecorations();
			}
		}
	}

	dispose(): void {
		this.decoration.dispose();
	}

	async setState(): Promise<void> {
		// get current line
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		const position = editor.selection.active;
		const line = editor.document.lineAt(position.line);

		// check head
		const headRegex = new RegExp('^[*]{1,' + this.level.toString() + '}\\s+', 'g');
		const headMatch = headRegex.exec(line.text);
		if (!headMatch) {
			return Promise.resolve();
		}

		// select new state
		const state = await vscode.window.showQuickPick(this.state.split(' '));
		if (!state) {
			return Promise.resolve();
		}

		// remove old state
		const stateRegex = new RegExp('^[*]{1,' + this.level.toString() + '}\\s+(' + this.state.replace(/\s/g, '|') + ')', 'g');
		const stateMatch = stateRegex.exec(line.text);
		if (stateMatch) {
			console.log(stateMatch[0]);
			await editor.edit((editBuilder) => {
				const l = line.lineNumber;
				const c = stateMatch[0].length;
				const len = stateMatch[0].split(/\s+/)[1].length;
				editBuilder.delete(new vscode.Range(l, c - len - 1, l, c));
			})
		}

		// add new state
		await editor.edit((editBuilder) => {
			const l = line.lineNumber;
			const c = headMatch[0].trim().length;
			editBuilder.insert(new vscode.Position(l, c), ' ' + state);
		})
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