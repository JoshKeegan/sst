
import Clutter from "@girs/clutter-12";
import Gio from "@girs/gio-2.0";
import GLib from "@girs/glib-2.0";

import KeybindHandler from "./keybindHandler";
import TileRelationshipCalculator from "./tileRelationshipCalculator";
import Tiles from "./tiles";
import TiledWindow from "./tiledWindow";
import WindowMover from "./windowMover";
import WindowTileMatcher from "./windowTileMatcher"
import WindowTileable from "./windowTileable";

export default class WindowLifecycle {
    private windowTileable: WindowTileable;
    private tiles: Tiles;
    private keybindHandler: KeybindHandler;
    private settings: {
        tileByDefault: boolean
    };
    private displaySignals: number[] = [];

    constructor(settings: Gio.Settings, windowTileable: WindowTileable, tiles: Tiles, keybindHandler: KeybindHandler) {
        this.windowTileable = windowTileable;
        this.tiles = tiles;
        this.keybindHandler = keybindHandler;
        this.settings = {
            tileByDefault: settings.get_boolean("tile-by-default"),
        };

        this.displaySignals.push(global.display.connect("window_created", 
            (_, window: TiledWindow) => this.onCreated(window)));
        
        tiles.connectLayoutChanged(this.onLayoutChanged.bind(this));

        // Call on layout changed to auto-tile any existing windows (e.g. after a gnome-shell restart)
        this.onLayoutChanged();
    }

    destroy() {
        this.displaySignals.forEach(sId => global.display.disconnect(sId));
    }

    isTilingModeActive(window: TiledWindow) {
        // If floating by default, control tiling entirely based on user-input. Assumes that if the user asks 
        //  for a window to be tiled, they want it tiling regardless of whether we think it should be.
        if (!this.settings.tileByDefault) {
            return this.isTilingKeyPressed();
        }

        // Otherwise tiling is the default, if we think the window should be floated, float it.
        if (!this.windowTileable.isTileable(window)) {
            return false;
        }
        // Window can be tiled, check the user isn't asking for it to be floated
        return !this.isTilingKeyPressed();
    }

    private onCreated(window: TiledWindow) {
        log(`created: ${window.get_title()}`);
        window.tile = null;
        this.autoTile(window);
        window.connect("size-changed", this.onSizeChanged.bind(this, window));

        // Workaroumd for firefox windows not starting with focus when started via the "firefox --new-window" command.
        // https://support.mozilla.org/en-US/questions/1411745
        // This affects the launch web browser keybind, so worth having a fix here.
        if (window.get_wm_class()?.toLowerCase() === "firefox" && !window.has_focus()) {
            log(`Focussing new Firefox window "${window.title}"`);
            window.focus(0);
            window.raise();
        }
    }

    private onSizeChanged(window: TiledWindow) {
        const wRect = window.get_frame_rect();
        log(`window "${window.get_title()}" size changed to ${wRect.width}x${wRect.height}`);

        if (window.tile !== null && (window.tile.width !== wRect.width || window.tile.height !== wRect.height)) {
            log(`window "${window.get_title()}" is tiled so should not have been resized. Changing back to ${window.tile.width}x${window.tile.height} (deferred)`);

            GLib.timeout_add(GLib.PRIORITY_HIGH, 0, () => {
                const wRect = window.get_frame_rect();
                // Window could have been resized, or re-tiled in the (tiny) delay between the context switch, so check again
                if (window.tile !== null && (window.tile.width !== wRect.width || window.tile.height !== wRect.height)) {
                    log(`executing deferred resize "${window.get_title()}" to ${window.tile}`);
                    WindowMover.moveWithoutUpdatingOtherTiles(window, window.tile);
                } 
                else {
                    log(`cancelling deferred resize of "${window.get_title()}", it has already been moved into its tile`);
                }                
                return false;
            });
        }
    }

    private onLayoutChanged() {
        log("layout changed");
        
        // Auto-tile all windows on each workspace
        const numWorkspaces = global.workspace_manager.get_n_workspaces();
        for (let i = 0; i < numWorkspaces; i++) {
            const ws = global.workspace_manager.get_workspace_by_index(i);
            if (ws !== null) {
                ws.list_windows().forEach(metaWindow => {
                    const window = metaWindow as TiledWindow;
                    window.tile = null;
                    this.autoTile(window);
                });
            }
        }
    }

