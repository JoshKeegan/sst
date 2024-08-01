declare module "resource:///org/gnome/shell/extensions/extension.js" {
    export class Extension {
        // TODO: declare type for metadata
        constructor(metadata: any);

        public readonly metadata: any;

        // Not entirely true
        // Extension extends ExtensionBase, and getSettings is on that.
        // The distinction isn't relevant in this project, so they can be split later if required.
        
        /**
         * Get a GSettings object for schema.
         * If schema is omitted, the schema for this extension will be used.
         */
        public getSettings(schema?: string): import('@girs/gio-2.0').Gio.Settings;
    }
}
