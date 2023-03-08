"use strict"

const ExtensionUtils = imports.misc.extensionUtils;

var Manager = class GnomeKeybindSettingsManager {
    constructor(sstSettings) {
        this._resetFns = [];

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

        // Native fullscreen keybinds can collide with tile layer 0 up & down, make our keybinds take
        //  precedence since you can also make windows fullscreen via ours if there is no tile above the window.
        // Retain keybinds that we don't collide with though (e.g. unmaximize also has <Alt>F5 as a default that we can keep)
        const gnomeKeybinds = ExtensionUtils.getSettings("org.gnome.desktop.wm.keybindings");
        this._resetFns.push(
            this.removeValueFromSettingsArray(
                gnomeKeybinds, "maximize", sstSettings.get_strv("tile-move-up-layer-0")));
        this._resetFns.push(
            this.removeValueFromSettingsArray(
                gnomeKeybinds, "unmaximize", sstSettings.get_strv("tile-move-down-layer-0")));
    }

    destroy() {
        // re-enable native tiling
        this._gnomeMutterSettings.reset("edge-tiling");
        this._gnomeShellSettings.reset("edge-tiling");

        // re-enable native tiling keybinds
        this._gnomeMutterKeybindSettings.reset("toggle-tiled-left");
        this._gnomeMutterKeybindSettings.reset("toggle-tiled-right");

        this._resetFns.forEach(f => f());
        this._resetFns = null;
    }

    /**
     * 
     * @param {Gio.Settings} settings - a settings object loaded for a schema 
     * @param string key - key within the settings schema to update (must correlate with a string array type strv)
     * @param string[] values - values within the array to remove
     * @returns function to return key back to its original state
     */
    removeValueFromSettingsArray(settings, key, values) {
        const orig = settings.get_strv(key);
        const removed = orig.filter(s => !values.includes(s));
        log(`Removing '${values}' from ${key} setting. Original '${orig}', now '${removed}'`);
        settings.set_strv(key, removed);

        return function() {
            log(`Returning setting ${key} back to its original value '${orig}'`);
            settings.set_strv(key, orig);
        }
    }
}