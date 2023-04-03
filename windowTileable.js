"use strict";

const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;

var Tileable = class WindowTileable {
    constructor(config) {
        this._floatingRules = config.floatingRules.map(c => {
            const rule = {};
            if ("class" in c) {
                rule.class = new RegExp(c.class);
            }
            if ("notClass" in c) {
                rule.notClas = new RegExp(c.notClass);
            }
            if ("title" in c) {
                rule.title = new RegExp(c.title);
            }
            if ("notTitle" in c) {
                rule.notTitle = new RegExp(c.notTitle);
            }
            return rule;
        }).filter(r => "class" in r || "notClass" in r || "title" in r || "notTitle" in r);
    }

    destroy() {
        this._settings = null;
    }

    isTileable(window) {
        /*
            https://gjs-docs.gnome.org/meta12~12-windowtype/
            https://wiki.gnome.org/Projects/Metacity/WindowTypes

            Tile:
            Normal - Most app windows
            Utility - Attached to parent, but still seems sensible to tile. e.g. Firefox picture-in-picture
        */
        const type = window.get_window_type();
        if (type !== Meta.WindowType.NORMAL && 
            type !== Meta.WindowType.UTILITY) {
            return false;
        }

        // Windows with WM_TRANSIENT_FOR set are pop-ups for the window it specifies
        if (window.get_transient_for() !== null) {
            return false;
        }

        // Don't tile windows that can't be resized:
        //  - Splash/loading screen: intentended to float
        //  - Pop-up: we want to float these
        //  - Poor UI needing fixed window size: can't tile these anyway ¯\_(ツ)_/¯
        if (!window.resizeable) {
            return false;
        }

        return !this._matchesFloatingRule(window);
    }

    _matchesFloatingRule(window) {
        const wmClass = window.get_wm_class();
        const title = window.get_title();

        for (let i = 0; i < this._floatingRules.length; i++) {
            const rule = this._floatingRules[i];
            if ("class" in rule && !rule.class.test(wmClass)) {
                continue;
            }
            if ("notClass" in rule && rule.notClass.test(wmClass)) {
                continue;
            }
            if ("title" in rule && !rule.title.test(title)) {
                continue;
            }
            if ("notTitle" in rule && rule.notTitle.test(title)) {
                continue;
            }
            return true;
        }
        return false;
    }
}