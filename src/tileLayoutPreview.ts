import Tile from "./tile"
import { Type as TTileLayoutPreviewItem, Registered as RTileLayoutPreviewItem } from "./tileLayoutPreviewItem"

/**
 * Displays a preview of the tile layout for a layer of tiles.
 * @param Tile tiles - tiles to be included in this preview (will be all tiles in a layer)
 */
export default class TileLayoutPreview {
    private items: TTileLayoutPreviewItem[];

    constructor(tiles: Tile[]) {
        this.items = tiles.map(t => new RTileLayoutPreviewItem(t));
    }

    destroy() {
        this.items.forEach(i => i.destroy());
        this.items = [];
    }

    open() {
        this.items.forEach(i => i.open());
    }

    close() {
        this.items.forEach(i => i.close());
    }
}
