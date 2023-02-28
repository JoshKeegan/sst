"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const WindowTileMatcher = Me.imports.windowTileMatcher.Matcher;

var Mover = class WindowMover {
    static move(window, tile) {
        // If the tile we're moving to has a parent that already has a window tiled to it,
        //  move that other window to the sibling tile.
        if (!tile.combined && tile.parent !== null) {
            const parentTileWindow = this._getTopWindowInTile(tile.parent);
            if(parentTileWindow !== null) {
                this._move(parentTileWindow, tile.sibling);
            }
        }        

        this._move(window, tile);
    }

    static leave(window, tile) {
        // If the window was floating, do nothing
        if (tile === null) {
            return;
        }

        // If the tile we're leaving has no other window that will be on top of this tile
        //  once we leave it, and there's a sibling tile with a window in it, then that sibling's
        //  window can be moved to the parent.
        if (tile.parent !== null && this._getTopWindowInTile(tile, window) === null) {
            const siblingWindow = this._getTopWindowInTile(tile.sibling);
            if (siblingWindow !== null) {
                this.move(siblingWindow, tile.parent);
            }
        }
    }

    static _getTopWindowInTile(tile, excludeWindow = undefined) {
        // Note: In addition to .minimized there is .showing_on_its_workspace()
        //  I don't currently see a reason for the additional checks in this use-case,
        //  but if bugs pop up here, it's worth re-reading
        const window = this._getSortedWindows().find(
            w => w !== excludeWindow &&
                !w.minimized && 
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