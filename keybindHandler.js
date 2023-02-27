"use strict";

const {main} = imports.ui;
const {Gio, Meta, Shell} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;
const WindowMover = Me.imports.windowMover.Mover;

const tileMoveKeys = function(){
    let keys = [];
    for (let i = 0; i < 3; i++) {
        keys[`tile-move-up-layer-${i}`] = {
            nextTileSelector: t => t.relationships.up,
            floatingTileSelector: TileRelationshipCalculator.findUp,
            tileLayer: i,
        };
        keys[`tile-move-down-layer-${i}`] = {
            nextTileSelector: t => t.relationships.down,
            floatingTileSelector: TileRelationshipCalculator.findDown,
            tileLayer: i,
        };
        keys[`tile-move-left-layer-${i}`] = {
            nextTileSelector: t => t.relationships.left,
            floatingTileSelector: TileRelationshipCalculator.findLeft,
            tileLayer: i,
        };
        keys[`tile-move-right-layer-${i}`] = {
            nextTileSelector: t => t.relationships.right,
            floatingTileSelector: TileRelationshipCalculator.findRight,
            tileLayer: i,
        };
    }
    return keys;
}();

var Handler = class KeybindHandler {
    constructor() {
        for (const settingName in tileMoveKeys) {
            const handlers = tileMoveKeys[settingName];
            main.wm.addKeybinding(settingName, 
                MainExtension.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                this._onTileMoveKeyPressed.bind(
                    this, 
                    settingName, 
                    handlers.nextTileSelector, 
                    handlers.floatingTileSelector, 
                    handlers.tileLayer))
        }
    }

    destroy() {
        for (const settingName in tileMoveKeys) {
            main.wm.removeKeybinding(settingName);
        }
    }

    _onTileMoveKeyPressed(settingName, nextTileSelector, floatingTileSelector, tileLayer) {
        log("Pressed " + settingName);

        const window = global.display.focus_window;
        if (!window)
        {
            return;
        }

        // Special case: if moving down and the window is fullscreen, then come out of fullscreen
        if (settingName.startsWith("tile-move-down-") && window.is_fullscreen()) {
            window.unmake_fullscreen();
            return;
        }

        const tiles = MainExtension.tiles.getAllTiles(tileLayer);

        // If the current window exactly matches a tile then move relative to that tile
        const wRect = window.get_frame_rect();
        const currentTile = this._selectCurrentTile(tiles, wRect);
        let targetTile = null;
        if (currentTile !== null) {
            log(`Currently in tile, moving ${settingName} relative to it`);
            targetTile = nextTileSelector(currentTile);

            // Special case: if moving up but there is no tile above this one, go fullscreen
            if (settingName.startsWith("tile-move-up-") && targetTile === null) {
                window.make_fullscreen();
                return;
            }
        }
        // Else the window is floating
        else {
            log(`Window is floating, searching for best tile ${settingName}`);
            // Find the closest tile in the direction we want to move in
            targetTile = floatingTileSelector(tiles, wRect);

            // If there is no tile in that direction, find the tile with the largest intersection area
            if (targetTile === null) {
                log(`No tile in target direction ${settingName}, using tile with the largest intersection area`);
                targetTile = TileRelationshipCalculator.findLargestIntersection(tiles, wRect);
            }

            // If the window does not intersect a tile, find the closest one
            if (targetTile === null) {
                log("Floating window intersects no tiles, using closest one");
                targetTile = TileRelationshipCalculator.findClosest(tiles, wRect);
            }
        }

        if (targetTile !== null) {
            WindowMover.move(window, targetTile);
        }
        else {
            log(`No target for movement ${settingName} found, not moving window`);
        }
    }

    /**
     * Finds which tile the window is tiled to. Returns null if floating/not tiled
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param wRect rectangle of the current window
     */
    _selectCurrentTile(tiles, wRect) {
        log(`window x: ${wRect.x} y: ${wRect.y} w: ${wRect.width} h: ${wRect.height}`);
        log(`tile x: ${tiles[0].x} y: ${tiles[0].y} w: ${tiles[0].width} h: ${tiles[0].height}`);

        const FUZZY_DIMS_MULT = 0.98;
        const tile = tiles.find(t =>
            t.x === wRect.x &&
            t.y === wRect.y &&
            // Fuzzy match dimensions as some windows (e.g. terminal) slightly undersize themselves
            t.width >= wRect.width && 
            t.width * FUZZY_DIMS_MULT < wRect.width &&
            t.height >= wRect.height &&
            t.height * FUZZY_DIMS_MULT < wRect.height);
        return tile ? tile : null;
    }
};