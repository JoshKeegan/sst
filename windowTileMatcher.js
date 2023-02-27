"use strict";

var Matcher = class WindowTileMatcher {
    /**
     * Finds which tile the window is tiled to. Returns null if floating/not tiled
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param wRect rectangle of the current window
     */
    static matchTile(tiles, wRect) {
        log(`window x: ${wRect.x} y: ${wRect.y} w: ${wRect.width} h: ${wRect.height}`);
        log(`tile x: ${tiles[0].x} y: ${tiles[0].y} w: ${tiles[0].width} h: ${tiles[0].height}`);

        const tile = tiles.find(t => this.isWindowInTile(t, wRect));
        return tile ? tile : null;
    }
    
    static isWindowInTile(tile, wRect) {
        const FUZZY_DIMS_MULT = 0.98;

        return tile.x === wRect.x &&
            tile.y === wRect.y &&
            // Fuzzy match dimensions as some windows (e.g. terminal) slightly undersize themselves
            tile.width >= wRect.width && 
            tile.width * FUZZY_DIMS_MULT < wRect.width &&
            tile.height >= wRect.height &&
            tile.height * FUZZY_DIMS_MULT < wRect.height
    }
}