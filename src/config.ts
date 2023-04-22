import Gio from "@girs/gio-2.0";
import GLib from "@girs/glib-2.0";

const { byteArray } = imports;

export interface Config {
    floatingRules: FloatingRule[]// @ts-ignore - missing ctor for Meta.Rectange struct
}

export interface FloatingRule {
    class?: string
    notClass?: string
    title?: string
    notTitle?: string
}

export class Config {
    /*
        TODO: document in readme - until then docs are...
        floatingRules: [{ class, notClass, title, notTitle }]
        Regex on window class &/or title that forces a window to be floating
        Find values by running:
        # xprop | grep -e "WM_NAME(" -e "WM_CLASS("
        Then clicking on the window.
        Note that there may be multiple values for class. You need to use the last one.
    */
    static load(): Config {
        // load from user's home dir & fallback to default if not present
        let userConfig = this.loadFile(GLib.get_user_config_dir() + "/sst/config.json");
        if (userConfig !== null) {
            return userConfig;
        }

        log("sst: no user config found, loading default");
        const defaultConfig = this.loadFile(
            GLib.get_user_data_dir()+"/gnome-shell/extensions/sst@joshkeegan.co.uk/config.default.json");
        if (defaultConfig === null) {
            throw new Error("default config not found");
        }
        return defaultConfig;
    }

    private static loadFile(path: string): Config | null {
        const file = Gio.File.new_for_path(path);
        if (!file.query_exists(null)) {
            return null;
        }
    
        const [ok, bytes, _] = file.load_contents(null);
        if (!ok) {
            throw new Error("loading config - could not read file");
        }
        const string = byteArray.toString(bytes);
        log(string);
        return JSON.parse(string);
    }
}
