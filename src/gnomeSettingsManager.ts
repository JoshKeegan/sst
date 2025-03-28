import Gio from "@girs/gio-2.0"

/**
 * GnomeSettingsManager is in charge of changing Gnome default keybinds that we want to replace with our own.
 * This is generally because the functionality is replaced (e.g. native edge tiling).
 * When developing, if you find a collision, you can find the config with gsettings, e.g.:
 *  # gsettings list-recursively | grep "<Super><Alt>Left"
 */
export default class GnomeSettingsManager {
    private resetFns: (() => void)[] = [];

    constructor(getSettings: (schema?: string) => Gio.Settings) {
        const sstSettings = getSettings();

        // Fail gracefully: failure to update one setting shouldn't leave all of the others
        //  in a modified state
        try {
            // disable native tiling
            this.resetFns.push(
                this.settingsSetBool(getSettings("org.gnome.mutter"),
                    "edge-tiling", false));
            
            // No longer exists in gnome-shell 44
            let gnomeShellOverrides: Gio.Settings | undefined;
            try {
                gnomeShellOverrides = getSettings("org.gnome.shell.overrides");
            }
            catch (e: any) {
                log("Skipping gnome.shell.overrides settings");
            }
            if (gnomeShellOverrides !== undefined) {
                this.resetFns.push(
                    this.settingsSetBool(gnomeShellOverrides,
                        "edge-tiling", false));
            }

            // disable native tiling keybindings as edge-tiling being off doesn't disable
            //  it via keybinds for some reason.
            const gnomeMutterKeybinds = getSettings("org.gnome.mutter.keybindings");
            this.resetFns.push(
                this.settingsSetStrv(gnomeMutterKeybinds, "toggle-tiled-left", []));
            this.resetFns.push(
                this.settingsSetStrv(gnomeMutterKeybinds, "toggle-tiled-right", []));  

            // Native fullscreen keybinds can collide with tile layer 0 up & down, make our keybinds take
            //  precedence since you can also make windows fullscreen via ours if there is no tile above the window.
            // Retain keybinds that we don't collide with though (e.g. unmaximize also has <Alt>F5 as a default that we can keep)
            const gnomeKeybinds = getSettings("org.gnome.desktop.wm.keybindings");
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeKeybinds, "maximize", sstSettings.get_strv("tile-move-up-layer-0")));
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeKeybinds, "unmaximize", sstSettings.get_strv("tile-move-down-layer-0")));
            
            // Native tiling switch workspace has multiple keybinds on newer Gnome versions, we want <Super><Alt>Left/Right
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeKeybinds, "switch-to-workspace-left", sstSettings.get_strv("tile-move-left-layer-1")));
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeKeybinds, "switch-to-workspace-right", sstSettings.get_strv("tile-move-right-layer-1")));
            
            // Window close setting is implemented natively. Instead of also adding our own implementation,
            // just update the config so the sst keybinds get handled too.
            this.resetFns.push(
                this.settingsAddToStrv(gnomeKeybinds, "close", sstSettings.get_strv("close")));

            // Native shift overview up/down that has been added in newer Gnome versions collides. We want <Super><Alt>Up/Down
            // Not sure why you'd want a keyboard shortcut for this anyway as you can type at the top level... Shifting the overview
            // up seems like mouse behaviour to me because it gives you the grid of installed applications to select from...
            const gnomeShellKeybinds = getSettings("org.gnome.shell.keybindings");
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeShellKeybinds, "shift-overview-up", sstSettings.get_strv("tile-move-up-layer-1")));
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeShellKeybinds, "shift-overview-down", sstSettings.get_strv("tile-move-down-layer-1")));
            
            // Toggle quick settings default (<Super>S) conflicts with tiling layer 0 with WASD.
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeShellKeybinds, "toggle-quick-settings", sstSettings.get_strv("tile-move-down-layer-0")));
            
            // Toggle application view defualt (<Super>A) conflicts with tiling layer 0 WASD. Change to <Super><Shift>A.
            this.resetFns.push(
                this.settingsRemoveFromStrv(
                    gnomeShellKeybinds, "toggle-application-view", sstSettings.get_strv("tile-move-left-layer-0")));
            this.resetFns.push(
                this.settingsAddToStrv(
                    gnomeShellKeybinds, "toggle-application-view", ["<Super><Shift>A"]));       
        }
        catch (e) {
            logError(e, "Failed to set a GNOME setting, resetting any that have already been set");
            this.destroy();

            throw new Error("Failed to update GNOME settings");
        }
    }

    destroy() {
        this.resetFns.forEach(f => {
            // Fail gracefully: failure to reset one setting shouldn't prevent others from being reset
            try {
                f();
            }
            catch (e) {
                logError(e, "Failed to reset a GNOME setting");
            }
        });
        this.resetFns = [];
    }

    /**
     * Updates a strv (string array) setting, removing the specified values
     * @param {Gio.Settings} settings - a settings object loaded for a schema 
     * @param string key - key within the settings schema to update (must correlate with a string array type strv)
     * @param string[] values - values within the array to remove
     * @returns function to return key back to its original state
     */
    private settingsRemoveFromStrv(settings: Gio.Settings, key: string, values: string[]): () => void {
        if (!settings.settings_schema.has_key(key)) {
            log(`${settings.settings_schema.get_id()} does not contain key ${key}, skipping updating it`);
            return () => {  };
        }

        // Use case-insensitive comparison, since keybinds can be either
        const lowerValues = new Set(values.map(v => v.toLowerCase()));

        const orig = settings.get_strv(key);
        const removed = orig.filter(s => !lowerValues.has(s.toLowerCase()));
        log(`Removing '${values}' from ${key} setting. Original '${orig}', now '${removed}'`);
        settings.set_strv(key, removed);

        return () => {
            this.logRevertSetting(key, orig);
            settings.set_strv(key, orig);
        }
    }

    /**
     * Updates a strv (string array) setting, adding the specified values
     * @param {Gio.Settings} settings - a settings object loaded for a schema 
     * @param string key - key within the settings schema to update (must correlate with a string array type strv)
     * @param string[] values - values to add to the array
     * @returns function to return key back to its original state
     */
    private settingsAddToStrv(settings: Gio.Settings, key: string, values: string[]): () => void {
        if (!settings.settings_schema.has_key(key)) {
            log(`${settings.settings_schema.get_id()} does not contain key ${key}, skipping updating it`);
            return () => {  };
        }
        const orig = settings.get_strv(key);
        const updated = [...orig, ...values];
        log(`Adding '${values}' to ${key} setting. Original '${orig}', now '${updated}'`);
        settings.set_strv(key, updated);

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
    private settingsSetBool(settings: Gio.Settings, key: string, value: boolean): () => void {
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
    private settingsSetStrv(settings: Gio.Settings, key: string, value: string[]): () => void {
        const orig = settings.get_strv(key);
        log(`Updating ${key} setting. Original '${orig}', now '${value}'`);
        settings.set_strv(key, value);

        return () => {
            this.logRevertSetting(key, orig);
            settings.set_strv(key, orig);
        }
    }

    private logRevertSetting(key: string, orig: any) {
        log(`Returning setting ${key} back to its original value '${orig}'`);
    }
}
