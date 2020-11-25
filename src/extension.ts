import * as vscode from 'vscode';
import * as path from 'path';
import { Execute } from './execute';
import { Config } from './config';
import { Log } from './log';
import { Indent } from './indent';
import { Folding } from './folding';

export class Org implements vscode.Disposable {
	private config: Config;
	private log: Log;
	private indent: Indent;
	private folding: Folding;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.log = Log.getInstance();
		this.indent = new Indent(context);
		this.folding = new Folding(context);

		// Register Folding Range Provider
		if (this.config.get('fold')) {
			context.subscriptions.push(vscode.languages.registerFoldingRangeProvider('org', this.folding));
		}

		// Register Commands
//		context.subscriptions.push(vscode.commands.registerCommand('extension.emacs-code.find.file', () => this.findFile()));

		// open new document
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				if (editor.document.languageId === 'org') {
					if (this.config.get('fold') && this.config.get('foldOnStart')) {
						vscode.commands.executeCommand('editor.foldAll');
					}
					if (this.config.get('indent')) {
						this.indent.startDecorations();
					}
				} else {
					this.indent.stopDecorations();
				}
			}
		}, null, context.subscriptions);

		// modify current document
		vscode.workspace.onDidChangeTextDocument(event => {
			const editor = vscode.window.activeTextEditor;
			if (editor && event.document === editor.document) {
				if (editor.document.languageId === 'org') {
					if (this.config.get('indent')) {
						this.indent.startDecorations();
					}
				} else {
					this.indent.stopDecorations();
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
					this.indent.startDecorations();
				}
			} else {
				this.indent.stopDecorations();
			}
		}
	}

	dispose(): void {
		this.indent.dispose();
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