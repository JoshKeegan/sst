declare module "resource:///org/gnome/shell/extensions/extension.js" {
    /**
     * Represents the metadata param to the Extension/ExtensionBase ctor.
     * It's an object representing the contents of metadata.json, but this class represents how it should be used.
     * BaseExtension already contains many accessors for this, use those if available.
     */
    export class Metadata {
        [key: string]: string;
    }

    export class Extension {
        constructor(metadata: Metadata);

        public readonly metadata: Metadata;

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
