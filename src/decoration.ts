import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';
import { Parser } from './parser';

export class Decoration implements vscode.Disposable {
	private config: Config;
	private parser: Parser;
	private level: number;
	private headType: vscode.TextEditorDecorationType[] = [];
	private bodyType: vscode.TextEditorDecorationType[] = [];
	private doneState: string;
	private todoType: vscode.TextEditorDecorationType;
	private doneType: vscode.TextEditorDecorationType;

	constructor(parser: Parser) {
		this.config = Config.getInstance();
		this.parser = parser;

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
		this.doneState = this.config.get('doneState');
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

	async updateDecorations(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}

		let h: Head | undefined = this.parser.getHead();
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
				if (this.doneState.includes(h.state)) {
					// done
					done.push(new vscode.Range(headLine, h.stateColumn, headLine, h.stateColumn + h.state.length));
				} else {
					// todo
					todo.push(new vscode.Range(headLine, h.stateColumn, headLine, h.stateColumn + h.state.length));
				}
			}

			// count
			if (h.countColumn > 0) {
				const count = h.count.substring(1, h.count.length - 1).split('/');
				if (parseInt(count[0]) >= parseInt(count[1])) {
					// done
					done.push(new vscode.Range(headLine, h.countColumn, headLine, h.countColumn + h.count.length));
				} else {
					// todo
					todo.push(new vscode.Range(headLine, h.countColumn, headLine, h.countColumn + h.count.length));
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