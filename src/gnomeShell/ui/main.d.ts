declare module "resource:///org/gnome/shell/ui/main.js" {
    export abstract class layoutManager {
        public static monitors: {
            inFullscreen: () => boolean
        }[];

        /**
         * uiGroup is of type UiActor (defined in gnome-shell layout.js)
         * This extends St.Widget, so this type definition misses what it is extended with, but 
         * we aren't currently using those.
         */
        public static uiGroup: import('@girs/st-12').St.Widget;
    }

    export abstract class wm {
        public static addKeybinding(
            name: string, 
            settings: import('@girs/gio-2.0').Gio.Settings,
            flags: import('@girs/meta-12').Meta.KeyBindingFlags,
            modes: import('@girs/shell-12').Shell.ActionMode,
            handler: import('@girs/meta-12').Meta.KeyHandlerFunc,
        ): number;
        
        public static removeKeybinding(name: string): void;
    }
}
