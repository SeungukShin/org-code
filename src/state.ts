import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';

export class State implements vscode.Disposable {
	private config: Config;
	private state: string[];

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.state = (this.config.get('todoState') + ' ' + this.config.get('doneState')).split(' ');
	}

	dispose(): void {
	}

	async setState(first: Head | undefined): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		const currLine = editor.selection.active.line;

		// find head
		let h: Head | undefined = first;
		while (h) {
			const headLine = h.rangeHead.start.line;
			const bodyLine = (h.rangeBody) ? h.rangeBody.end.line : h.rangeHead.start.line;
			if (currLine >= headLine && currLine <= bodyLine) {
				break;
			}
			h = h.nextHead;
		}
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
		if (h.stateColumn !== -1) {
			await editor.edit((editBuilder) => {
				editBuilder.delete(new vscode.Range(headLine, stateColumn, headLine, stateColumn + prevState.length));
			});
		}

		// add new state
		const newState = (h.stateColumn == -1) ? ' ' + state : state;
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(headLine, stateColumn), newState);
		});
	}
}