"use strict";

const {windowManager} = imports.ui;
const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const Tile = Me.imports.tile.Tile;
const Geometry = Me.imports.geometry.Geometry;
const WindowMover = Me.imports.windowMover.Mover;
const GNOME_VERSION = parseFloat(imports.misc.config.PACKAGE_VERSION);

const COMBINED_TILES_TRIGGER_DISTANCE_PX = 30;

// Use values rather than constants e.g. CLUTTER_MOD5_MASK as they aren't all defined
// in older versions.
const TILING_LAYER_KEY_MASKS = [
    1 << 3, // Left Alt
    1 << 7, // Right Alt
    1 << 6, // Super (left or right)
];

var Handler = class MouseHandler {
    constructor() {
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

        // Tile (composed of rect:Meta.Rectangle which can be passed to gnome-shell), which the grabbed window will tile to
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
            this._onMoving.bind(this, window, grabOp));
        
        // Behaviour on leaving a tile
        WindowMover.leave(window, window.tile);

        // Edge case: a window can start & finish being moved without ever moving if you grab the window
        // and then let go without moving the mouse. Fire _onMoving as soon as the window is grabbed, 
        // to ensure state per-movement gets updated.
        this._onMoving(window, grabOp);
    }

    _onMoveFinished(window) {
        log("sst: moved finished");

        if (this._posChangedId) {
            window.disconnect(this._posChangedId);
            this._posChangedId = 0;
        }

        if (MainExtension.windowLifecycle.isTilingModeActive(window)) {
            WindowMover.move(window, this._tile);
        }

        this._closeTileLayoutPreview();

        this._tilePreview.close();
        this._tile = null;
    }

    _onMoving(window, grabOp) {
        let active = MainExtension.windowLifecycle.isTilingModeActive(window);

        if (active) {
            this._draw(window, grabOp, this._getTilingLayer());
        }
        else if (this._lastActive) {
            this._closeTileLayoutPreview();

            this._undraw();
        }
        this._lastActive = active;
    }

    _getTilingLayer() {
        let layer = 0;
        for (let i = 0; i < TILING_LAYER_KEY_MASKS.length && layer < MainExtension.tiles.numLayers - 1; i++) {
            if (MainExtension.keybindHandler.isModKeyPressed(TILING_LAYER_KEY_MASKS[i])) {
                layer++;
            }
        }
        return layer;
    }

    _draw(window, grabOp, tileLayer) {
        this._openTileLayoutPreview(tileLayer);

        // Calculate the tile the window will move to
        const monitorIdx = global.display.get_current_monitor();
        const tiles = MainExtension.tiles.getTiles(tileLayer, monitorIdx);
        const pointer = global.get_pointer();
        const tile = this._selectTile(tiles, { x: pointer[0], y: pointer[1] });

        // Draw the preview of the tile the window will move to
        if (!tile || !this._tile || !tile.rect.equal(this._tile.rect)) {
            this._tilePreview.open(window, tile.rect, monitorIdx);
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