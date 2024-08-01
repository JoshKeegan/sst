import Clutter from "@girs/clutter-12";
import Gio from "@girs/gio-2.0"
import Meta from "@girs/meta-12"
import Shell from "@girs/shell-12"

import * as Main from "resource:///org/gnome/shell/ui/main.js";

import Tile from "./tile";
import TiledWindow from "./tiledWindow";
import Tiles from "./tiles";
import TileRelationshipCalculator from "./tileRelationshipCalculator";
import WindowMover from "./windowMover";

interface TileMoveKey {
    nextTileSelector: (t: Tile) => Tile | null,
    floatingTileSelector: (tiles: Tile[], rect: Rect) => Tile | null,
    tileLayer: number,
}

const tileMoveKeys = function(){
    const keys = new Map<string, TileMoveKey>();
    for (let i = 0; i < 3; i++) {
        keys.set(`tile-move-up-layer-${i}`, {
            nextTileSelector: t => t.relationships.up,
            floatingTileSelector: TileRelationshipCalculator.findUp,
            tileLayer: i,
        });
        keys.set(`tile-move-down-layer-${i}`, {
            nextTileSelector: t => t.relationships.down,
            floatingTileSelector: TileRelationshipCalculator.findDown,
            tileLayer: i,
        });
        keys.set(`tile-move-left-layer-${i}`, {
            nextTileSelector: t => t.relationships.left,
            floatingTileSelector: TileRelationshipCalculator.findLeft,
            tileLayer: i,
        });
        keys.set(`tile-move-right-layer-${i}`, {
            nextTileSelector: t => t.relationships.right,
            floatingTileSelector: TileRelationshipCalculator.findRight,
            tileLayer: i,
        });
    }
    return keys;
}();

export default class KeybindHandler {
    private launchKeybinds: string[];
    private tiles: Tiles;

    constructor(getSettings: (schema?: string) => Gio.Settings, tiles: Tiles) {
        this.tiles = tiles;

        const settings = getSettings();

        const defaultTerminalSettings = getSettings("org.gnome.desktop.default-applications.terminal");
        const execTerminal = defaultTerminalSettings.get_string("exec") ?? "gnome-terminal";

        for (const [settingName, movement] of tileMoveKeys) {
            Main.wm.addKeybinding(settingName, 
                settings,
                Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                this.onTileMoveKeyPressed.bind(
                    this, 
                    settingName, 
                    movement));
        }
        Main.wm.addKeybinding("new-window",
            settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL,
                this.onNewWindowKeyPressed.bind(this));

        this.launchKeybinds = [];
        this.addLaunchKeybinding("launch-term", settings, execTerminal, false);
        this.addLaunchKeybinding("launch-calc", settings, "gnome-calculator", false);
        this.addLaunchKeybinding("launch-resource-monitor", settings,
            () => settings.get_string("resource-monitor-cmd") ?? "gnome-system-monitor",
            () => settings.get_boolean("resource-monitor-needs-terminal"));
        this.addLaunchKeybinding("launch-files", settings, "nautilus", false);
        this.addLaunchKeybinding("launch-web-browser", settings, "xdg-open http://", false);
    }
    
    private addLaunchKeybinding(settingName: string, settings: Gio.Settings, 
        cmd: string | (() => string), 
        needsTerminal: boolean | (() => boolean)
        ) {
        this.launchKeybinds.push(settingName);
        Main.wm.addKeybinding(settingName,
            settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => {
                    // If params can be functions. Eval now if they are.
                    // This is to allow them to be configurable & values changed without restarting
                    // the whole extension.
                    let evaledCmd = typeof(cmd) === "function" ? cmd() : cmd;
                    let evaledNeedsTerminal = typeof(needsTerminal) === "function" ? needsTerminal() : needsTerminal;
                    log(`Pressed ${settingName}`);
                    this.launchCmd(evaledCmd, evaledNeedsTerminal);
                });
    }

