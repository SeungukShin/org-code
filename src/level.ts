import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';
import { Parser } from './parser';

export class Level implements vscode.Disposable {
	private config: Config;
	private parser: Parser;

	constructor(parser: Parser) {
		this.config = Config.getInstance();
		this.parser = parser;
	}

	dispose(): void {
	}

	async changeHeadLevel(level: number): Promise<void> {
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

		// get previous level
		const headLine = h.rangeHead.start.line;
		const prevLevel = h.level;

		// set current level
		if (prevLevel == 1 && level < 0) {
			return Promise.resolve();
		}
		if (level > 0) {
			await editor.edit((editBuilder) => {
				editBuilder.insert(new vscode.Position(headLine, 0), '*');
			});
			h.level++;
		} else {
			await editor.edit((editBuilder) => {
				editBuilder.delete(new vscode.Range(headLine, 0, headLine, 1));
			});
			h.level--;
		}
		return Promise.resolve();
	}
}