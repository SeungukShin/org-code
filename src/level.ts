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

	async changeHead(head: Head, level: number): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}

		// get previous level
		const headLine = head.rangeHead.start.line;
		const prevLevel = head.level;

		// set current level
		if (prevLevel == 1 && level < 0) {
			return Promise.resolve();
		}
		if (level > 0) {
			await editor.edit((editBuilder) => {
				editBuilder.insert(new vscode.Position(headLine, 0), '*');
			});
			head.level++;
		} else {
			await editor.edit((editBuilder) => {
				editBuilder.delete(new vscode.Range(headLine, 0, headLine, 1));
			});
			head.level--;
		}
		return Promise.resolve();
	}

	async changeHeadLevel(level: number): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		const currLine = editor.selection.active.line;

		let h = this.parser.getHead(currLine);
		if (!h) {
			return Promise.resolve();
		}

		await this.changeHead(h, level);

		return Promise.resolve();
	}

	async changeTree(head: Head, level: number): Promise<void> {
		await this.changeHead(head, level);
		let i;
		for (i = 0; i < head.children.length; i++) {
			await this.changeTree(head.children[i], level);
		}

		return Promise.resolve();
	}

	async changeTreeLevel(level: number): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		const currLine = editor.selection.active.line;

		let h = this.parser.getHead(currLine);
		if (!h) {
			return Promise.resolve();
		}

		await this.changeTree(h, level);

		return Promise.resolve();
	}
}