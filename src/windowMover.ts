import GLib from "@girs/glib-2.0";

import Tile from "./tile"
import TiledWindow from "./tiledWindow";

const decoder = new TextDecoder();

export default class WindowMover {
    static move(window: TiledWindow, tile: Tile) {
        // If the tile we're moving to has a parent that already has a window tiled to it,
        //  move that other window to the sibling tile.
        if (!tile.combined && tile.parent !== null && tile.sibling !== null) {
            const parentTileWindow = this.getTopWindowInTile(tile.parent);
            if (parentTileWindow !== null) {
                this.moveWithoutUpdatingOtherTiles(parentTileWindow, tile.sibling);
            }
        }

        this.moveWithoutUpdatingOtherTiles(window, tile);
    }

    /**
     * Moves window to tile without updating any other tiles.
     * Should only be used when we know we do not want to alter other tiles, e.g. when returning
     * a window to its tile after exiting fullscreen, or snapping it back to its tile after the app
     * resized it. 
     * Most callers should use move(window, tile) instead.
     */
    static moveWithoutUpdatingOtherTiles(window: TiledWindow, tile: Tile) {
        window.tile = tile;

        /* 
            TODO: 
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
        // Note: these are applied on every window movement, as some applications (e.g. gnome-terminal) will 
        //  re-set them assuming that they are solely in control of the size hints, ignoring our changes.
        const xid = WindowMover.getXWindowID(window);
        if (xid !== null) {
            log(`Disabling aspect ratio window size hint for x window id: ${xid}`);
            // TODO: There will almost certainly be a better way of getting the extensions directory.
            // The same code is in config.ts so can be deduped if nothing else
            const[ok, rawStdout, rawStderr, waitStatus] = GLib.spawn_command_line_sync(
                `${GLib.get_user_data_dir()}/gnome-shell/extensions/sst@joshkeegan.co.uk/xUpdateSizeHints -id ${xid}`);
            const stdout = decoder.decode(rawStdout);
            const stderr = decoder.decode(rawStderr);
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
        log(`Moving window "${window.get_title()}" to tile x: ${tile.x} y: ${tile.y} width: ${tile.width} height: ${tile.height}`);
        window.move_resize_frame(false, tile.x, tile.y, tile.width, tile.height);
    }

    private static getXWindowID(window: TiledWindow) : string | null {
        // Window description used to be the X window ID. At some point <=GNOME 47 the window title got added to it.
        // Check it starts with 0x before using it...
        const desc = window.get_description();
        if (desc && desc.startsWith("0x")) {
            // If it doesn't contain a space, it's just the ID
            const spaceIdx = desc.indexOf(' ');
            if (spaceIdx === -1) {
                return desc;
            }
            // Otherwise, the first part of the string is the ID
            return desc.substring(0, spaceIdx);
        }
        return null;
    }

    static leave(window: TiledWindow, tile: Tile | null) {
        // If the window was floating, do nothing
        if (tile === null) {
            return;
        }

        window.tile = null;

        // If the tile we're leaving has no other window that will be on top of this tile
        //  once we leave it, and there's a sibling tile with a window in it, then that sibling's
        //  window can be moved to the parent.
        if (tile.parent !== null && tile.sibling !== null && this.getTopWindowInTile(tile, window) === null) {
            const siblingWindow = this.getTopWindowInTile(tile.sibling);
            if (siblingWindow !== null) {
                this.move(siblingWindow, tile.parent);
            }
        }
    }

    private static getTopWindowInTile(tile: Tile, excludeWindow: TiledWindow | undefined = undefined) {
        // Note: In addition to .minimized there is .showing_on_its_workspace()
        //  I don't currently see a reason for the additional checks in this use-case,
        //  but if bugs pop up here, it's worth re-reading
        const window = this.getSortedWindows().find(
            w => w !== excludeWindow &&
                !w.minimized && 
                w.tile === tile);
        return window ? window : null;
    }

    private static getSortedWindows() {
        const windows = global.workspace_manager.get_active_workspace().list_windows();
        const sorted = global.display.sort_windows_by_stacking(windows).reverse();
        return sorted as TiledWindow[];
    }
}
