import * as vscode from 'vscode';

export class Head {
	level: number;
	state: string = '';
	stateColumn: number = -1;
	rangeHead: vscode.Range;
	rangeBody: vscode.Range | undefined = undefined;
	parent: Head | undefined = undefined;
	prevHead: Head | undefined = undefined;
	nextHead: Head | undefined = undefined;
	children: Head[] = [];

	constructor(level: number, range: vscode.Range) {
		this.level = level;
		this.rangeHead = range;
	}
}