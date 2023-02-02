"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Tiles = Me.imports.tiles;
const MoveHandler = Me.imports.moveHandler.Handler;
const KeybindHandler = Me.imports.keybindHandler.Handler;
    
function enable() {
    log("enable sst");

    this.settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.sst");

    // disable native tiling
    this._gnomeMutterSettings = ExtensionUtils.getSettings("org.gnome.mutter");
    this._gnomeMutterSettings.set_boolean("edge-tiling", false);
    this._gnomeShellSettings = ExtensionUtils.getSettings("org.gnome.shell.overrides");
    this._gnomeShellSettings.set_boolean("edge-tiling", false);

    // disable native tiling keybindings as edge-tiling being off doesn't disable
    //  it via keybinds for some reason.
    this._gnomeMutterKeybindSettings = ExtensionUtils.getSettings("org.gnome.mutter.keybindings");
    this._gnomeMutterKeybindSettings.set_strv("toggle-tiled-left", []);
    this._gnomeMutterKeybindSettings.set_strv("toggle-tiled-right", []);

    this.tiles = new Tiles.Tiles();
    this.windowMoveHandler = new MoveHandler();
    this.keybindHandler = new KeybindHandler();
}

function disable() {
    log("disable sst");

    this.keybindHandler.destroy();
    this.keybindHandler = null;
    this.windowMoveHandler.destroy();
    this.windowMoveHandler = null;
    this.tiles.destroy();
    this.tiles = null;

    // re-enable native tiling
    this._gnomeMutterSettings.reset("edge-tiling");
    this._gnomeShellSettings.reset("edge-tiling");

    // re-enable native tiling keybinds
    this._gnomeMutterKeybindSettings.reset("toggle-tiled-left");
    this._gnomeMutterKeybindSettings.reset("toggle-tiled-right");
}

function init() {
    log("Init sst");
}
