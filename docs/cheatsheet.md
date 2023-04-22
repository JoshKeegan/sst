# SST Cheat Sheet
## Configuration
Windows tile by default, but [can be configured](config.md) to float by default if you prefer a more traditional non-tiling window manager experience.

Some windows should float (e.g. pop-ups) and we try to detect those. You can add your own custom floating rules [in config.json](config.md).

Keyboard shortcuts [can be configured](config.md), e.g. you could add vim keys to direction arrows. These aren't currently enabled by default due to conflicting with GNOME defaults (`Super`+`L` is lock & `Super`+`H` is minimise/hide).

## Mouse Movement
When dragging a window with a mouse it will auto-tile to the tile your mouse is currently within. 
 - To float the window, hold `Ctrl`.
 - Move the mouse near the border of multiple tiles to combine them.
 - Hold `Super` or `Alt` whilst dragging a window to access sub-tiles.
 - Hold `Super`+`Alt` whilst dragging a window to access 2nd layer sub-tiles.

## Keyboard Shortcuts
Direction keys: `←`/`↓`/`↑`/`→`

### Window movement
| Keys | Action |
| ---- | ------ |
| `Super`+Direction key | Move window to tile |
| `Super`+`Ctrl`/`Alt`+Direction key | Move window to sub-tile |
| `Super`+`Ctrl`+`Alt`+Direction key | Move window to 2nd layer sub-tile. |

When moving a window up, if there is no tile above to move the window to then it will be made fullscreen. Exit fullscreen by moving the window down.

### Misc
| Keys | Action |
| ---- | ------ |
| `Super`+`Q` | Quit/close window |
| `Super`+`T` | Launch terminal |
| `Super`+`Return` | Launch new window of the current app |
| `Super`+`E` | Launch file browser |
| `Super`+`C` | Launch calculator |
| `Ctrl`+`Shift`+`Esc` | Launch resource monitor ([configurable](config.md))

### Useful & Unchanged GNOME Keybinds
| Keys | Action |
| ---- | ------ |
| `Super` | Launcher (does much more, but without a launcher built-in to sst you'll  use this a lot) |
| `Super`+`A` | Applications menu |
| `Super`+`V` | Toggle notifications menu |
| `Alt`+`F2` | Run |
| `Super`+`Shift`+`PgDn` | Move window to next workspace |
| `Super`+`Shift`+`PdUp` | Move window to previous workspace |
| `Ctrl`+`Alt`+`Right`/`Down` | Switch to next workspace (direction depends on config) |
| `Ctrl`+`Alt`+`Left`/`Up` | Switch to previous workspace (direction depends on config) |
| `Ctrl`+`Alt`+`Del` | Shutdown (or logoff) |
