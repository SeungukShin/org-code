import * as vscode from 'vscode';
import { Config } from './config';

export class Folding implements vscode.FoldingRangeProvider {
	private config: Config;
	private level: number;

	constructor() {
		this.config = Config.getInstance();
		this.level = this.config.get('headLevel');
	}

	provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.FoldingRange[]> {
		const range: vscode.FoldingRange[] = [];
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return range;
		}
		const text = editor.document.getText();

		let i;
		const preLine: number[] = [];
		for (i = 0; i < this.level; i++) {
			preLine[i] = -1;
		}
		const pattern = '\\n[*]{1,' + this.level.toString() + '}\\s+|[\\s\\S]$';
		const regex = new RegExp(pattern, 'g');
		let match;
		while (match = regex.exec(text)) {
			const level = match[0].trim().startsWith('*') ? match[0].trim().length : 0;
			const pos = editor.document.positionAt(match.index);
			if (level == 0) {
				// end of file
				let lastLine = -1;
				for (i = 0; i < this.level; i++) {
					if (preLine[i] > lastLine) {
						lastLine = preLine[i];
					}
					if (lastLine >= 0) {
						range.push(new vscode.FoldingRange(lastLine, pos.line));
					}
				}
			} else {
				for (i = level - 1; i < this.level; i++) {
					if (preLine[i] >= 0) {
						range.push(new vscode.FoldingRange(preLine[i], pos.line));
					}
					preLine[i] = -1;
				}
				preLine[level - 1] = pos.line + 1;
			}
		}

		return range;
	}
}