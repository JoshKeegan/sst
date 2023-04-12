"use strict";

const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const WindowMover = Me.imports.windowMover.Mover;
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;
const WindowTileMatcher = Me.imports.windowTileMatcher.Matcher;

var Lifecycle = class WindowLifecycle {
    constructor(windowTileable) {
        this._windowTileable = windowTileable;
        this._settings = {
            tileByDefault: MainExtension.settings.get_boolean("tile-by-default"),
        };

        this._displaySignals = [];
        this._displaySignals.push(global.display.connect("window_created", 
            (_, window) => this._onCreated(window)));
        
        MainExtension.tiles.connectLayoutChanged(this._onLayoutChanged.bind(this));

        // Call on layout changed to auto-tile any existing windows (e.g. after a gnome-shell restart)
        this._onLayoutChanged();
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
        this._windowTileable = null;
    }

    _onCreated(window) {
        log(`created: ${window.get_title()}`);
        window.tile = null;
        this._autoTile(window);
        window.connect("size-changed", this._onSizeChanged.bind(this, window));
    }

    _onSizeChanged(window) {
        const wRect = window.get_frame_rect();
        log(`window "${window.get_title()}" size changed to ${wRect.width}x${wRect.height}`);

        if (window.tile && (window.tile.width !== wRect.width || window.tile.height !== wRect.height)) {
            log(`window "${window.get_title()}" is tiled so should not have been resized. Changing back to ${window.tile.width}x${window.tile.height} (deferred)`);
            GLib.timeout_add(GLib.PRIORITY_HIGH, 0, () => {
                log(`executing deferred resize "${window.get_title()}" to ${window.tile}`);
                WindowMover.moveWithoutUpdatingOtherTiles(window, window.tile);
            });
        }
    }

    _onLayoutChanged() {
        log("layout changed");
        
        // Auto-tile all windows on each workspace
        const numWorkspaces = global.workspace_manager.get_n_workspaces();
        for (let i = 0; i < numWorkspaces; i++) {
            const ws = global.workspace_manager.get_workspace_by_index(i);
            ws.list_windows().forEach(window => {
                window.tile = null;
                this._autoTile(window);
            });
        }
    }

    /**
     * Auto-tile a window.
     * 
     * Auto-tiles the window to the tile that its center is within (allows for some movement, 
     * it to have been sub-tiled etc... whilst still generally putting it in a reasonable position).
     * This works because windows generally re-open in their previous position(ish).
     * @param Meta.Window window 
     */
    _autoTile(window) {
        // If tile by default is off, or the window's fixed properties (ones that cannot be updated by the app async) 
        //  mean it cannot be tiled then this window will never get auto-tiled.
        if (!this._settings.tileByDefault || !this._windowTileable.isTileableFixedProps(window)) {
            return;
        }

        const rectToString = r => `x: ${r.x}\ty: ${r.y}\twidth: ${r.width}\theight: ${r.height}`;
        log(`Initial rect\t${rectToString(window.get_frame_rect())} for "${window.get_title()}"`);

        // If the window is tileable right now, tile it. If the window moves itself async, we will need to re-tile it though.
        if (this._windowTileable.isTileable(window)) {
            const tile = this._autoTileSelectTile(window);
            log(`No delay auto-tiling "${window.get_title()}" to ${tile}`);
            WindowMover.move(window, tile);

            // Note: unhandled edge case (haven't actually seen it happen)
            // If a window appears tileable when opened, it will hit this block of code & auto-tile.
            // If after an async update it should not be tiled (e.g. window title changes to match a
            // floating rule) then it will still have been tiled by this initial tiling, even if the
            // later auto-tiling skips it.
            // If there's ever an example of an app like this, then we'd need to handle it by storing 
            // the original rect & the rect we tiled it to. Then later when we find it should float, 
            // check whether its current rect still matches the one we initially auto-tiled to & if so
            // move it back to its original floating rect.
        }

        // Auto-tile on the window moving itself async (many apps will open a window, then async set its position).
        // This is only to handle async updates immediately following a window being opened, so gets 
        // cancelled after a small delay.
        let posChangedSignal = window.connect("position-changed", w => {
            log(`pos changed: ${rectToString(w.get_frame_rect())}`);
            if (!this._windowTileable.isTileable(window)) {
                log(`Window "${window.get_title()}" is not auto-tileable`)
                WindowMover.leave(window, window.tile);
                return;
            }
            const tile = this._autoTileSelectTile(window);
            log(`Auto-tiling "${window.get_title()}" to ${tile} (deferred)`);
            
            GLib.timeout_add(GLib.PRIORITY_HIGH, 0, () => {
                log(`executing deferred auto-tile of "${window.get_title()}" to ${tile}`);
                WindowMover.leave(window, window.tile);
                WindowMover.move(window, tile);
            });
        });

        // After a small delay, clear the position changed event handler
        const windowId = window.get_id();
        GLib.timeout_add(GLib.PRIORITY_LOW, 500, () => {
            window.disconnect(posChangedSignal);

            // Check if the window has already been closed. 
            // Trying to use window object when the window no longer exists crashes Mutter.
            if (!this._isWindowOpen(windowId)) {
                log("Window closed before auto-tile delay fired");
                return false;
            }

            log(`Post-delay rect\t${rectToString(window.get_frame_rect())}`);

            // Make a final check for whether the window should be auto-tiled. This is to catch any windows
            // that have made async updates (other than position updates) that will make them tileable, but were 
            // not initially tiled (e.g. changing title and the initial value matched a floating rule).
            // 99.9% of windows should be handled by this point. The delay between window open & auto-tile
            // is not a pleasant UX, but it is here to ensure all windows get handled. Anything relying on this
            // should be looked into as there may be other events we can listen to (e.g. window resize) to trigger 
            // the auto-tile earlier.
            if (!this._windowTileable.isTileable(window)) {
                log(`Window "${window.get_title()}" is not auto-tileable`)
                WindowMover.leave(window, window.tile);
                return;
            }
            const tile = this._autoTileSelectTile(window);
            log(`Auto-tiling "${window.get_title()}" to ${tile}`);
            WindowMover.leave(window, window.tile);
            WindowMover.move(window, tile);
        });
    }

    _autoTileSelectTile(window) {
        const wRect = window.get_frame_rect();

        // First see if the window matches a tile (any layer)
        // This is mainly to handle gnome-shell restarts
        const tile = WindowTileMatcher.matchTile(MainExtension.tiles.all, wRect);
        if (tile !== null) {
            return tile;
        }

        // If not, find the closest tile on the top layer & put it there
        return TileRelationshipCalculator.findClosest(MainExtension.tiles.getAllTiles(0), wRect);
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

    _isWindowOpen(windowId) {
        const windows = global.workspace_manager.get_active_workspace().list_windows();
        for (let i = 0; i < windows.length; i++) {
            if (windows[i].get_id() === windowId) {
                return true;
            }
        }
        return false;
    }
}