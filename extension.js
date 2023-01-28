"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MoveHandler = Me.imports.moveHandler;

// TODO: load settings from config
var settings = {
    zones: [
        {
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
        },
        {
            x: 0,
            y: 720,
            width: 1280,
            height: 720,
        },
        {
            x: 1280,
            y: 0,
            width: 2560,
            height: 1440,
        },
        {
            x: 3840,
            y: 0,
            width: 2560,
            height: 1440,
        },
    ]
};
    
function enable() {
    log("enable sst");

    // disable native tiling
    this.gnome_mutter_settings = ExtensionUtils.getSettings("org.gnome.mutter");
    this.gnome_mutter_settings.set_boolean("edge-tiling", false);
    this.gnome_shell_settings = ExtensionUtils.getSettings("org.gnome.shell.overrides");
    this.gnome_shell_settings.set_boolean("edge-tiling", false);

    this.windowMoveHandler = new MoveHandler.Handler();
}

function disable() {
    log("disable sst");

    this.windowMoveHandler.destroy();
    this.windowMoveHandler = null;

    // re-enable native tiling
    this.gnome_mutter_settings.reset("edge-tiling");
    this.gnome_shell_settings.reset("edge-tiling");
}

function init() {
    log("Init sst");
}
