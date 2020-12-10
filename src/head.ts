import * as vscode from 'vscode';
import { Config } from './config';

export class Head {
	private static config: Config = Config.getInstance();
	private static doneState: string = Head.config.get('doneState');
	level: number;
	state: string = '';
	stateColumn: number = -1;
	count: string = '';
	countColumn: number = -1;
	rangeHead: vscode.Range;
	rangeBody: vscode.Range | undefined = undefined;
	schedule: string = '';
	scheduleColumn: number = -1;
	deadline: string = '';
	deadlineColumn: number = -1;
	parent: Head | undefined = undefined;
	prevHead: Head | undefined = undefined;
	nextHead: Head | undefined = undefined;
	children: Head[] = [];

	constructor(level: number, range: vscode.Range) {
		this.level = level;
		this.rangeHead = range;
	}

	getCount(): [number, number] {
		let done = 0;
		let total = 0;
		this.children.forEach((c) => {
			if (c.state.length == 0) {
				return;
			}
			if (Head.doneState.includes(c.state)) {
				done++;
			}
			total++;
		});
		return [done, total];
	}
}