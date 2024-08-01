# Contributing

## Dependencies
 - git
 - make
 - golang: v1.20
 - node: current LTS
 - yarn

## Build & Install from source
To install, clone the git repo and run:
```bash
make
make install
```
Then restart GNOME shell by pressing `Alt`+`F2` typing `r` and pressing `Enter`.  
Once restarted, you can enable SST by running:
```bash
make enable
```

If at any point you wish to disable SST you can run `make disable`, and to completely uninstall run `make uninstall`.

## Logs
To access gnome-shell logs (where any `log` calls in the extension will be logged to) run `make gnome-shell-logs`.

## Development
### Tools
If working on any of the Go tools, run `make build-tools` after each change.

### Extension
If working on the extension, run `make build-watch` and leave it running whilst you work. This will run esbuild in watch mode, so any changes to the extension will be automatically transpiled to JS.
Watch mode works for everything under `src/`.

Restart GNOME shell with `Alt+F2 > r` after each change to try it out. Note that extensions are not reloaded with enable/disable so code changes cannot be picked up without restarting GNOME shell. You can pick up settings or config changes by running `make disable enable` though.

Normal dev workflow will be:
 - `make gnome-shell-logs`
 - `make build-watch`
 - Make code changes
 - Restart gnome shell

## API
Gnome extensions are built on top of the gnome-shell JS code. There is the [getting started docs](https://wiki.gnome.org/Projects/GnomeShell/Extensions#Creating_Extensions), [GJS guide](https://gjs.guide/) and [GJS API Docs](https://gjs-docs.gnome.org/). 

You can also read source code for some other plugins, e.g:
 - [gnome-shell](https://gitlab.gnome.org/GNOME/gnome-shell/) - JS code that extensions monkey-patch to add or modify behaviour.
 - [mutter](https://gitlab.gnome.org/GNOME/mutter) - underlying C code for the mutter window manager (current Gnome default) which gnome-shell sits on-top of.
 - [Tiling-Assistant](https://github.com/Leleat/Tiling-Assistant) - another gnome-shell extension for tiling, with different use-cases. This, and other compatibly licensed extensions are a good source of examples.

 ## TypeScript
 SST is now written in TypeScript. 
 
 GNOME API types are generated from GI (GObject Introspection). 
 
Gnome-shell specific APIs are written in JS and can be found [in the gnome-shell repo](https://gitlab.gnome.org/GNOME/gnome-shell/-/tree/main/js). These are generally wrappers around lower-level GNOME APIs, but where required, types can be manually added in `src/gnomeShell/**/*.d.ts` to use them from TS.

A [custom esbuild plugin](tools/esbuild/gjs/gjs.go) is used to convert the imports from the generated "@gir/*" packages to ones that gjs understands. 
> Note: this could likely be improved now that gnome-shell 45 switched to ESM. We'd need to get the "@gir/*" packages to be able to be imported directly from "gi://*".

# Unit Tests
Gnome extensions aren't natively unit testable. It could still be done but I have decided that right now for this project it is not worth the effort since the whole extension needs manually testing after changes anyway. Should I ever *really* need to unit test something it can be achieved by making the SUT global (not a great pattern to follow for building a test suite), or with bundling, e.g. as has been done in 
[power-alt-tab](https://github.com/emerinohdz/power-alt-tab).

Now this is being bundled & the src is not in native GJS, tests should be possible. Update this section once added.
