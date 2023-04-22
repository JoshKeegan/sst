import Meta from "@girs/meta-12";

import {Config, FloatingRule as CfgFloatingRule} from "./config";

class FloatingRule {
    class?: RegExp
    notClass?: RegExp
    title?: RegExp
    notTitle?: RegExp

    /**
     * Are any rules set
     * Used to discard rules that have no criteria (empty object in config)
     */
    get any(): boolean {
        return this.class !== undefined ||
            this.notClass !== undefined ||
            this.title !== undefined ||
            this.notTitle !== undefined;
    }

    constructor(c: CfgFloatingRule) {
        if (c.class !== undefined) {
            this.class = new RegExp(c.class);
        }
        if (c.notClass !== undefined) {
            this.notClass = new RegExp(c.notClass);
        }
        if (c.title !== undefined) {
            this.title = new RegExp(c.title);
        }
        if (c.notTitle !== undefined) {
            this.notTitle = new RegExp(c.notTitle);
        }
    }
    
    test(wmClass: string | null, title: string | null): boolean {
        // TODO: Handle class or title null - picked up during TS migration
        if (wmClass === null || title === null) {
            log(`Unhandled window state in floating rule. Class "${wmClass}", title "${title}`);
            return false;
        }

        if (this.class !== undefined && !this.class.test(wmClass)) {
            return false;
        }
        if (this.notClass !== undefined && this.notClass.test(wmClass)) {
            return false;
        }
        if (this.title !== undefined && !this.title.test(title)) {
            return false;
        }
        if (this.notTitle !== undefined && this.notTitle.test(title)) {
            return false;
        }
        return true;
    }
}

export default class WindowTileable {
    private floatingRules: FloatingRule[];

    constructor(config: Config) {
        this.floatingRules = config.floatingRules.map(c => new FloatingRule(c))
        .filter(r => r.any);
    }

    isTileable(window: Meta.Window) {
        if (!this.isTileableFixedProps) {
            return false;
        }
        
        // Don't tile windows that can't be resized:
        //  - Splash/loading screen: intentended to float
        //  - Pop-up: we want to float these
        //  - Poor UI needing fixed window size: can't tile these anyway ¯\_(ツ)_/¯
        if (!window.resizeable) {
            return false;
        }

        return !this.matchesFloatingRule(window);
    }

    /**
     * Checks whether a window could be tileable, limited to using properties that will not get updated.
     * Safe to be used before being certain a window state has settled (e.g. size changes, or title updated).
     * If returns false, sure it cannot be tiled.
     * If returns true, it could be tileable - call isTileable once it has made any async changes
     */
    isTileableFixedProps(window: Meta.Window) {
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

        return true;
    }

    private matchesFloatingRule(window: Meta.Window) {
        const wmClass = window.get_wm_class();
        const title = window.get_title();

        return this.floatingRules.some(r => r.test(wmClass, title));
    }
}
