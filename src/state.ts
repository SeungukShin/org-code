import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';
import { Parser } from './parser';

export class State implements vscode.Disposable {
	private config: Config;
	private parser: Parser;
	private state: string[];
	private doneState: string;

	constructor(parser: Parser) {
		this.config = Config.getInstance();
		this.parser = parser;
		this.state = (this.config.get('todoState') + ' ' + this.config.get('doneState')).split(' ');
		this.doneState = this.config.get('doneState');
	}

	dispose(): void {
	}

	async calChildren(parent: Head): Promise<void> {
		if (parent.countColumn < 0) {
			return Promise.resolve();
		}
		if (parent.children.length == 0) {
			return Promise.resolve();
		}
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}

		// calculate children state
		const [done, total] = parent.getCount();

		// remove previous count
		const headLine = parent.rangeHead.start.line;
		const stColumn = parent.countColumn;
		const edColumn = parent.countColumn + parent.count.length;
		await editor.edit((editBuilder) => {
			editBuilder.delete(new vscode.Range(headLine, stColumn, headLine, edColumn));
		});

		// add new count
		const count = '[' + done.toString() + '/' + total.toString() + ']';
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(headLine, stColumn), count);
		});
	}

	async setState(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		const currLine = editor.selection.active.line;

		// find head
		let h = this.parser.getHead(currLine);
		if (!h) {
			return Promise.resolve();
		}

		// select new state
		const state = await vscode.window.showQuickPick(this.state);
		if (!state) {
			return Promise.resolve();
		}

		// get previous state
		const headLine = h.rangeHead.start.line;
		const prevState = h.state;
		const stateColumn = (h.stateColumn == -1) ? h.level : h.stateColumn;

		// remove previous state
		if (h.stateColumn > 0) {
			await editor.edit((editBuilder) => {
				editBuilder.delete(new vscode.Range(headLine, stateColumn, headLine, stateColumn + prevState.length));
			});
		}

		// add new state
		const newState = (h.stateColumn == -1) ? ' ' + state : state;
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(headLine, stateColumn), newState);
		});
		h.state = state;

		// calculate parent
		if (h.parent) {
			this.calChildren(h.parent);
		}
	}
}