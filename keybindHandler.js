"use strict";

const {main} = imports.ui;
const {Gio, Meta, Shell} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;

const tileMoveKeys = {
    "tile-move-up": {
        nextTileSelector: t => t.relationships.up,
        floatingTileSelector: TileRelationshipCalculator.findUp,
    },
    "tile-move-down": {
        nextTileSelector: t => t.relationships.down,
        floatingTileSelector: TileRelationshipCalculator.findDown,
    },
    "tile-move-left": {
        nextTileSelector: t => t.relationships.left,
        floatingTileSelector: TileRelationshipCalculator.findLeft,
    },
    "tile-move-right": {
        nextTileSelector: t => t.relationships.right,
        floatingTileSelector: TileRelationshipCalculator.findRight,
    }
};

var Handler = class KeybindHandler {
    constructor() {
        for (const settingName in tileMoveKeys) {
            const handlers = tileMoveKeys[settingName];
            main.wm.addKeybinding(settingName, 
                MainExtension.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                this._onTileMoveKeyPressed.bind(this, settingName, handlers.nextTileSelector, handlers.floatingTileSelector))
        }
    }

    destroy() {
        for (const settingName in tileMoveKeys) {
            main.wm.removeKeybinding(settingName);
        }
    }

    _onTileMoveKeyPressed(settingName, nextTileSelector, floatingTileSelector) {
        log("Pressed " + settingName);

        const window = global.display.focus_window;
        if (!window)
        {
            return;
        }

        // Special case: if moving down and the window is fullscreen, then come out of fullscreen
        if (settingName === "tile-move-down" && window.is_fullscreen()) {
            window.unmake_fullscreen();
            return;
        }

        // TODO: Tile layers
        const tiles = MainExtension.tiles.getAllTiles(0);

        // If the current window exactly matches a tile then move relative to that tile
        const wRect = window.get_frame_rect();
        const currentTile = this._selectCurrentTile(tiles, wRect);
        let targetRect = null;
        if (currentTile !== null) {
            targetRect = nextTileSelector(currentTile);

            // Special case: if moving up but there is no tile above this one, go fullscreen
            if (settingName === "tile-move-up" && targetRect === null) {
                window.make_fullscreen();
                return;
            }
        }
        // Else the window is floating
        else {
            // Find the closest tile in the direction we want to move in
            targetRect = floatingTileSelector(tiles, wRect);

            // If there is no tile in that direction, find the tile closest to the centre of the window
            if (targetRect === null) {
                // TODO
                targetRect = tiles[0];
            }
        }

        this._moveWindow(window, targetRect);
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

    // TODO: DRY: moveHandler.js
    _moveWindow(window, rect) {
        window.move_resize_frame(false, rect.x, rect.y, rect.width, rect.height);
    }
};