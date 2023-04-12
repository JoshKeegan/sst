"use strict";

const { GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

var Mover = class WindowMover {
    static move(window, tile) {
        // If the tile we're moving to has a parent that already has a window tiled to it,
        //  move that other window to the sibling tile.
        if (!tile.combined && tile.parent !== null) {
            const parentTileWindow = this._getTopWindowInTile(tile.parent);
            if (parentTileWindow !== null) {
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

        window.tile = null;

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
                w.tile === tile);
        return window ? window : null;
    }

    static _getSortedWindows() {
        const windows = global.workspace_manager.get_active_workspace().list_windows();
        return global.display.sort_windows_by_stacking(windows).reverse();
    }

    static _move(window, tile) {
        window.tile = tile;

        /* 
            TODO: 
                - Refactor: move elsewhere - not window movement
                - Can this be called on window start, or could it change??
                - Do we want to restore properties when a window floats?
                    * e.g. Firefox picture in picture maintains aspect ratio during resize, won't without aspect hint
                - Can we prevent a window from being resized by a user?
                    * if not, should probably set min size to something small rather than removing entirely, 
                        as currently you can reisze a window to almost nothing
        */

        // Remove size hints that could prevent the window from tiling properly
        // Note that size hints are updated, not removed (e.g. via xprops) because if removed then you
        // need to restart gnome-shell for it to pick up the lack of the property, but changing the value
        // fires an event that is listened for and updates the hints that gnome will apply to the window.
        
        // Window description should be the X window ID, but check it starts with 0x before using it...
        const xid = window.get_description();
        if (xid && xid.startsWith("0x")) {
            log(`Disabling aspect ratio window size hint for x window id: ${xid}`);
            // TODO: There will almost certainly be a better way of getting the extensions directory.
            // The same code is in extension.js so can be deduped if nothing else
            const[ok, stdout, stderr, waitStatus] = GLib.spawn_command_line_sync(
                `${GLib.get_user_data_dir()}/gnome-shell/extensions/sst@joshkeegan.co.uk/tools/bin/xUpdateSizeHints -id ${xid}`);
            if (ok && waitStatus === 0 && stderr.length === 0) {
                log(`Aspect ratio window size hint disabled for x window id ${xid}`);
                log(stdout);
            }
            else {
                // TODO: error "No such property 'WM_NORMAL_HINTS'" is expected as they are optional
                log(`Failed to disable aspect ratio hint for x window id ${xid}.\nstdout: ${stdout}\nstderr: ${stderr}`);
            }
        }
        else {
            log(`Could not get this window's ID with the X server (${window.get_title()})`);
        }

        // TODO: The first move does not fill the space, but moving the window a second time within the same
        // tile will. Needs investigating...
        log(`Moving window "${window.get_title()} to tile x: ${tile.x} y: ${tile.y} width: ${tile.width} height: ${tile.height}`);
        window.move_resize_frame(false, tile.x, tile.y, tile.width, tile.height);
    }
}
