"use strict"

const ExtensionUtils = imports.misc.extensionUtils;

var Manager = class GnomeKeybindSettingsManager {
    constructor(sstSettings) {
        this._resetFns = [];

        // Fail gracefully: failure to update one setting shouldn't leave all of the others
        //  in a modified state
        try {
            // disable native tiling
            this._resetFns.push(
                this.settingsSetBool(ExtensionUtils.getSettings("org.gnome.mutter"),
                    "edge-tiling", false));
            this._resetFns.push(
                this.settingsSetBool(ExtensionUtils.getSettings("org.gnome.shell.overrides"),
                    "edge-tiling", false));

            // disable native tiling keybindings as edge-tiling being off doesn't disable
            //  it via keybinds for some reason.
            const gnomeMutterKeybinds = ExtensionUtils.getSettings("org.gnome.mutter.keybindings");
            this._resetFns.push(
                this.settingsSetStrv(gnomeMutterKeybinds, "toggle-tiled-left", []));
            this._resetFns.push(
                this.settingsSetStrv(gnomeMutterKeybinds, "toggle-tiled-right", []));  

            // Native fullscreen keybinds can collide with tile layer 0 up & down, make our keybinds take
            //  precedence since you can also make windows fullscreen via ours if there is no tile above the window.
            // Retain keybinds that we don't collide with though (e.g. unmaximize also has <Alt>F5 as a default that we can keep)
            const gnomeKeybinds = ExtensionUtils.getSettings("org.gnome.desktop.wm.keybindings");
            this._resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeKeybinds, "maximize", sstSettings.get_strv("tile-move-up-layer-0")));
            this._resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeKeybinds, "unmaximize", sstSettings.get_strv("tile-move-down-layer-0")));
        }
        catch (e) {
            logError(e, "Failed to set a GNOME setting, resetting any that have already been set");
            this.destroy();

            throw new Error("Failed to update GNOME settings");
        }
    }

    destroy() {
        this._resetFns.forEach(f => {
            // Fail gracefully: failure to reset one setting shouldn't prevent others from being reset
            try {
                f();
            }
            catch (e) {
                logError(e, "Failed to reset a GNOME setting");
            }
        });
        this._resetFns = null;
    }

    /**
     * Updates a strv (string array) setting, removing the specified values
     * @param {Gio.Settings} settings - a settings object loaded for a schema 
     * @param string key - key within the settings schema to update (must correlate with a string array type strv)
     * @param string[] values - values within the array to remove
     * @returns function to return key back to its original state
     */
    settingsRemoveFromStrv(settings, key, values) {
        const orig = settings.get_strv(key);
        const removed = orig.filter(s => !values.includes(s));
        log(`Removing '${values}' from ${key} setting. Original '${orig}', now '${removed}'`);
        settings.set_strv(key, removed);

        return () => {
            this.logRevertSetting(key, orig);
            settings.set_strv(key, orig);
        }
    }

    /**
     * Updates a bool setting to the specified value
     * @param {Gio.Settings} settings - a settings object loaded for a schema 
     * @param string key - key within the settings schema to update
     * @param bool value 
     * @returns function to return key back to its original state
     */
    settingsSetBool(settings, key, value) {
        const orig = settings.get_boolean(key);
        log(`Updating ${key} setting. Original ${orig}, now ${value}`);
        settings.set_boolean(key, value);

        return () => {
            this.logRevertSetting(key, orig);
            settings.set_boolean(key, orig);
        }
    }

    /**
     * Updates a strv (string array) setting to the specified value
     * @param {Gio.Settings} settings - a settings object loaded for a schema 
     * @param string key - key within the settings schema to update
     * @param string[] value
     * @returns function to return key back to its original state 
     */
    settingsSetStrv(settings, key, value) {
        const orig = settings.get_strv(key);
        log(`Updating ${key} setting. Original '${orig}', now '${value}'`);
        settings.set_strv(key, value);

        return () => {
            this.logRevertSetting(key, orig);
            settings.set_strv(key, orig);
        }
    }

    logRevertSetting(key, orig) {
        log(`Returning setting ${key} back to its original value '${orig}'`);
    }
}