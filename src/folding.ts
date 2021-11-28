import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';
import { Parser } from './parser';

export class Folding implements vscode.FoldingRangeProvider {
	private config: Config;
	private parser: Parser;
	private level: number;

	constructor(context: vscode.ExtensionContext, parser: Parser) {
		this.config = Config.getInstance();
		this.parser = parser;
		this.level = this.config.get('headLevel');
	}

	provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
		const range: vscode.FoldingRange[] = [];
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return range;
		}
		if (editor.document !== document) {
			return range;
		}

		let h: Head | undefined = this.parser.getHead();
		let i;
		let lastLine: number = -1;
		const preLine: number[] = [];
		for (i = 0; i < this.level; i++) {
			preLine[i] = -1;
		}
		while (h) {
			const level = h.level;
			const headLine = h.rangeHead.start.line;
			lastLine = (h.rangeBody) ? h.rangeBody.end.line : h.rangeHead.end.line;
			for (i = level - 1; i < this.level; i++) {
				if (preLine[i] >= 0) {
					range.push(new vscode.FoldingRange(preLine[i], headLine - 1));
					preLine[i] = -1;
				}
			}
			preLine[level - 1] = headLine;
			h = h.nextHead;
		}
		if (lastLine >= 0) {
			for (i = 0; i < this.level; i++) {
				if (preLine[i] >= 0) {
					range.push(new vscode.FoldingRange(preLine[i], lastLine));
					preLine[i] = -1;
				}
			}
		}

		for (const src of this.parser.getSources()) {
			range.push(new vscode.FoldingRange(src.start.line, src.end.line));
		}

		return range;
	}
}