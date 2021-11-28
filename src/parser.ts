import * as vscode from 'vscode';
import { Config } from './config';
import { Head } from './head';

export class Parser implements vscode.Disposable {
	private config: Config;
	private level: number;
	private state: string[];
	private headRegex: RegExp;
	private countRegex: RegExp;
	private linkRegex: RegExp;
	private srcRegex: RegExp;
	private first: Head | undefined;
	private links: vscode.Range[];
	private sources: vscode.Range[];

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.level = this.config.get('headLevel');
		this.state = (this.config.get('todoState') + ' ' + this.config.get('doneState')).split(' ');
		this.headRegex = new RegExp('\\n[*]{1,' + this.level.toString() + '}\\s+|[\\s\\S]$', 'g');
		this.countRegex = new RegExp('\\[\\d*\\/\\d*\\]', 'g');
		this.linkRegex = new RegExp('\\[\\[[^\\n]+\\]\\]', 'g');
		this.srcRegex = new RegExp('#\\+(begin|end)_src', 'gi');
		this.first = undefined;
		this.links = [];
		this.sources = [];
	}

	dispose(): void {
	}

	async parse(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return Promise.resolve();
		}
		this.first = undefined;
		this.links = [];
		this.sources = [];
		const text = editor.document.getText();
		let match;
		const parent: Head[] = [];
		let prevHead: Head | undefined = undefined;
		while (match = this.headRegex.exec(text)) {
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

				// count
				const countMatch = this.countRegex.exec(line.text);
				if (countMatch) {
					head.count = countMatch[0];
					head.countColumn = countMatch.index;
				}

				// schedule and deadline
				if (editor.document.lineCount > pos.line + 2) {
					const nextLine = editor.document.lineAt(pos.line + 2);
					head.scheduleColumn = nextLine.text.indexOf('SCHEDULED:');
					if (head.scheduleColumn >= 0) {
						const end = nextLine.text.indexOf('>', head.scheduleColumn);
						head.schedule = nextLine.text.slice(head.scheduleColumn, end + 1);
					}
					head.deadlineColumn = nextLine.text.indexOf('DEADLINE:');
					if (head.deadlineColumn >= 0) {
						const end = nextLine.text.indexOf('>', head.deadlineColumn);
						head.deadline = nextLine.text.slice(head.deadlineColumn, end + 1);
					}
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
		while (match = this.linkRegex.exec(text)) {
			const start = editor.document.positionAt(match.index);
			const end = editor.document.positionAt(match.index + match[0].length);
			this.links.push(new vscode.Range(start, end));
		}
		let beginSrc: vscode.Position | undefined = undefined;
		while (match = this.srcRegex.exec(text)) {
			const start = editor.document.positionAt(match.index);
			const end = editor.document.positionAt(match.index + match[0].length);
			if (match[0].toLowerCase() === '#+begin_src') {
				beginSrc = editor.document.positionAt(match.index);
			} else if (beginSrc) {
				this.sources.push(new vscode.Range(beginSrc, editor.document.positionAt(match.index)));
				beginSrc = undefined;
			}
		}
		return Promise.resolve();
	}

	getHead(line: number | undefined = undefined): Head | undefined {
		if (!line) {
			return this.first;
		}
		let h = this.first;
		while (h) {
			const headLine = h.rangeHead.start.line;
			const bodyLine = (h.rangeBody) ? h.rangeBody.end.line : h.rangeHead.start.line;
			if (line >= headLine && line <= bodyLine) {
				break;
			}
			h = h.nextHead;
		}
		return h;
	}

	getLinks(): vscode.Range[] {
		return this.links;
	}

	getSources(): vscode.Range[] {
		return this.sources;
	}
}