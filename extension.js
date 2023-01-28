"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const TilingZones = Me.imports.tilingZones;
const MoveHandler = Me.imports.moveHandler;
    
function enable() {
    log("enable sst");

    // disable native tiling
    this.gnome_mutter_settings = ExtensionUtils.getSettings("org.gnome.mutter");
    this.gnome_mutter_settings.set_boolean("edge-tiling", false);
    this.gnome_shell_settings = ExtensionUtils.getSettings("org.gnome.shell.overrides");
    this.gnome_shell_settings.set_boolean("edge-tiling", false);

    this.tilingZones = new TilingZones.Zones();
    this.windowMoveHandler = new MoveHandler.Handler();
}

function disable() {
    log("disable sst");

    this.windowMoveHandler.destroy();
    this.windowMoveHandler = null;
    this.tilingZones.destroy();
    this.tilingZones = null;

    // re-enable native tiling
    this.gnome_mutter_settings.reset("edge-tiling");
    this.gnome_shell_settings.reset("edge-tiling");
}

function init() {
    log("Init sst");
}
