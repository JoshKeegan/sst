"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const GnomeSettingsManager = Me.imports.gnomeSettingsManager.Manager;
const Tiles = Me.imports.tiles;
const MouseHandler = Me.imports.mouseHandler.Handler;
const KeybindHandler = Me.imports.keybindHandler.Handler;
    
function enable() {
    log("enable sst");

    this.settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.sst");

    this.gnomeSettingsManager = new GnomeSettingsManager(this.settings);
    this.tiles = new Tiles.Tiles();
    this.mouseHandler = new MouseHandler();
    this.keybindHandler = new KeybindHandler();
}

function disable() {
    log("disable sst");

    this.keybindHandler.destroy();
    this.keybindHandler = null;
    this.mouseHandler.destroy();
    this.mouseHandler = null;
    this.tiles.destroy();
    this.tiles = null;
    this.gnomeSettingsManager.destroy();
    this.gnomeSettingsManager = null;
}

function init() {
    log("Init sst");
}
