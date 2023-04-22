"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const TileLayoutPreviewItem = Me.imports.tileLayoutPreviewItem.Item;

/**
 * Displays a preview of the tile layout for a layer of tiles.
 * @param Tile tiles - tiles to be included in this preview (will be all tiles in a layer)
 */
var Preview = class TileLayoutPreview {
    constructor(tiles) {
        this._items = tiles.map(t => new TileLayoutPreviewItem(t));
    }

    destroy() {
        if (this._items === null) {
            return;
        }
        this._items.forEach(i => i.destroy());
        this._items = null;
    }

    open() {
        this._items.forEach(i => i.open());
    }

    close() {
        this._items.forEach(i => i.close());
    }
}
