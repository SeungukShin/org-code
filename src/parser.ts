import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';

export class Parser implements vscode.Disposable {
	private config: Config;
	private level: number;
	private state: string[];
	private regex: RegExp;
	first: Head | undefined;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.level = this.config.get('headLevel');
		this.state = (this.config.get('todoState') + ' ' + this.config.get('doneState')).split(' ');
		this.regex = new RegExp('\\n[*]{1,' + this.level.toString() + '}\\s+|[\\s\\S]$', 'g');
		this.first = undefined;
	}

	dispose(): void {
	}

	async parse(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		this.first = undefined;
		const text = editor.document.getText();
		let match;
		const parent: Head[] = [];
		let prevHead: Head | undefined = undefined;
		while (match = this.regex.exec(text)) {
			const level = match[0].trim().startsWith('*') ? match[0].trim().length : 0;
			const pos = editor.document.positionAt(match.index);
			if (level == 0) {
				// end of file
				if (prevHead) {
					const prevLine = prevHead.rangeHead.start.line;
					if (prevLine >= 0 && pos.line > prevLine) {
						const range = new vscode.Range(prevLine + 1, 0, pos.line, 0);
						prevHead.rangeBody = range;
					}
				}
			} else {
				// head
				const line = editor.document.lineAt(pos.line + 1);
				const head = new Head(level, line.range);
				if (!this.first) {
					this.first = head;
				}

				// state
				const lineArray = line.text.split(/\s+/);
				if ((lineArray.length > 2) && this.state.includes(lineArray[1])) {
					head.state = lineArray[1];
					head.stateColumn = line.text.indexOf(head.state);
				}

				// body
				if (prevHead) {
					prevHead.nextHead = head;
					const prevLine = prevHead.rangeHead.start.line;
					if (prevLine >= 0 && pos.line > prevLine) {
						const range = new vscode.Range(prevLine + 1, 0, pos.line, 0);
						prevHead.rangeBody = range;
					}
				}
				head.prevHead = prevHead;

				// parent
				let p = parent.pop();
				if (!p) {
					parent.push(head);
				} else {
					while (p && p.level >= head.level) {
						p = parent.pop();
					}
					if (p) {
						p.children.push(head);
						head.parent = p;
						parent.push(p);
					}
					parent.push(head);
				}

				prevHead = head;
			}
		}
		return Promise.resolve();
	}
}