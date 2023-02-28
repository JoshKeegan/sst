"use strict";

const {windowManager} = imports.ui;
const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const Tile = Me.imports.tile.Tile;
const Geometry = Me.imports.geometry.Geometry;
const WindowMover = Me.imports.windowMover.Mover;
const WindowTileMatcher = Me.imports.windowTileMatcher.Matcher;
const GNOME_VERSION = parseFloat(imports.misc.config.PACKAGE_VERSION);

const COMBINED_TILES_TRIGGER_DISTANCE_PX = 30;

var Handler = class MoveHandler {
    constructor() {
        this._settings = {
            tileByDefault: MainExtension.settings.get_boolean("tile-by-default"),
            regexInvertTilingForWindowTitle: new RegExp(MainExtension.settings.get_string("invert-tiling-for-window-title")),
        };

        const isMoving = grabOp => [Meta.GrabOp.MOVING, Meta.GrabOp.KEYBOARD_MOVING].includes(grabOp);

        this._displaySignals = [];
        this._displaySignals.push(global.display.connect("grab-op-begin", (...params) => {
            // pre GNOME 40 the signal emitter was added as the first and second param, fixed with !1734 in mutter
            const [window, grabOp] = [params[params.length - 2], params[params.length - 1]];
            if (window && isMoving(grabOp))
                this._onMoveStarted(window, grabOp);
        }));
        this._displaySignals.push(global.display.connect("grab-op-end", (...params) => {
            // pre GNOME 40 the signal emitter was added as the first and second param, fixed with !1734 in mutter
            const [window, grabOp] = [params[params.length - 2], params[params.length - 1]];
            if (window && isMoving(grabOp))
                this._onMoveFinished(window);
        }));

        this._posChangedId = 0;
        this._lastActive = false;

        this._tileLayoutPreview = null;
        this._tilePreview = new windowManager.TilePreview();

        // Tile (extending Meta.Rectangle so can be passed to gnome-shell), which the grabbed window will tile to
        this._tile = null;
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
        this._tilePreview.destroy();
        this._tilePreview = null;
    }

    _onMoveStarted(window, grabOp) {
        log("sst: move started");

        this._posChangedId = window.connect("position-changed",
            this._onMoving.bind(this, grabOp, window));
        
        // Behaviour on leaving a tile
        const wRect = window.get_frame_rect();
        const leavingTile = WindowTileMatcher.matchTile(MainExtension.tiles.all, wRect);
        WindowMover.leave(window, leavingTile);
    }

    _onMoveFinished(window) {
        log("sst: moved finished");

        if (this._posChangedId) {
            window.disconnect(this._posChangedId);
            this._posChangedId = 0;
        }

        if (this._isTilingModeActive(window)) {
            WindowMover.move(window, this._tile);
        }

        this._closeTileLayoutPreview();

        this._tilePreview.close();
        this._tile = null;
    }

    _onMoving(grabOp, window) {
        let active = this._isTilingModeActive(window);

        if (active) {
            // Split-tiling feature: if the split tile key is also pressed, use the second tile layer
            //  which splits each of the top-level tiles into smaller ones.
            const tileLayer = this._isSplitTile1KeyPressed() ? (this._isSplitTile2KeyPressed() ? 2 : 1) : 0;
            this._draw(grabOp, window, tileLayer);
        }
        else if (this._lastActive) {
            this._closeTileLayoutPreview();

            this._undraw();
        }
        this._lastActive = active;
    }

    _isTilingModeActive(window) {
        let active = this._settings.tileByDefault;
        if (this._isMouseTilingKeyPressed()) {
            active = !active;
        }
        if (this._settings.regexInvertTilingForWindowTitle.test(window.get_title())) {
            active = !active;
        }
        return active;
    }

    _isMouseTilingKeyPressed() {
        // TODO: Make key configurable
        return this._isKeyPressed(Clutter.ModifierType.CONTROL_MASK);
    }

    _isSplitTile1KeyPressed() {
        // See CLUTTER_MOD1_MASK & CLUTTER_MOD5_MASK in Mutter enum ClutterModifierType
        // Seems like they aren't defined in older versions.
        const leftAlt = 1 << 3;
        const rightAlt = 1 << 7;
        return this._isKeyPressed(leftAlt | rightAlt);
    }

    _isSplitTile2KeyPressed() {
        // See CLUTTER_MOD1_MASK & CLUTTER_MOD5_MASK in Mutter enum ClutterModifierType
        // Seems like they aren't defined in older versions.
        return this._isKeyPressed(1 << 6); // Super key (left or right)
    }

    _isKeyPressed(modMask) {
        const event = Clutter.get_current_event();
        const modifiers = event ? event.get_state() : 0;
        return (modifiers & modMask) !== 0;
    }

    _draw(grabOp, window, tileLayer) {
        this._openTileLayoutPreview(tileLayer);

        // Calculate the tile the window will move to
        const monitorIdx = global.display.get_current_monitor();
        const tiles = MainExtension.tiles.getTiles(tileLayer, monitorIdx);
        const pointer = global.get_pointer();
        const tile = this._selectTile(tiles, { x: pointer[0], y: pointer[1] });

        // Draw the preview of the tile the window will move to
        if (!tile || !this._tile || !tile.equal(this._tile)) {
            // If we already have another tile selected (window is being dragged), we have to close the existing one before
            //  opening a new preview. Also delay showing the next preview, if we reuse the tile preview whilst the last one is 
            //  still animating away then it won't be shown.
            if (this._tile !== null) {
                this._tilePreview.close();
                GLib.timeout_add(GLib.PRIORITY_HIGH, 250, () => this._tilePreview.open(window, tile, monitorIdx));
            }
            else {
                this._tilePreview.open(window, tile, monitorIdx);
            }
            this._tile = tile;
        }
    }

    _undraw() {
        this._tilePreview.close();
        this._tile = null;
    }

    _selectTile(tiles, ptr) {
        const tile = tiles.find(t =>  Geometry.contains(t, ptr));
        
        // Combined tiling feature: if close to an edge of the tile, the target area 
        //  can be combined with the adjacent tile, if both tiles are on the same monitor.
        // Note that there's no check for tiles to be actually adjacent, the closest tile
        //  is used to allow for small gaps to be left between tiles if someone wanted to 
        //  leave borders.
        let combinedTile = tile;
        // Left
        if (tile.relationships.left !== null && 
            tile.relationships.left.monitorIdx === tile.monitorIdx &&
            ptr.x < tile.x + COMBINED_TILES_TRIGGER_DISTANCE_PX) {
            combinedTile = Tile.combine(combinedTile, tile.relationships.left);
        }

        // Right
        if (tile.relationships.right !== null && 
            tile.relationships.right.monitorIdx === tile.monitorIdx &&
            ptr.x > tile.x + tile.width - COMBINED_TILES_TRIGGER_DISTANCE_PX) {
            combinedTile = Tile.combine(combinedTile, tile.relationships.right);
        }

        // Up
        if (tile.relationships.up !== null &&
            tile.relationships.up.monitorIdx === tile.monitorIdx && 
            ptr.y < tile.y + COMBINED_TILES_TRIGGER_DISTANCE_PX) {
            combinedTile = Tile.combine(combinedTile, tile.relationships.up);
        }

        // Down
        if (tile.relationships.down !== null && 
            tile.relationships.down.monitorIdx === tile.monitorIdx && 
            ptr.y > tile.y + tile.height - COMBINED_TILES_TRIGGER_DISTANCE_PX) {
                combinedTile = Tile.combine(combinedTile, tile.relationships.down);
        }

        return combinedTile;
    }

    _openTileLayoutPreview(tileLayer) {
        const tileLayoutPreview = MainExtension.tiles.getTileLayoutPreview(tileLayer);

        // If there is already a tile layout being previewed, and it is not the one for this
        //  layer, close the old one first.
        if (this._tileLayoutPreview !== null && this._tileLayoutPreview !== tileLayoutPreview) {
            this._closeTileLayoutPreview();
        }

        tileLayoutPreview.open();
        this._tileLayoutPreview = tileLayoutPreview;
    }

    _closeTileLayoutPreview() {
        if (this._tileLayoutPreview === null) {
            return;
        }
        this._tileLayoutPreview.close();
        this._tileLayoutPreview = null;
    }
}