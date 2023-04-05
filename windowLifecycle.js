"use strict";

const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const WindowMover = Me.imports.windowMover.Mover;
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;

var Lifecycle = class WindowLifecycle {
    constructor(windowTileable) {
        this._windowTileable = windowTileable;
        this._settings = {
            tileByDefault: MainExtension.settings.get_boolean("tile-by-default"),
        };

        this._displaySignals = [];
        this._displaySignals.push(global.display.connect("window_created", 
            (_, window) => this._onCreated(window)));
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
        this._windowTileable = null;
    }

    _onCreated(window) {
        log("created: " + window.get_title());
        this._autoTile(window);
    }

    _autoTile(window) {
        // If tile by default is off, or the window's fixed properties (ones that cannot be updated by the app async) 
        //  mean it cannot be tiled then this window will never get auto-tiled.
        if (!this._settings.tileByDefault || !this._windowTileable.isTileableFixedProps(window)) {
            return;
        }

        const rectToString = r => `x: ${r.x}\ty: ${r.y}\twidth: ${r.width}\theight: ${r.height}`;

        // Windows generally re-open in their previous position (ish).
        //  Auto-tile the window to the tile that its center is within (allows for some movement, 
        //  it to have been sub-tiled etc... whilst still generally putting it in a reasonable position).
        log(`Initial rect\t${rectToString(window.get_frame_rect())} for "${window.get_title()}"`);

        // If the window is tileable right now, tile it. We may just need to re-tile it
        //  if it is moved async/
        // TODO: Do we care if a window appears tileable when opened, but then matches a floating
        //  rule after async update? May need to make some floating rules specifically sync/async
        if (this._windowTileable.isTileable(window)) {
            const tile = TileRelationshipCalculator.findClosest(MainExtension.tiles.getAllTiles(0), window.get_frame_rect());
            log(`No delay auto-tiling "${window.get_title()}" to ${tile}`);
            WindowMover.move(window, tile);
        }

        // Leave a small delay for the initial window position to be set, some windows async change this 
        //  during start, e.g. terimal & spotify. Some don't so could be set instantly e.g. Chrome
        // TODO: Improve this simple delay. Some apps start quicker than others, and this will be hardware
        //  and load dependant too. For apps that settle in position quicker, if we can detect it then
        //  we could move them sooner for a snappier experience.
        //  e.g. For a gnome terminal 50ms is plenty, but for Firefox 200ms wouldn't be long enough...
        // I've set it really high for now to cater for all apps, but it needs tightening
        // Idea: bind to "position-changed" event. If called in first 500ms then that triggers re-tile,
        //  otherwise after 500ms the window hasn't moved & the event can be cancelled.
        GLib.timeout_add(GLib.PRIORITY_LOW, 500, () => {
            // Window state (mainly title) can have been updated async, check for whether to tile it should be after
            //  changes, so check now
            if (!this._windowTileable.isTileable(window)) {
                log(`Window "${window.get_title()}" is not auto-tileable`)
                return;
            }
            log(`Post-delay rect\t${rectToString(window.get_frame_rect())}`);
            const tile = TileRelationshipCalculator.findClosest(MainExtension.tiles.getAllTiles(0), window.get_frame_rect());
            log(`Auto-tiling "${window.get_title()}" to ${tile}`);
            WindowMover.move(window, tile);
        });
    }

    isTilingModeActive(window) {
        // If floating by default, control tiling entirely based on user-input. Assumes that if the user asks 
        //  for a window to be tiled, they want it tiling regardless of whether we think it should be.
        if (!this._settings.tileByDefault) {
            return this._isTilingKeyPressed();
        }

        // Otherwise tiling is the default, if we think the window should be floated, float it.
        if (!this._windowTileable.isTileable(window)) {
            return false;
        }
        // Window can be tiled, check the user isn't asking for it to be floated
        return !this._isTilingKeyPressed();
    }

    _isTilingKeyPressed() {
        // TODO: Make key configurable
        return MainExtension.keybindHandler.isModKeyPressed(Clutter.ModifierType.CONTROL_MASK);
    }
}