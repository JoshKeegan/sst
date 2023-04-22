# SST: Super Simple Tiling
A GNOME Shell extension that turns it into a tiling window manager.

## Warning
This is unfinished and unpolished software, missing many features and probably full of bugs. Unless you're a developer & willing to get your hands dirty, I'd turn back now...

## Installation
There is no release you can install, and it's a long way from being releasable sofwtare. You can install from source though, instructions are in the [contributing guide](CONTRIBUTING.md).

After installation, there's no instructions but reading [the cheat sheet](docs/cheatsheet.md) should get you started. See [configuration docs](docs/config.md) to make keybinds etc... your own.

You may also want to customise some GNOME defaults via `gnome-tweaks` or `gsettings`, e.g. disabling the window maximise button and altering window titlebar behaviour. This is completely optional though, sst will change anything required when enabled (and restore previous settings when disabled).

## Usage with other extensions
A huge win of building sst as a GNOME Shell extension is that you still get all of the functionality of GNOME, including extensions. That means you can combine sst with other extensions to customise GNOME to work exactly as you want.

Whilst I can't guarantee compatibility between individual extensions, you should *generally* be ok if it isn't also trying to move windows or other overlapping functionality.

Some extensions to try alongside sst:
 - [native-window-placement](https://extensions.gnome.org/extension/18/native-window-placement/) (official GNOME extension): keeps windows roughly where they are tiled to when opening the overview
 - [window-list](https://extensions.gnome.org/extension/602/window-list/) (official GNOME extension): classic GNOME bottom bar. Hopefully won't be necessary once sst gets a stacking mode.
 - [workspace-indicator](https://extensions.gnome.org/extension/21/workspace-indicator/) (official GNOME extension): shows workspaces in the top bar. Don't need if using window-list as that has the same view in the bottom bar.

## License
[GNU GPL v3](LICENSE)
