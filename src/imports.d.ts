declare const imports: Imports;

// GJS & gnome-shell specific types
interface Imports {
    /**
     * @deprecated https://github.com/GNOME/gjs/blob/master/doc/ByteArray.md
     */
    byteArray: any,
    ui: {
        layout: any
        main: {
            layoutManager: {
                monitors: {
                    inFullscreen: () => boolean
                }[],
                /**
                 * uiGroup is of type UiActor (defined in gnome-shell layout.js)
                 * This extends St.Widget, so this type definition misses what it is extended with, but 
                 * we aren't currently using those.
                 */
                uiGroup: import('@girs/st-12').St.Widget
            },
            wm: {
                addKeybinding(
                    name: string, 
                    settings: import('@girs/gio-2.0').Gio.Settings,
                    flags: import('@girs/meta-12').Meta.KeyBindingFlags,
                    modes: import('@girs/shell-12').Shell.ActionMode,
                    handler: import('@girs/meta-12').Meta.KeyHandlerFunc): number,
                removeKeybinding(name: string): void
            }
        }
        windowManager: {
            TilePreview: any
        }
    }
    misc: {
        extensionUtils: {
            getSettings(schema: string): import('@girs/gio-2.0').Gio.Settings
        }
        config: {
            /**
             * GNOME version
             */
            PACKAGE_VERSION: string
        }
    }
}
