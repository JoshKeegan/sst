"use strict";

const {windowManager} = imports.ui;
const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const Tile = Me.imports.tile.Tile;
const GNOME_VERSION = parseFloat(imports.misc.config.PACKAGE_VERSION);

const COMBINED_TILES_TRIGGER_DISTANCE_PX = 30;

var Handler = class MoveHandler {
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

        this._tilePreview = new windowManager.TilePreview();

        // metaRect, which the grabbed window will tile to
        this._tileRect = null;
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
        (GNOME_VERSION < 3.36 ? this._tilePreview.actor : this._tilePreview).destroy();
        this._tilePreview = null;
    }

    _onMoveStarted(window, grabOp) {
        log("sst: move started");

        this._posChangedId = window.connect("position-changed"
            , this._onMoving.bind(this, grabOp, window));
    }

    _onMoveFinished(window) {
        log("sst: moved finished");

        if (this._posChangedId) {
            window.disconnect(this._posChangedId);
            this._posChangedId = 0;
        }

        if (this._isMouseSnapKeyPressed()) {
            this._moveWindow(window, this._tileRect);
        }

        this._tilePreview.close();
        this._tileRect = null;
    }

    _onMoving(grabOp, window) {
        let active = this._isMouseSnapKeyPressed();

        if (active) {
            this._draw(grabOp, window);
        }
        else if (this._lastActive) {
            this._undraw();
        }
        this._lastActive = active;
    }

    _isMouseSnapKeyPressed() {
        // TODO: Make key configurable
        const modMask = Clutter.ModifierType.CONTROL_MASK;

        const event = Clutter.get_current_event();
        const modifiers = event ? event.get_state() : 0;
        return (modifiers & modMask) !== 0;
    }

    _draw(grabOp, window) {
        const monitorIdx = global.display.get_current_monitor();
        const tiles = MainExtension.tiles.getTiles(monitorIdx);
        // TODO: Would be nice to display all possible tiles (perhaps even on all monitors)
        //  separate to the tile preview

        const pointer = global.get_pointer();
        const tRect = this._selectTileArea(tiles, pointer[0], pointer[1]);

        if (!tRect || !this._tileRect || !tRect.equal(this._tileRect)) {
            // If we already have another tile selected (window is being dragged), we have to close the existing one before
            //  opening a new preview. Also delay showing the next preview, if we reuse the tile preview whilst the last one is 
            //  still animating away then it won't be shown.
            if (this._tileRect !== null) {
                this._tilePreview.close();
                GLib.timeout_add(GLib.PRIORITY_HIGH, 250, () => this._tilePreview.open(window, tRect, monitorIdx));
            }
            else {
                this._tilePreview.open(window, tRect, monitorIdx);
            }
            this._tileRect = tRect;
        }
    }

    _undraw() {
        this._tilePreview.close();
        this._tileRect = null;
    }

    _selectTileArea(tiles, xPtr, yPtr) {
        const tile = tiles.find(t => 
            t.x <= xPtr && 
            t.x + t.width > xPtr &&
            t.y <= yPtr &&
            t.y + t.height > yPtr);
        
        // Combined tiling feature: if close to an edge of the tile, the target area 
        //  can be combined with the adjacent tile, if both tiles are on the same monitor.
        // Note that there's no check for tiles to be actually adjacent, the closest tile
        //  is used to allow for small gaps to be left between tiles if someone wanted to 
        //  leave borders.
        let combinedTile = tile;

        // Left
        if (tile.relationships.left !== null && 
            tile.relationships.left.monitorIdx === tile.monitorIdx &&
            xPtr < tile.x + COMBINED_TILES_TRIGGER_DISTANCE_PX) {
            combinedTile = Tile.combine(combinedTile, tile.relationships.left);
        }

        // Right
        if (tile.relationships.right !== null && 
            tile.relationships.right.monitorIdx === tile.monitorIdx &&
            xPtr > tile.x + tile.width - COMBINED_TILES_TRIGGER_DISTANCE_PX) {
            combinedTile = Tile.combine(combinedTile, tile.relationships.right);
        }

        // Up
        if (tile.relationships.up !== null &&
            tile.relationships.up.monitorIdx === tile.monitorIdx && 
            yPtr < tile.y + COMBINED_TILES_TRIGGER_DISTANCE_PX) {
            combinedTile = Tile.combine(combinedTile, tile.relationships.up);
        }

        // Down
        if (tile.relationships.down !== null && 
            tile.relationships.down.monitorIdx === tile.monitorIdx && 
            yPtr > tile.y + tile.height - COMBINED_TILES_TRIGGER_DISTANCE_PX) {
                combinedTile = Tile.combine(combinedTile, tile.relationships.down);
        }

        return combinedTile;
    }

    _moveWindow(window, rect) {
        window.move_resize_frame(false, rect.x, rect.y, rect.width, rect.height);
    }
}