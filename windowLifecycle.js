"use strict";

const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const WindowMover = Me.imports.windowMover.Mover;
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;

var Lifecycle = class WindowLifecycle {
    constructor() {
        this._settings = {
            tileByDefault: MainExtension.settings.get_boolean("tile-by-default"),
            regexInvertTilingForWindowTitle: new RegExp(MainExtension.settings.get_string("invert-tiling-for-window-title")),
        };

        this._displaySignals = [];
        this._displaySignals.push(global.display.connect("window_created", 
            (_, window) => this._onCreated(window)));
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
    }

    _onCreated(window) {
        log("created: " + window.get_title());
        this._autoTile(window);
    }

    _autoTile(window) {
        if (!this.isTilingModeActive(window)) {
            return;
        }

        const rectToString = r => `x: ${r.x}\ty: ${r.y}\twidth: ${r.width}\theight: ${r.height}`;

        // Windows generally re-open in their previous position (ish).
        //  Auto-tile the window to the tile that its center is within (allows for some movement, 
        //  it to have been sub-tiled etc... whilst still generally putting it in a reasonable position).
        log(`Auto-tiling ${window.get_title()}`);
        log(`Initial rect\t${rectToString(window.get_frame_rect())}`);

        // Leave a small delay for the initial window position to be set, some windows async change this 
        //  during start, e.g. terimal & spotify. Some don't so could be set instantly e.g. Chrome
        // TODO: Improve this simple delay. Some apps start quicker than others, and this will be hardware
        //  and load dependant too. For apps that settle in position quicker, if we can detect it then
        //  we could move them sooner for a snappier experience.
        //  e.g. For a gnome terminal 50ms is plenty, but for Firefox 200ms wouldn't be long enough...
        // I've set it really high for now to cater for all apps, but it needs tightening
        GLib.timeout_add(GLib.PRIORITY_LOW, 500, () => {
            log(`Post-delay rect\t${rectToString(window.get_frame_rect())}`);
            const tile = TileRelationshipCalculator.findClosest(MainExtension.tiles.getAllTiles(0), window.get_frame_rect());
            WindowMover.move(window, tile);
            log(`Auto-tiling ${window.get_title()} to ${tile}`);
        });
    }

    isTilingModeActive(window) {
        let active = this._settings.tileByDefault && this._windowSuitableForTiling(window);
        if (this._isTilingKeyPressed()) {
            active = !active;
        }
        return active;
    }
    
    /**
     * Whether the specified window is suitable for tiling.
     * Considers window type (not a popup, modal, dialog etc...) and the invert tiling config.
     * @param Meta.Window window 
     * @returns bool
     */
    _windowSuitableForTiling(window) {
        /*
            https://gjs-docs.gnome.org/meta12~12-windowtype/
            https://wiki.gnome.org/Projects/Metacity/WindowTypes

            Tile:
            Normal - Most app windows
            Utility - Attached to parent, but still seems sensible to tile. e.g. Firefox picture-in-picture
        */
        const type = window.get_window_type();
        if (type === Meta.WindowType.NORMAL || 
            type === Meta.WindowType.UTILITY) {
            return !this._settings.regexInvertTilingForWindowTitle.test(window.get_title());
        }
        // If the window type is not tileable, don't apply the regex inversion, as it can make a non-tileable "About" 
        //  window tile again by matching both checks.
        // We don't want the inversion for these windows anyway, it mainly exists to catch "normal" windows that are actually
        //  pop-ups.
        return false;
    }

    _isTilingKeyPressed() {
        // TODO: Make key configurable
        return MainExtension.keybindHandler.isModKeyPressed(Clutter.ModifierType.CONTROL_MASK);
    }
}