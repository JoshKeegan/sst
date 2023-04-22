"use strict";

const { Gio, GLib } = imports.gi;
const { byteArray } = imports;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const GnomeSettingsManager = Me.imports.gnomeSettingsManager.Manager;
const Tiles = Me.imports.tiles;
const WindowTileable = Me.imports.windowTileable.Tileable;
const WindowLifecycle = Me.imports.windowLifecycle.Lifecycle;
const MouseHandler = Me.imports.mouseHandler.Handler;
const KeybindHandler = Me.imports.keybindHandler.Handler;
    
function enable() {
    log("enable sst");

    this.settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.sst");

    const config = this._loadConfig();

    this.gnomeSettingsManager = new GnomeSettingsManager(this.settings);
    this.tiles = new Tiles.Tiles();
    this.windowTileable = new WindowTileable(config);
    this.windowLifecycle = new WindowLifecycle(this.windowTileable);
    this.mouseHandler = new MouseHandler();
    this.keybindHandler = new KeybindHandler(this.settings);
}

function disable() {
    log("disable sst");

    this.keybindHandler.destroy();
    this.keybindHandler = null;
    this.mouseHandler.destroy();
    this.mouseHandler = null;
    this.windowLifecycle.destroy();
    this.windowLifecycle = null;
    this.windowTileable.destroy();
    this.windowTileable = null;
    this.tiles.destroy();
    this.tiles = null;
    this.gnomeSettingsManager.destroy();
    this.gnomeSettingsManager = null;
}

function init() {
    log("Init sst");
}

/*
    TODO: document in readme - until then docs are...
    floatingRules: [{ class, notClass, title, notTitle }]
    Regex on window class &/or title that forces a window to be floating
    Find values by running:
    # xprop | grep -e "WM_NAME(" -e "WM_CLASS("
    Then clicking on the window.
    Note that there may be multiple values for class. You need to use the last one.
*/
function _loadConfig() {
    // load from user's home dir & fallback to default if not present
    let [found, userConfig] = _loadConfigFile(GLib.get_user_config_dir() + "/sst/config.json");
    if (found) {
        return userConfig;
    }
    log("sst: no user config found, loading default");
    let [_, defaultConfig] = _loadConfigFile(
        GLib.get_user_data_dir()+"/gnome-shell/extensions/sst@joshkeegan.co.uk/config.default.json");
    return defaultConfig;
}

function _loadConfigFile(path) {
    const file = Gio.File.new_for_path(path);
    if (!file.query_exists(null)) {
        return [false, null];
    }

    const [ok, bytes, _] = file.load_contents(null);
    if (!ok) {
        throw new Error("loading config - could not read file");
    }
    const string = byteArray.toString(bytes);
    log(string);
    return [true, JSON.parse(string)];
}
