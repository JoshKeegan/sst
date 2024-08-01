import Gio from "@girs/gio-2.0";

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Config} from "./config";
import GnomeSettingsManager from "./gnomeSettingsManager";
import KeybindHandler from "./keybindHandler";
import MouseHandler from "./mouseHandler";
import Tiles from "./tiles";
import WindowTileable from "./windowTileable";
import WindowLifecycle from "./windowLifecycle";

export default class SstExtension extends Extension {
    private settings?: Gio.Settings;
    private gnomeSettingsManager?: GnomeSettingsManager;
    private tiles?: Tiles;
    private windowLifecycle?: WindowLifecycle;
    private keybindHandler?: KeybindHandler;
    private mouseHandler?: MouseHandler;

    constructor(metadata: any) {
        log("Init sst");
        super(metadata);
    }

    enable() {
        log("enable sst");
        
        this.settings = this.getSettings();
    
        const config = Config.load();

        // Capture "this", so we can pass the getSettings fn around, as ExtensionBase.getSettings 
        // requires its properties.
        const getSettings = (schema?: string) => { return this.getSettings(schema) };
    
        this.gnomeSettingsManager = new GnomeSettingsManager(getSettings);
        this.tiles = new Tiles();
        const windowTileable = new WindowTileable(config);
        this.keybindHandler = new KeybindHandler(getSettings, this.tiles);
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
