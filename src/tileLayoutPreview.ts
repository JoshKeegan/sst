import Tile from "./tile"
import { Type as TTileLayoutPreviewItem, Registered as RTileLayoutPreviewItem } from "./tileLayoutPreviewItem"

/**
 * Displays a preview of the tile layout for a layer of tiles.
 * @param Tile tiles - tiles to be included in this preview (will be all tiles in a layer)
 */
export default class TileLayoutPreview {
    private _items: TTileLayoutPreviewItem[];

    constructor(tiles: Tile[]) {
        this._items = tiles.map(t => new RTileLayoutPreviewItem(t));
    }

    destroy() {
        this._items.forEach(i => i.destroy());
        this._items = [];
    }

    open() {
        this._items.forEach(i => i.open());
    }

    close() {
        this._items.forEach(i => i.close());
    }
}
