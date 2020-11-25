import * as vscode from 'vscode';
import { Config } from './config';

export class Indent implements vscode.Disposable {
	private config: Config;
	private decoTimer: NodeJS.Timer | undefined;
	private static level: number;
	private static headType: vscode.TextEditorDecorationType[] = [];
	private static bodyType: vscode.TextEditorDecorationType[] = [];

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		Indent.level = this.config.get('headLevel');

		// Decoration Type
		let i;
		for (i = 0; i < Indent.level; i++) {
			const headIndent = '*'.repeat(i);
			Indent.headType.push(vscode.window.createTextEditorDecorationType({
				'light': {
					'color': 'rgba(255, 255, 255, 0.0)'
				},
				'dark': {
					'color': 'rgba(255, 255, 255, 0.0)'
				},
				'before': {
					'color': 'rgba(255, 255, 255, 0.0)',
					'contentText': headIndent
				},
			}));
			const bodyIndent = '*'.repeat((i + 1) * 2);
			Indent.bodyType.push(vscode.window.createTextEditorDecorationType({
				'light': {
					'backgroundColor': 'rgba(255, 0, 0, 1.0)'
				},
				'dark': {
					'backgroundColor': 'rgba(255, 0, 0, 1.0)'
				},
				'before': {
					'color': 'rgba(255, 255, 255, 0.0)',
					'contentText': bodyIndent
				},
			}));
		}
	}

	dispose(): void {
		this.stopDecorations();
	}

	private async updateDecorations(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const text = editor.document.getText();

		let i;
		const head: vscode.Range[][] = [];
		const body: vscode.Range[][] = [];
		for (i = 0; i < Indent.level; i++) {
			head[i] = [];
			body[i] = [];
		}
		let preLevel = -1;
		let preLine = -1;
		const pattern = '\\n[*]{1,' + Indent.level.toString() + '}\\s+|[\\s\\S]$';
		const regex = new RegExp(pattern, 'g');
		let match;
		while (match = regex.exec(text)) {
			const level = match[0].trim().startsWith('*') ? match[0].trim().length : 0;
			const pos = editor.document.positionAt(match.index);
			if (level == 0) {
				// end of file
				if (preLevel >= 0 && preLine >= 0 && pos.line > preLine) {
					for (i = preLine + 1; i <= pos.line; i++) {
						body[preLevel - 1].push(new vscode.Range(i, 0, i, 0));
					}
				}
			} else {
				// head
				head[level - 1].push(new vscode.Range(pos.line + 1, 0, pos.line + 1, level - 1));
				// body
				if (preLevel >= 0 && preLine >= 0 && pos.line > preLine) {
					for (i = preLine + 1; i <= pos.line; i++) {
						body[preLevel - 1].push(new vscode.Range(i, 0, i, 0));
					}
				}
				preLevel = level;
				preLine = pos.line + 1;
			}
		}
		for (i = 0; i < Indent.level; i++) {
			editor.setDecorations(Indent.headType[i], head[i]);
			editor.setDecorations(Indent.bodyType[i], body[i]);
		}
	}

	startDecorations(): void {
		const delay: number = this.config.get('updateDelay');
		if (this.decoTimer) {
			clearTimeout(this.decoTimer);
			this.decoTimer = undefined;
		}
		this.decoTimer = setTimeout(this.updateDecorations, delay);
	}

	stopDecorations(): void {
		if (this.decoTimer) {
			clearTimeout(this.decoTimer);
			this.decoTimer = undefined;
		}
	}
}