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
Gnome extensions are built on top of the gnome-shell JS code. Docs don't seem to exist, but you can read source code:
 - [gnome-shell](https://gitlab.gnome.org/GNOME/gnome-shell/) - JS code that extensions monkey-patch to add or modify behaviour.
 - [mutter](https://gitlab.gnome.org/GNOME/mutter) - underlying C code for the mutter window manager (current Gnome default) which gnome-shell sits on-top of.
 - [Tiling-Assistant](https://github.com/Leleat/Tiling-Assistant) - another gnome-shell extension for tiling, with different use-cases. This, and other compatibly licensed extensions are a good source of examples instead of docs.

# Unit Tests
Gnome extensions aren't natively unit testable. It could still be done but I have decided that right now for this project it is not worth the effort since the whole extension needs manually testing after changes anyway. Should I ever *really* need to unit test something it can be achieved by making the SUT global (not a great pattern to follow for building a test suite), or with bundling, e.g. as has been done in 
[power-alt-tab](https://github.com/emerinohdz/power-alt-tab).