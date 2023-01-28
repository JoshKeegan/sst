# Contributing

Checkout the repo to `~/.local/share/gnome-shell/extensions` so that code changes are reflected locally without an installation step.

Follow [official docs](https://gjs.guide/extensions/development/creating.html#enabling-the-extension) to access the gnome-shell logs.

To enable/disable the extension, run:
```bash
gnome-extensions enable sst@joshkeegan.co.uk
gnome-extensions disable sst@joshkeegan.co.uk
```

`Alt+F2 > r` after each change (enable/disable will not pick up code changes).

## API
Gnome extensions are built on top of the gnome-shell JS code. Docs don't seem to exist, but you can read [the source code](https://gitlab.gnome.org/GNOME/gnome-shell/).