import * as vscode from 'vscode';
import { Config } from './config';

export class Decoration implements vscode.Disposable {
	private config: Config;
	private decoTimer: NodeJS.Timer | undefined;
	private static level: number;
	private static indentRegex: RegExp;
	private static headType: vscode.TextEditorDecorationType[] = [];
	private static bodyType: vscode.TextEditorDecorationType[] = [];
	private static keywordRegex: RegExp;
	private static todoKeyword: string;
	private static doneKeyword: string;
	private static todoType: vscode.TextEditorDecorationType;
	private static doneType: vscode.TextEditorDecorationType;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();

		// indent
		Decoration.level = this.config.get('headLevel');
		Decoration.indentRegex = new RegExp('\\n[*]{1,' + Decoration.level.toString() + '}\\s+|[\\s\\S]$', 'g');
		let i;
		for (i = 0; i < Decoration.level; i++) {
			const headIndent = '*'.repeat(i);
			Decoration.headType.push(vscode.window.createTextEditorDecorationType({
				'light': {
					'color': 'rgba(255, 255, 255, 0.0)'
				},
				'dark': {
					'color': 'rgba(255, 255, 255, 0.0)'
				},
				'before': {
					'color': 'rgba(255, 255, 255, 0.0)',
					'contentText': headIndent
				}
			}));
			const bodyIndent = '*'.repeat((i + 1) * 2);
			Decoration.bodyType.push(vscode.window.createTextEditorDecorationType({
				'light': {
					'backgroundColor': 'rgba(255, 0, 0, 1.0)'
				},
				'dark': {
					'backgroundColor': 'rgba(255, 0, 0, 1.0)'
				},
				'before': {
					'color': 'rgba(255, 255, 255, 0.0)',
					'contentText': bodyIndent
				}
			}));
		}

		// keyword
		Decoration.todoKeyword = this.config.get('todoKeyword');
		Decoration.doneKeyword = this.config.get('doneKeyword');
		let pattern = Decoration.todoKeyword + ' ' + Decoration.doneKeyword;
		pattern = pattern.replace(/\([\S]\)/g, '').replace(/\s/g, '|');
		Decoration.keywordRegex = new RegExp('\\b(' + pattern + ')\\b', 'g');
		Decoration.todoType = vscode.window.createTextEditorDecorationType({
			'light': {
				'color': 'rgba(255, 0, 0, 1.0)'
			},
			'dark': {
				'color': 'rgba(255, 0, 0, 1.0)'
			}
		});
		Decoration.doneType = vscode.window.createTextEditorDecorationType({
			'light': {
				'color': 'rgba(0, 255, 0, 1.0)'
			},
			'dark': {
				'color': 'rgba(0, 255, 0, 1.0)'
			}
		});
	}

	dispose(): void {
		this.stopDecorations();
	}

	private async updateDecorations(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		const text = editor.document.getText();
		let match;

		// indent
		let i;
		const head: vscode.Range[][] = [];
		const body: vscode.Range[][] = [];
		for (i = 0; i < Decoration.level; i++) {
			head[i] = [];
			body[i] = [];
		}
		let preLevel = -1;
		let preLine = -1;
		while (match = Decoration.indentRegex.exec(text)) {
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
		for (i = 0; i < Decoration.level; i++) {
			editor.setDecorations(Decoration.headType[i], head[i]);
			editor.setDecorations(Decoration.bodyType[i], body[i]);
		}

		// keyword
		const todo: vscode.Range[] = [];
		const done: vscode.Range[] = [];
		while (match = Decoration.keywordRegex.exec(text)) {
			const pos = editor.document.positionAt(match.index);
			if (Decoration.todoKeyword.includes(match[0])) {
				todo.push(new vscode.Range(pos.line, pos.character, pos.line, pos.character + match[0].length));
			} else {
				done.push(new vscode.Range(pos.line, pos.character, pos.line, pos.character + match[0].length));
			}
		}
		editor.setDecorations(Decoration.todoType, todo);
		editor.setDecorations(Decoration.doneType, done);
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