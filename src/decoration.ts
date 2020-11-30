import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';

export class Decoration implements vscode.Disposable {
	private config: Config;
	private level: number;
	private headType: vscode.TextEditorDecorationType[] = [];
	private bodyType: vscode.TextEditorDecorationType[] = [];
	private todoState: string;
	private todoType: vscode.TextEditorDecorationType;
	private doneType: vscode.TextEditorDecorationType;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();

		// indent
		this.level = this.config.get('headLevel');
		let i;
		for (i = 0; i < this.level; i++) {
			const headIndent = '*'.repeat(i);
			this.headType.push(vscode.window.createTextEditorDecorationType({
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
			this.bodyType.push(vscode.window.createTextEditorDecorationType({
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

		// state
		this.todoState = this.config.get('todoState');
		this.todoType = vscode.window.createTextEditorDecorationType({
			'light': {
				'color': 'rgba(255, 0, 0, 1.0)'
			},
			'dark': {
				'color': 'rgba(255, 0, 0, 1.0)'
			}
		});
		this.doneType = vscode.window.createTextEditorDecorationType({
			'light': {
				'color': 'rgba(0, 255, 0, 1.0)'
			},
			'dark': {
				'color': 'rgba(0, 255, 0, 1.0)'
			}
		});
	}

	dispose(): void {
	}

	async updateDecorations(first: Head): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}

		let h: Head | undefined = first;
		let i;
		const head: vscode.Range[][] = [];
		const body: vscode.Range[][] = [];
		for (i = 0; i < this.level; i++) {
			head[i] = [];
			body[i] = [];
		}
		const todo: vscode.Range[] = [];
		const done: vscode.Range[] = [];
		while (h) {
			const level = h.level;
			const headLine = h.rangeHead.start.line;

			// head
			head[level - 1].push(new vscode.Range(headLine, 0, headLine, level - 1));

			// body
			if (h.rangeBody) {
				const stLine = h.rangeBody.start.line;
				const edLine = h.rangeBody.end.line;
				for (i = stLine; i <= edLine; i++) {
					body[level - 1].push(new vscode.Range(i, 0, i, 0));
				}
			}

			// state
			if (h.stateColumn > 0) {
				if (this.todoState.includes(h.state)) {
					// todo
					todo.push(new vscode.Range(headLine, h.stateColumn, headLine, h.stateColumn + h.state.length));
				} else {
					// done
					done.push(new vscode.Range(headLine, h.stateColumn, headLine, h.stateColumn + h.state.length));
				}
			}

			h = h.nextHead;
		}
		for (i = 0; i < this.level; i++) {
			editor.setDecorations(this.headType[i], head[i]);
			editor.setDecorations(this.bodyType[i], body[i]);
		}
		editor.setDecorations(this.todoType, todo);
		editor.setDecorations(this.doneType, done);
	}
}