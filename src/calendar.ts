import { parse } from 'path';
import * as vscode from 'vscode';
import { Config } from './config';

export class Calendar implements vscode.TextDocumentContentProvider {
	private config: Config;
	private numberMonth: number;
	private cursorType: vscode.TextEditorDecorationType;
	private uri: vscode.Uri;

	private baseDate: Date;
	private date: Date;
	private calendars: string[][];
	private text: string;

	private editor: vscode.TextEditor | undefined;

	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	onDidChange?: vscode.Event<vscode.Uri> | undefined;

	constructor(context: vscode.ExtensionContext) {
		this.config = Config.getInstance();
		this.numberMonth = this.config.get('number.of.month');
		this.cursorType = vscode.window.createTextEditorDecorationType({
			'light': {
				'backgroundColor': 'rgba(255, 0, 0, 1.0)'
			},
			'dark': {
				'backgroundColor': 'rgba(255, 0, 0, 1.0)'
			}
		});
		this.uri = vscode.Uri.parse('Calendar:Calendar.calendar');
		this.baseDate = new Date();
		this.date = new Date();
		this.calendars = [];
		this.text = '';
		this.onDidChange = this._onDidChange.event;
		vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document.languageId !== 'calendar') {
				return;
			}
			if (e.kind !== vscode.TextEditorSelectionChangeKind.Mouse) {
				return;
			}
			const position = editor.selection.active;
			const line = position.line;
			if (line < 2) {
				return;
			}
			const column = position.character;
			this.date.setFullYear(this.baseDate.getFullYear());
			let monthIndex = Math.trunc(column / (2 * 7 + 6 + 5));
			if (monthIndex < 0) {
				monthIndex = 0;
			} else if (monthIndex >= this.numberMonth) {
				monthIndex = this.numberMonth - 1;
			}
			const prevMonth = Math.trunc(this.numberMonth / 2);
			const month = this.baseDate.getMonth() - prevMonth + monthIndex;
			this.date.setMonth(month);
			let dateIndex = Math.trunc(((column % (2 * 7 + 6 + 5)) - 4) / 3);
			if (dateIndex < 0) {
				dateIndex = 0;
			} else if (dateIndex > 6) {
				dateIndex = 6;
			}
			const date = parseInt(this.calendars[monthIndex][line].trim().split(/\s+/g)[dateIndex]);
			this.date.setDate(date);
			this.showCurrDate();
		});
	}

	dispose() {
		this._onDidChange.dispose();
	}

	private static dayName = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
	private getDay(day: number): string {
		return Calendar.dayName[day % Calendar.dayName.length];
	}

	private getCalendar(date: Date): string[] {
		const year = date.getFullYear();
		const month = date.getMonth();
		const monthName = date.toLocaleString('en-US', { month: 'long' });
		date.setDate(1);
		const day = date.getDay();
		date.setMonth(month + 1);
		date.setDate(0);
		const lastDate = date.getDate();
		const calendar: string[] = [];
		let i: number;
		let text: string;
		let count: number;

		// title
		const monthWidth = 2 * 7 + 6;
		const titleLength = monthName.length + 5;
		const prevSpace = Math.trunc((monthWidth - titleLength) / 2);
		const nextSpace = monthWidth - titleLength - prevSpace;
		calendar.push(' ' + ' '.repeat(prevSpace) + monthName + ' ' + year.toString() + ' '.repeat(nextSpace));

		// day
		text = ''
		for (i = 0; i < 7; i++) {
			text += (' ' + this.getDay(i));
		}
		calendar.push(text);

		// date
		text = '';
		count = 0;
		for (i = 0; i < day; i++) {
			text += '   ';
			count++;
		}
		for (i = 1; i <= lastDate; i++) {
			text += (' ' + i.toString().padStart(2));
			count++;
			if (count % 7 == 0) {
				calendar.push(text);
				text = '';
			}
		}
		while (count % 7 != 0) {
			text += '   ';
			count++;
		}
		if (text.length > 0) {
			calendar.push(text);
		}

		return calendar;
	}

	private getCalendars(date: Date, count: number): string {
		const year = date.getFullYear();
		const month = date.getMonth();
		let i, l: number;
		let maxLine = 0;
		let text = '';

		const prevMonth = Math.trunc(this.numberMonth / 2);
		for (i = 0; i < this.numberMonth; i++) {
			const date = new Date(year, month - prevMonth + i, 1);
			const calendar = this.getCalendar(date);
			if (calendar.length > maxLine) {
				maxLine = calendar.length;
			}
			this.calendars.push(calendar);
		}

		for (l = 0; l < maxLine; l++) {
			for (i = 0; i < this.calendars.length; i++) {
				const currLine = (l >= this.calendars[i].length) ? ' '.repeat(1 + 2 * 7 + 6) : this.calendars[i][l];
				text += (' '.repeat(4) + currLine);
			}
			text += '\n';
		}

		return text;
	}

	private genCalendars(date: Date, count: number) {
		this.baseDate = date;
		this.calendars = [];
		this.text = this.getCalendars(date, count);
	}

	provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string> {
		if (this.text.length == 0) {
			this.genCalendars(new Date(), this.numberMonth);
		}
		return this.text;
	}

	private findMonth(date: Date): number {
		const year = date.getFullYear();
		let i;
		for (i = 0; i < this.calendars.length; i++) {
			if (this.calendars[i][0].includes(date.toLocaleString('en-US', { month: 'long' }) + ' ' + year.toString())) {
				return i;
			}
		}
		return -1;
	}

	private findWeek(date: Date, monthIndex: number): number {
		let i;
		for (i = 2; i < this.calendars[monthIndex].length; i++) {
			if (this.calendars[monthIndex][i].split(' ').includes(date.getDate().toString())) {
				return i;
			}
		}
		return -1;
	}

	private getPosition(date: Date | undefined = undefined): vscode.Position {
		if (date) {
			this.date = date;
		} else {
			date = this.date;
		}
		let monthIndex = this.findMonth(date);
		let weekIndex = this.findWeek(date, monthIndex);
		let dayIndex = date.getDay();
		return new vscode.Position(weekIndex, (5 + (2 * 7) + 6) * monthIndex + 5 + (3 * dayIndex));
	}

	private showCurrDate() {
		if (this.editor) {
			const position = this.getPosition(this.date);
			this.editor.selection = new vscode.Selection(position, position);
			const range = new vscode.Range(position.line, position.character, position.line, position.character + 2);
			this.editor.setDecorations(this.cursorType, [range]);
		}
	}

	async openCalendar() {
		const doc = await vscode.workspace.openTextDocument(this.uri);
		await vscode.commands.executeCommand('workbench.action.splitEditorDown');
		await vscode.window.showTextDocument(doc);
		await vscode.commands.executeCommand('workbench.action.previousEditor');
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		await vscode.commands.executeCommand('vscode.setEditorLayout', { orientation: 1, groups: [{ size: 0.8 }, { size: 0.2 }] });
		this.editor = vscode.window.activeTextEditor;
		this.showCurrDate();
	}

	async goDate(date: number) {
		this.date = new Date(this.date.getTime() + date * 24 * 60 * 60 * 1000);
		if (this.findMonth(this.date) < 0) {
			const year = this.baseDate.getFullYear();
			const month = (date > 0) ? this.baseDate.getMonth() + 1 : this.baseDate.getMonth() - 1;
			this.genCalendars(new Date(year, month, 1), this.numberMonth);
			this._onDidChange.fire(this.uri);
			await new Promise(resolve => setTimeout(resolve, 10));
		}
		this.showCurrDate();
	}

	getDate(): Date {
		return this.date;
	}
}