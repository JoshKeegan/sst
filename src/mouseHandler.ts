import Meta from "@girs/meta-12";

import Geometry from "./geometry";
import KeybindHandler from "./keybindHandler";
import Tile from "./tile";
import TiledWindow from "./tiledWindow";
import TileLayoutPreview from "./tileLayoutPreview";
import Tiles from "./tiles";
import WindowLifecycle from "./windowLifecycle";
import WindowMover from "./windowMover";


const {windowManager} = imports.ui;

const COMBINED_TILES_TRIGGER_DISTANCE_PX = 30;
const GNOME_VERSION = parseFloat(imports.misc.config.PACKAGE_VERSION);

// Use values rather than constants e.g. CLUTTER_MOD5_MASK as they aren't all defined
// in older versions.
const TILING_LAYER_KEY_MASKS = [
    1 << 3, // Left Alt
    1 << 7, // Right Alt
    1 << 6, // Super (left or right)
];

function wrapGrabOpCallback(callback: (window: TiledWindow, grabOp: Meta.GrabOp) => void) {
    return (...params: any[]) => {
        // pre GNOME 40 the signal emitter was added as the first and second param, fixed with !1734 in mutter
        let [window, grabOp] = [params[params.length - 2], params[params.length - 1]];
        callback(window as TiledWindow, grabOp as Meta.GrabOp);
    };
}

export default class MouseHandler {
    private windowLifecycle: WindowLifecycle;
    private tiles: Tiles;
    private keybindHandler: KeybindHandler;
    private _displaySignals: number[] = [];
    private _posChangedId = 0;
    private _lastActive = false;
    private _tileLayoutPreview: TileLayoutPreview | null = null;
    private _tilePreview = new windowManager.TilePreview();
    private _tile: Tile | null = null;

    constructor(windowLifecycle: WindowLifecycle, tiles: Tiles, keybindHandler: KeybindHandler) {
        this.windowLifecycle = windowLifecycle;
        this.tiles = tiles;
        this.keybindHandler = keybindHandler;

        const isMoving = (grabOp: Meta.GrabOp) => 
            [Meta.GrabOp.MOVING, Meta.GrabOp.KEYBOARD_MOVING].includes(grabOp);

        this._displaySignals.push(global.display.connect("grab-op-begin", wrapGrabOpCallback((window, grabOp) => {
            if (window !== null && isMoving(grabOp)) {
                this._onMoveStarted(window);
            }
        })));
        this._displaySignals.push(global.display.connect("grab-op-end", wrapGrabOpCallback((window, grabOp) => {
            if (window !== null && isMoving(grabOp)) {
                this._onMoveFinished(window);
            }
        })));
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
        this._tilePreview.destroy();
        this._tilePreview = null;
    }

    _onMoveStarted(window: TiledWindow) {
        log("sst: move started");

        this._posChangedId = window.connect("position-changed",
            this._onMoving.bind(this, window));
        
        // Behaviour on leaving a tile
        WindowMover.leave(window, window.tile);
    }

    _onMoveFinished(window: TiledWindow) {
        log("sst: moved finished");

        if (this._posChangedId) {
            window.disconnect(this._posChangedId);
            this._posChangedId = 0;
        }

        if (this._tile !== null && this.windowLifecycle.isTilingModeActive(window)) {
            WindowMover.move(window, this._tile);
        }

        this._closeTileLayoutPreview();

        this._tilePreview.close();
        this._tile = null;
    }

    _onMoving(window: TiledWindow) {
        let active = this.windowLifecycle.isTilingModeActive(window);

        if (active) {
            this._draw(window, this._getTilingLayer());
        }
        else if (this._lastActive) {
            this._closeTileLayoutPreview();

            this._undraw();
        }
        this._lastActive = active;
    }

    _getTilingLayer() {
        let layer = 0;
        for (let i = 0; i < TILING_LAYER_KEY_MASKS.length && layer < this.tiles.numLayers - 1; i++) {
            if (this.keybindHandler.isModKeyPressed(TILING_LAYER_KEY_MASKS[i])) {
                layer++;
            }
        }
        return layer;
    }

    _draw(window: TiledWindow, tileLayer: number) {
        this._openTileLayoutPreview(tileLayer);

        // Calculate the tile the window will move to
        const monitorIdx = global.display.get_current_monitor();
        const tiles = this.tiles.getTiles(tileLayer, monitorIdx);
        const pointer = global.get_pointer();
        const tile = this._selectTile(tiles, { x: pointer[0], y: pointer[1] });

        // If the window wouldn't currently get tiled, close the preview
        if (tile === null) {
            this._undraw();
            return;
        }

        // Draw the preview of the tile the window will move to
        if (!this._tile || !tile.rect.equal(this._tile.rect)) {
            this._tilePreview.open(window, tile.rect, monitorIdx);
            this._tile = tile;
        }
    }

    _undraw() {
        this._tilePreview.close();
        this._tile = null;
    }

    _selectTile(tiles: Tile[], ptr: Point) {
        const tile = tiles.find(t =>  Geometry.contains(t, ptr));
        if (tile === undefined) {
            return null;
        }
        
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

    _openTileLayoutPreview(tileLayer: number) {
        const tileLayoutPreview = this.tiles.getTileLayoutPreview(tileLayer);

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
