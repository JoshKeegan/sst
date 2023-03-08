"use strict"

const ExtensionUtils = imports.misc.extensionUtils;

var Manager = class GnomeKeybindSettingsManager {
    constructor() {
        // TODO: Don't disable if there's no keybind collision.
        // TODO: Reset keybinds back to what they were beforehand, not their defaults (user may have
        //  customised them).
        // Ideally this should just remove the colliding keybind & re-add it when the extension is 
        //  disabled. e.g. "unmaximize" defaults to ['<Super>Down', '<Alt>F5'] and there's no collision
        //  on '<Alt>F5' so it could remain.

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

        // disable native fullscreen as we replace this with our own fullscreen call if moving a tiled 
        //  window up and there's no tile above it
        this._gnomeKeybindSettings = ExtensionUtils.getSettings("org.gnome.desktop.wm.keybindings");
        this._gnomeKeybindSettings.set_strv("maximize", []);
        this._gnomeKeybindSettings.set_strv("unmaximize", []);
    }

    destroy() {
        // re-enable native tiling
        this._gnomeMutterSettings.reset("edge-tiling");
        this._gnomeShellSettings.reset("edge-tiling");

        // re-enable native tiling keybinds
        this._gnomeMutterKeybindSettings.reset("toggle-tiled-left");
        this._gnomeMutterKeybindSettings.reset("toggle-tiled-right");

        // re-enable native fullscreen keybinds
        this._gnomeKeybindSettings.reset("maximize");
        this._gnomeKeybindSettings.reset("unmaximize");
    }
}