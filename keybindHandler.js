"use strict";

const {main} = imports.ui;
const {Gio, Meta, Shell} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;

const tileMoveKeys = {
    "tile-move-up": t => t.relationships.up,
    "tile-move-down": t => t.relationships.down,
    "tile-move-left": t => t.relationships.left,
    "tile-move-right": t => t.relationships.right,
};

var Handler = class KeybindHandler {
    constructor() {
        for (const settingName in tileMoveKeys) {
            main.wm.addKeybinding(settingName, 
                MainExtension.settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                this._onTileMoveKeyPressed.bind(this, settingName, tileMoveKeys[settingName]))
        }
    }

    destroy() {
        for (const settingName in tileMoveKeys) {
            main.wm.removeKeybinding(settingName);
        }
    }

    _onTileMoveKeyPressed(settingName, nextTileSelector) {
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
        const currentTile = this._selectCurrentTile(tiles, window);
        let targetRect = null;
        if (currentTile !== null) {
            targetRect = nextTileSelector(currentTile);

            // Special case: if moving up but there is no tile above this one, go fullscreen
            if (settingName === "tile-move-up" && targetRect === null) {
                window.make_fullscreen();
                return;
            }
        }
        // TODO: Else select the tile closest to the centre of the current window & move the window there
        else {
            targetRect = tiles[0];
        }

        this._moveWindow(window, targetRect);
    }

    /**
     * Finds which tile the window is tiled to. Returns null if floating/not tiled
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param window 
     */
    _selectCurrentTile(tiles, window) {
        const wRect = window.get_frame_rect();
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