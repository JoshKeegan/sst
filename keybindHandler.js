"use strict";

const {main} = imports.ui;
const {Gio, Meta, Shell} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;
const WindowMover = Me.imports.windowMover.Mover;
const WindowTileMatcher = Me.imports.windowTileMatcher.Matcher;

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
        const defaultTerminalSettings = ExtensionUtils.getSettings("org.gnome.desktop.default-applications.terminal");
        this._execTerminal = defaultTerminalSettings.get_string("exec");

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
                    handlers.tileLayer));
        }
        main.wm.addKeybinding("launch-term",
            MainExtension.settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                this._onLaunchTermKeyPressed.bind(this));
        main.wm.addKeybinding("new-window",
        MainExtension.settings,
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            this._onNewWindowKeyPressed.bind(this));
    }

    destroy() {
        for (const settingName in tileMoveKeys) {
            main.wm.removeKeybinding(settingName);
        }
        main.wm.removeKeybinding("launch-term");
        main.wm.removeKeybinding("new-window");
    }

    isModKeyPressed(modMask) {
        const modifiers = global.get_pointer()[2];
        return (modifiers & modMask) !== 0;
    }

    _onTileMoveKeyPressed(settingName, nextTileSelector, floatingTileSelector, tileLayer) {
        log("Pressed " + settingName);

        const window = global.display.focus_window;
        if (!window) {
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
        const currentTile = WindowTileMatcher.matchTile(tiles, wRect);
        let targetTile = null;
        if (currentTile !== null) {
            log(`Currently in tile, moving ${settingName} relative to it`);
            targetTile = nextTileSelector(currentTile);

            // Special case: if moving up but there is no tile above this one, go fullscreen
            if (settingName.startsWith("tile-move-up-") && targetTile === null) {
                // Behaviour on leaving a tile
                WindowMover.leave(window, currentTile);

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
            // Behaviour on leaving a tile
            const leavingTile = currentTile !== null ? currentTile : WindowTileMatcher.matchTile(MainExtension.tiles.all, window.get_frame_rect());
            WindowMover.leave(window, leavingTile);

            WindowMover.move(window, targetTile);
        }
        else {
            log(`No target for movement ${settingName} found, not moving window`);
        }
    }

    _onLaunchTermKeyPressed() {
        log("Launch terminal key pressed");
        this._launchCmd(this._execTerminal, false);
    }

    _onNewWindowKeyPressed() {
        log("New window key pressed");
        
        const window = global.display.focus_window;
        if (!window) {
            log("No window currently in focus");
            return;
        }

        const app = this._findApp(window);
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

    _findApp(window) {
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

    _launchCmd(cmd, needsTerminal) {
        let flags = Gio.AppInfoCreateFlags.SUPPORTS_STARTUP_NOTIFICATION;
        if (needsTerminal) {
            flags = flags | Gio.AppInfoCreateFlags.NEEDS_TERMINAL;
        }
        const app = Gio.AppInfo.create_from_commandline(cmd, null, flags);
        app.launch([], null);
    }
};