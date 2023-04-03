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
            regexFloatWindowTitle: new RegExp(MainExtension.settings.get_string("float-window-title")),
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
        // Only auto-tile based on config & window state, not user-input
        if (!this._settings.tileByDefault || !this._windowIsTileable(window)) {
            return;
        }

        const rectToString = r => `x: ${r.x}\ty: ${r.y}\twidth: ${r.width}\theight: ${r.height}`;

        // Windows generally re-open in their previous position (ish).
        //  Auto-tile the window to the tile that its center is within (allows for some movement, 
        //  it to have been sub-tiled etc... whilst still generally putting it in a reasonable position).
        log(`Auto-tiling "${window.get_title()}"`);
        log(`Initial rect\t${rectToString(window.get_frame_rect())}`);

        // Leave a small delay for the initial window position to be set, some windows async change this 
        //  during start, e.g. terimal & spotify. Some don't so could be set instantly e.g. Chrome
        // TODO: Improve this simple delay. Some apps start quicker than others, and this will be hardware
        //  and load dependant too. For apps that settle in position quicker, if we can detect it then
        //  we could move them sooner for a snappier experience.
        //  e.g. For a gnome terminal 50ms is plenty, but for Firefox 200ms wouldn't be long enough...
        // I've set it really high for now to cater for all apps, but it needs tightening
        GLib.timeout_add(GLib.PRIORITY_LOW, 500, () => {
            // Window state (mainly title) can also have been updated async, check we should still tile it
            if (this._settings.tileByDefault && !this._windowIsTileable(window)) {
                log(`Window "${window.get_title()}" state has changed since initially opening and it should no longer be tiled`)
                return;
            }
            log(`Post-delay rect\t${rectToString(window.get_frame_rect())}`);
            const tile = TileRelationshipCalculator.findClosest(MainExtension.tiles.getAllTiles(0), window.get_frame_rect());
            WindowMover.move(window, tile);
            log(`Auto-tiling "${window.get_title()}" to ${tile}`);
        });
    }

    isTilingModeActive(window) {
        // If floating by default, control tiling entirely based on user-input. Assumes that if the user asks 
        //  for a window to be tiled, they want it tiling regardless of whether we think it should be.
        if (!this._settings.tileByDefault) {
            return this._isTilingKeyPressed();
        }

        // Otherwise tiling is the default, if we think the window should be floated, float it.
        if (!this._windowIsTileable(window)) {
            return false;
        }
        // Window can be tiled, check the user isn't asking for it to be floated
        return !this._isTilingKeyPressed();
    }

    _windowIsTileable(window) {
        /*
            https://gjs-docs.gnome.org/meta12~12-windowtype/
            https://wiki.gnome.org/Projects/Metacity/WindowTypes

            Tile:
            Normal - Most app windows
            Utility - Attached to parent, but still seems sensible to tile. e.g. Firefox picture-in-picture
        */
        const type = window.get_window_type();
        if (type !== Meta.WindowType.NORMAL && 
            type !== Meta.WindowType.UTILITY) {
            return false;
        }

        // Windows with WM_TRANSIENT_FOR set are pop-ups for the window it specifies
        if (window.get_transient_for() !== null) {
            return false;
        }

        // Don't tile windows that can't be resized:
        //  - Splash/loading screen: intentended to float
        //  - Pop-up: we want to float these
        //  - Poor UI needing fixed window size: can't tile these anyway ¯\_(ツ)_/¯
        if (!window.resizeable) {
            return false;
        }

        return !this._settings.regexFloatWindowTitle.test(window.get_title());
    }

    _isTilingKeyPressed() {
        // TODO: Make key configurable
        return MainExtension.keybindHandler.isModKeyPressed(Clutter.ModifierType.CONTROL_MASK);
    }
}