    /**
     * Auto-tile a window.
     * 
     * Auto-tiles the window to the tile that its center is within (allows for some movement, 
     * it to have been sub-tiled etc... whilst still generally putting it in a reasonable position).
     * This works because windows generally re-open in their previous position(ish).
     */
    private autoTile(window: TiledWindow) {
        // If tile by default is off, or the window's fixed properties (ones that cannot be updated by the app async) 
        //  mean it cannot be tiled then this window will never get auto-tiled.
        if (!this.settings.tileByDefault || !this.windowTileable.isTileableFixedProps(window)) {
            return;
        }

        const rectToString = (r: Rect) => `x: ${r.x}\ty: ${r.y}\twidth: ${r.width}\theight: ${r.height}`;
        log(`Initial rect\t${rectToString(window.get_frame_rect())} for "${window.get_title()}"`);

        // If the window is tileable right now, tile it. If the window moves itself async, we will need to re-tile it though.
        if (this.windowTileable.isTileable(window)) {
            const tile = this.autoTileSelectTile(window);
            if (tile !== null) {
                log(`No delay auto-tiling "${window.get_title()}" to ${tile}`);
                WindowMover.move(window, tile);
            }
            else {
                log(`Unable to find a tile to auto-tile window "${window.get_title()}" to`);
            }

            // Bug #29: unhandled edge case, e.g. Firefox about window opens with title "Firefox", then changes to 
            // "About Mozilla Firefox".
            // If a window appears tileable when opened, it will hit this block of code & auto-tile.
            // If after an async update it should not be tiled (e.g. window title changes to match a
            // floating rule) then it will still have been tiled by this initial tiling, even if the
            // later auto-tiling skips it.
            // If there's ever an example of an app like this, then we'd need to handle it by storing 
            // the original rect & the rect we tiled it to. Then later when we find it should float, 
            // check whether its current rect still matches the one we initially auto-tiled to & if so
            // move it back to its original floating rect.
        }

        // Auto-tile on the window moving itself async (many apps will open a window, then async set its position).
        // This is only to handle async updates immediately following a window being opened, so gets 
        // cancelled after a small delay.
        let posChangedSignal = window.connect("position-changed", w => {
            log(`pos changed: ${rectToString(w.get_frame_rect())}`);
            if (!this.windowTileable.isTileable(window)) {
                log(`Window "${window.get_title()}" is not auto-tileable`)
                WindowMover.leave(window, window.tile);
                return;
            }
            const tile = this.autoTileSelectTile(window);
            if (tile !== null) {
                log(`Auto-tiling "${window.get_title()}" to ${tile} (deferred)`);
            
                GLib.timeout_add(GLib.PRIORITY_HIGH, 0, () => {
                    log(`executing deferred auto-tile of "${window.get_title()}" to ${tile}`);
                    WindowMover.leave(window, window.tile);
                    WindowMover.move(window, tile);
                    return false;
                });
            }
            else {
                log(`Unable to find a tile to auto-tile window "${window.get_title()}" to`);
            }
        });

        // After a small delay, clear the position changed event handler
        const windowId = window.get_id();
        GLib.timeout_add(GLib.PRIORITY_LOW, 500, () => {
            window.disconnect(posChangedSignal);

            // Check if the window has already been closed. 
            // Trying to use window object when the window no longer exists crashes Mutter.
            if (!this.isWindowOpen(windowId)) {
                log("Window closed before auto-tile delay fired");
                return false;
            }

            log(`Post-delay rect\t${rectToString(window.get_frame_rect())}`);

            // Make a final check for whether the window should be auto-tiled. This is to catch any windows
            // that have made async updates (other than position updates) that will make them tileable, but were 
            // not initially tiled (e.g. changing title and the initial value matched a floating rule).
            // 99.9% of windows should be handled by this point. The delay between window open & auto-tile
            // is not a pleasant UX, but it is here to ensure all windows get handled. Anything relying on this
            // should be looked into as there may be other events we can listen to (e.g. window resize) to trigger 
            // the auto-tile earlier.
            if (!this.windowTileable.isTileable(window)) {
                log(`Window "${window.get_title()}" is not auto-tileable`)
                WindowMover.leave(window, window.tile);
                return false;
            }
            const tile = this.autoTileSelectTile(window);
            if (tile === null) {
                log(`Unable to find a tile to auto-tile window "${window.get_title()}" to`);
                return false;
            }
            log(`Auto-tiling "${window.get_title()}" to ${tile}`);
            WindowMover.leave(window, window.tile);
            WindowMover.move(window, tile);
            
            return false;
        });
    }

    private autoTileSelectTile(window: TiledWindow) {
        const wRect = window.get_frame_rect();

        // First see if the window matches a tile (any layer)
        // This is mainly to handle gnome-shell restarts
        const tile = WindowTileMatcher.matchTile(this.tiles.all, wRect);
        if (tile !== null) {
            return tile;
        }

        // If not, find the closest tile on the top layer & put it there
        return TileRelationshipCalculator.findClosest(this.tiles.getAllTiles(0), wRect);
    }

    private isTilingKeyPressed() {
        // TODO: Make key configurable
        return this.keybindHandler.isModKeyPressed(Clutter.ModifierType.CONTROL_MASK);
    }

    private isWindowOpen(windowId: number) {
        const windows = global.workspace_manager.get_active_workspace().list_windows();
        for (let i = 0; i < windows.length; i++) {
            if (windows[i].get_id() === windowId) {
                return true;
            }
        }
        return false;
    }
}