    destroy() {
        for (const settingName in tileMoveKeys) {
            Main.wm.removeKeybinding(settingName);
        }
        this.launchKeybinds.forEach(settingName => Main.wm.removeKeybinding(settingName));
        Main.wm.removeKeybinding("new-window");
    }

    isModKeyPressed(modMask: Clutter.ModifierType) {
        const modifiers = global.get_pointer()[2];
        return (modifiers & modMask) !== 0;
    }

    private onTileMoveKeyPressed(settingName: string, movement: TileMoveKey) {
        log("Pressed " + settingName);

        const metaWindow = global.display.focus_window;
        if (metaWindow == null) {
            log("Tile move key pressed, but no window is currently focussed");
            return;
        }
        const window = metaWindow as TiledWindow;

        // Special case: if moving down and the window is fullscreen, then come out of fullscreen
        if (settingName.startsWith("tile-move-down-") && window.is_fullscreen()) {
            window.unmake_fullscreen();

            // If the window is tiled, also resize & move it to its tile.
            // This handles it potentially having become split tiled whilst fullscreen (edge case where another window
            //  is split-tile moved by keyboard shortcut into this windows tile, which can be done in fullscreen with a window
            //  from another monitor).
            // Also handles windows that don't return to their exact size on exiting fullscreen, e.g. gnome-terminal
            //  which makes itself slightly shorter.
            if (window.tile !== null) {
                WindowMover.moveWithoutUpdatingOtherTiles(window, window.tile);
            }
            return;
        }

        // If the current window is already tiled in the same layer we're interested in
        const tiles = this.tiles.getAllTiles(movement.tileLayer);
        let targetTile = null;
        if (window.tile !== null && tiles.includes(window.tile)) {
            log(`Currently in tile, moving ${settingName} relative to it`);
            targetTile = movement.nextTileSelector(window.tile);

            // Special case: if moving up but there is no tile above this one, go fullscreen
            if (settingName.startsWith("tile-move-up-") && targetTile === null) {
                window.make_fullscreen();
                return;
            }
        }
        // Else the window is floating (or tiled in another layer, which we will treat as floating)
        else {
            log(`Window is floating, searching for best tile ${settingName}`);
            // Find the closest tile in the direction we want to move in
            const wRect = window.get_frame_rect();
            targetTile = movement.floatingTileSelector(tiles, wRect);

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
            // Behaviour on leaving a tile
            WindowMover.leave(window, window.tile);

            WindowMover.move(window, targetTile);
        }
        else {
            log(`No target for movement ${settingName} found, not moving window`);
        }
    }

    private onNewWindowKeyPressed() {
        log("New window key pressed");
        
        const window = global.display.focus_window;
        if (!window) {
            log("No window currently in focus");
            return;
        }

        const app = this.findApp(window);
        if (app === null) {
            log(`Cannot find app for window ${window.get_title()}`);
            return;
        }
        
        if (!app.can_open_new_window()) {
            log(`Cannot open new window for app ${app.get_name()}`);
            return;
        }
        app.open_new_window(-1);
    }

    private findApp(window: Meta.Window) {
        const windowId = window.get_id();
        const appSys = Shell.AppSystem.get_default();
        const runningApps = appSys.get_running();
        for (let i = 0; i < runningApps.length; i++) {
            const app = runningApps[i];
            const appWindows = app.get_windows(); 
            for (let j = 0; j < appWindows.length; i++) {
                if (appWindows[j].get_id() === windowId) {
                    return app;
                }
            }
        }
        return null;
    }

    private launchCmd(cmd: string, needsTerminal: boolean) {
        let flags = Gio.AppInfoCreateFlags.SUPPORTS_STARTUP_NOTIFICATION;
        if (needsTerminal) {
            flags = flags | Gio.AppInfoCreateFlags.NEEDS_TERMINAL;
        }
        const app = Gio.AppInfo.create_from_commandline(cmd, null, flags);
        app.launch([], null);
    }
};
