# Contributing

Dependencies:
 - Make
 - Go

Checkout the repo to `~/.local/share/gnome-shell/extensions/sst@joshkeegan.co.uk` so that code changes are reflected locally without an installation step.

Run `make build-tools` to compile the external tools. These are terminal tools that are used to perform actions that cannot be done in gnome-shell, but are invoked by the javascript extension. This is needed one-off initially, and then only needs to be re-run after changes to tools code.

Run `make settings-schema-compile` to compile the settings schema. This is needed one-off initially, and then only needs to be re-run after schema changes.

`Alt+F2 > r` to restart gnome shell so it picks up the new extension.

To access gnome-shell logs (where any `log` calls in the extension will be logged to) run `make gnome-shell-logs`.

To enable/disable the extension, run:
```bash
make enable
make disable
```

`Alt+F2 > r` after each change to restart gnome shell (enable/disable will not pick up code changes).

Normal dev workflow will be:
 - Start logs monitor
 - Make code change
 - Disable extension
 - Restart gnome shell
 - Enable extension

## API
Gnome extensions are built on top of the gnome-shell JS code. There is the [getting started docs](https://wiki.gnome.org/Projects/GnomeShell/Extensions#Creating_Extensions), [GJS guide](https://gjs.guide/) and [GJS API Docs](https://gjs-docs.gnome.org/). You can also read source code for:
 - [gnome-shell](https://gitlab.gnome.org/GNOME/gnome-shell/) - JS code that extensions monkey-patch to add or modify behaviour.
 - [mutter](https://gitlab.gnome.org/GNOME/mutter) - underlying C code for the mutter window manager (current Gnome default) which gnome-shell sits on-top of.
 - [Tiling-Assistant](https://github.com/Leleat/Tiling-Assistant) - another gnome-shell extension for tiling, with different use-cases. This, and other compatibly licensed extensions are a good source of examples.

# Unit Tests
Gnome extensions aren't natively unit testable. It could still be done but I have decided that right now for this project it is not worth the effort since the whole extension needs manually testing after changes anyway. Should I ever *really* need to unit test something it can be achieved by making the SUT global (not a great pattern to follow for building a test suite), or with bundling, e.g. as has been done in 
[power-alt-tab](https://github.com/emerinohdz/power-alt-tab).