"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const WindowTileMatcher = Me.imports.windowTileMatcher.Matcher;

var Mover = class WindowMover {
    static move(window, tile) {
        // If the tile we're moving to has a parent that already has a window tiled to it,
        //  move that other window to the sibling tile.
        if (tile.parent !== null) {
            const parentTileWindow = this._getTopWindowInTile(tile.parent);
            if(parentTileWindow !== null) {
                const siblingTile = tile.parent.children.find(t => t !== tile);
                this._move(parentTileWindow, siblingTile);
            }
        }        

        this._move(window, tile);
    }

    static _getTopWindowInTile(tile) {
        // Note: In addition to .minimized there is .showing_on_its_workspace()
        //  I don't currently see a reason for the additional checks in this use-case,
        //  but if bugs pop up here, it's worth re-reading
        const window = this._getSortedWindows().find(
            w => !w.minimized && 
            WindowTileMatcher.isWindowInTile(tile, w.get_frame_rect()));
        return window ? window : null;
    }

    static _getSortedWindows() {
        const windows = global.workspace_manager.get_active_workspace().list_windows();
        return global.display.sort_windows_by_stacking(windows).reverse();
    }

    static _move(window, tile) {
        window.move_resize_frame(false, tile.x, tile.y, tile.width, tile.height);
    }
}