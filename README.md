# Org Extension for VS Code
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/SeungukShin/org-code/CI)
[![](https://img.shields.io/visual-studio-marketplace/v/SeungukShin.org-code)](https://marketplace.visualstudio.com/items?itemName=SeungukShin.org-code)
![install](https://img.shields.io/visual-studio-marketplace/i/SeungukShin.org-code)

Integrates [Org](https://orgmode.org) into VS Code.

![demo](https://raw.githubusercontent.com/SeungukShin/org-code/master/demo.gif)

## Keybindings
| Key               | Description                    | Command                   |
|-------------------|--------------------------------|---------------------------|
| `alt+left`        | Promote a head                 | `org-code.promote.head`   |
| `alt+right`       | Demote a head                  | `org-code.dmote.head`     |
| `alt+shift+left`  | Promote a tree of head         | `org-code.promote.tree`   |
| `alt+shift+right` | Demote a tree of head          | `org-code.demote.tree`    |
| `ctrl+c ctrl+t`   | Set a state on a head          | `org-code.set.state`      |
| `shift+left`      | Set a previous state on a head | `org-code.set.prev.state` |
| `shift+right`     | Set a next state on a head     | `org-code.set.next.state` |

## Configurations
| Name         | Description                                    | Default   |
|--------------|------------------------------------------------|-----------|
| Todo State   | String for todo state separated by white space | TODO WAIT |
| Done State   | String for done state separated by white space | DONE DROP |
| Head Level   | Maximum head level                             | 6         |
| Update Delay | Update UI delay for indent and fold in ms      | 10        |
| Indent       | Indent heads                                   | true      |
| Fold         | Fold by heads                                  | true      |