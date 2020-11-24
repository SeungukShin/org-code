import * as vscode from 'vscode';
import * as path from 'path';

class FindFileItem implements vscode.QuickPickItem {
	type: vscode.FileType;
	file: string;
	label: string;

	constructor(type: vscode.FileType, file: string) {
		this.type = type;
		this.file = file;

		if (type & vscode.FileType.Directory) {
			if (type & vscode.FileType.SymbolicLink) {
				this.label = '$(file-symlink-directory) ' + file;
			} else {
				this.label = '$(file-directory) ' + file;
			}
		} else {
			if (type & vscode.FileType.SymbolicLink) {
				this.label = '$(file-symlink-file) ' + file;
			} else {
				this.label = '$(file-code) ' + file;
			}
		}
	}
}

export class FindFile implements vscode.Disposable {
	private currentDirectory: string;
	private items: FindFileItem[];
	private quickPick: vscode.QuickPick<FindFileItem>;

	constructor(directory: string) {
		this.currentDirectory = directory;
		this.items = [];
		this.quickPick = vscode.window.createQuickPick<FindFileItem>();
	}

	dispose() {
		this.quickPick.dispose();
	}

	async prepare(): Promise<void> {
		this.items = [];

		vscode.workspace.fs.readDirectory(vscode.Uri.file(this.currentDirectory)).then((value) => {
			value.sort((a, b) => {
				if ((a[1] & vscode.FileType.Directory) && !(b[1] & vscode.FileType.Directory)) {
					return -1;
				} else if (!(a[1] & vscode.FileType.Directory) && (b[1] & vscode.FileType.Directory)) {
					return 1;
				} else {
					if (a[0] < b[0]) {
						return -1;
					} else {
						return 1;
					}
				}
			});

			this.items.push(new FindFileItem(vscode.FileType.Directory, '.'));
			this.items.push(new FindFileItem(vscode.FileType.Directory, '..'));
			value.map((entry) => {
				this.items.push(new FindFileItem(entry[1], entry[0]));
			});

			this.quickPick.title = this.currentDirectory;
			this.quickPick.items = this.items;

			Promise.resolve();
		});
	}

	show(): Promise<string | undefined> {
		return new Promise<string | undefined>((resolve, reject) => {

			this.quickPick.onDidAccept(() => {
				const item = this.quickPick.selectedItems[0];
				if (item) {
					if ((item.type & vscode.FileType.Directory) && (item.file != '.')) {
						this.quickPick.value = '';
						this.currentDirectory = path.join(this.currentDirectory, item.file);
						this.prepare();
					} else {
						const file = path.join(this.currentDirectory, item.file);
						resolve(file);
					}
				} else {
					if (this.quickPick.value == '~') {
						this.quickPick.value = '';
						if (process.env.home) {
							this.currentDirectory = process.env.home;
						} else {
							this.currentDirectory = vscode.env.appRoot;
						}
						this.prepare();
					} else {
						const file = path.join(this.currentDirectory, this.quickPick.value);
						resolve(file);
					}
				}
			});

			this.quickPick.onDidHide(() => {
				resolve(undefined);
			});

			this.quickPick.onDidChangeValue((e) => {
				if (e[e.length - 1] !== '/' && e[e.length - 1] !== '\\') {
					return;
				}

				if (e == '/' || e == '\\') {
					this.quickPick.value = '';
					this.currentDirectory = path.parse(vscode.env.appRoot).root;
					this.prepare();
				} else if (e == '~/' || e == '~\\') {
					this.quickPick.value = '';
					if (process.env.home) {
						this.currentDirectory = process.env.home;
					} else {
						this.currentDirectory = vscode.env.appRoot;
					}
					this.prepare();
				} else {
					const file = e.slice(0, e.length - 1);
					const found = this.items.find((entry) => {
						if ((entry.type & vscode.FileType.Directory) && (entry.file == file)) {
							return true;
						}
						return false;
					});
					if (found) {
						this.quickPick.value = '';
						this.currentDirectory = path.join(this.currentDirectory, file);
						this.prepare();
					}
				}
			});

			this.quickPick.show();
		});
	}

	hide(): void {
		this.quickPick.hide();
	}
}