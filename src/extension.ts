import Gio from "@girs/gio-2.0";

import {Config} from "./config";
import GnomeSettingsManager from "./gnomeSettingsManager";
import KeybindHandler from "./keybindHandler";
import MouseHandler from "./mouseHandler";
import Tiles from "./tiles";
import WindowTileable from "./windowTileable";
import WindowLifecycle from "./windowLifecycle";

const ExtensionUtils = imports.misc.extensionUtils;

class Extension {
    private settings?: Gio.Settings;
    private gnomeSettingsManager?: GnomeSettingsManager;
    private tiles?: Tiles;
    private windowLifecycle?: WindowLifecycle;
    private keybindHandler?: KeybindHandler;
    private mouseHandler?: MouseHandler;

    constructor() {
        log("Init sst");
    }

    enable() {
        log("enable sst");

        this.settings = ExtensionUtils.getSettings("org.gnome.shell.extensions.sst");
    
        const config = Config.load();
    
        this.gnomeSettingsManager = new GnomeSettingsManager(this.settings);
        this.tiles = new Tiles();
        const windowTileable = new WindowTileable(config);
        this.keybindHandler = new KeybindHandler(this.settings, this.tiles);
        this.windowLifecycle = new WindowLifecycle(this.settings, windowTileable, this.tiles, this.keybindHandler);
        this.mouseHandler = new MouseHandler(this.windowLifecycle, this.tiles, this.keybindHandler);
    }

    disable() {
        log("disable sst");

        this.mouseHandler?.destroy();
        this.mouseHandler = undefined;
        this.windowLifecycle?.destroy();
        this.windowLifecycle = undefined;
        this.keybindHandler?.destroy();
        this.keybindHandler = undefined;
        this.tiles?.destroy();
        this.tiles = undefined;
        this.gnomeSettingsManager?.destroy();
        this.gnomeSettingsManager = undefined;
    }
}

function init() {
    return new Extension();
}
