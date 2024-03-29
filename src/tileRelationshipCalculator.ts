import Meta from "@girs/meta-12";

import Geometry from "./geometry";
import Tile from "./tile";

export default class TileRelationshipCalculator {
    static addRelationships(tiles: Tile[]) {
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            this.addUpRelationship(tiles, tile);
            this.addDownRelationship(tiles, tile);
            this.addLeftRelationship(tiles, tile);
            this.addRightRelationship(tiles, tile);
        }
    }

    /**
     * Finds the tile above the top of the supplied rectangle (may overlap)
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findUp(tiles: Tile[], rect: Rect): Tile | null {
        let candidates = tiles.filter(t => 
            // Horizontally overlap
            t.x < (rect.x + rect.width) && 
            (t.x + t.width) > rect.x && 
            // Candidate above this tile
            t.y < rect.y);
        
        // Sort by y desc to find the closest
        candidates = candidates.sort((a, b) => b.y - a.y);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile below the bottom of the supplied rectangle (may overlap)
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findDown(tiles: Tile[], rect: Rect): Tile | null {
        let candidates = tiles.filter(t =>
            // Horizontally overlap
            t.x < (rect.x + rect.width) && 
            (t.x + t.width) > rect.x && 
            // Candidate below this tile
            t.y > rect.y);
        
        // Sort by y asc to find the closest
        candidates = candidates.sort((a, b) => a.y - b.y);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile to the left of the supplied rectangle (may overlap)
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findLeft(tiles: Tile[], rect: Rect) : Tile | null {
        let candidates = tiles.filter(t => 
            // Vertically overlap
            t.y < (rect.y + rect.height) &&
            (t.y + t.height) > rect.y && 
            // Candidate to the left of this tile
            t.x < rect.x);
        
        // Sort by x desc to find the closest
        candidates = candidates.sort((a, b) => b.x - a.x);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile to the right of the supplied rectangle (may overlap)
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findRight(tiles: Tile[], rect: Rect) : Tile | null {
        let candidates = tiles.filter(t => 
            // Vertically overlap
            t.y < (rect.y + rect.height) &&
            (t.y + t.height) > rect.y && 
            // Candidate to the right of this tile
            t.x > rect.x);
        
        // Sort by x asc to find the closest
        candidates = candidates.sort((a, b) => a.x - b.x);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile with the largest intersecting area to the supplied rectangle.
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectangle to find tile relative to
     */
    static findLargestIntersection(tiles: Tile[], rect: Meta.Rectangle) : Tile | null {
        let iArea = 0;
        let iTile = null;
        for (let i = 0; i < tiles.length; i++) {
            const [intersect, iRect] = rect.intersect(tiles[i].rect);
            if (intersect) {
                const a = iRect.width * iRect.height;
                if (a > iArea) {
                    iArea = a;
                    iTile = tiles[i];
                }
            }
        }
        return iTile;
    }

    /**
     * Finds the tile closest to the supplied rectangle, in any direction. 
     * If the center of the window is within a tile, returns that.
     * Else finds the closest tile.
     * If overlapping multiple tiles, will find the one with the shortest distance between corners.
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectangle to find tile relative to
     * @returns closest tile
     */
    static findClosest(tiles: Tile[], rect: Rect): Tile | null {
        return this.findCenterWithin(tiles, rect) || this.findClosestCorners(tiles, rect);
    }

    /**
     * Finds the tile that contains the center of the supplied rectangle.
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectangle to find tile relative to
     * @returns tile containing the rect center
     */
    private static findCenterWithin(tiles: Tile[], rect: Rect): Tile | null {
        const center = Geometry.center(rect);
        for (let i = 0; i < tiles.length; i++) {
            if (Geometry.contains(tiles[i], center)) {
                return tiles[i];
            }
        }
        return null;
    }

    /**
     * Finds the tile whose corners are closest to the supplied rectangle, in any direction. 
     * If overlapping multiple tiles, will find the one with the shortest distance between corners.
     * @param tiles tiles to consider (should be all tiles in the current layer)
     * @param rect rectangle to find tile relative to
     * @returns closest tile
     */
    private static findClosestCorners(tiles: Tile[], rect: Rect): Tile | null {
        let tBest = null;
        let dBest = Infinity;
        for (let i = 0; i < tiles.length; i++) {
            const d = Geometry.euclideanDistanceBetweenClosestCorners(tiles[i], rect);
            if (d < dBest) {
                dBest = d;
                tBest = tiles[i];
            }
        }
        return tBest;
    }

    private static addUpRelationship(tiles: Tile[], tile: Tile) {
        if (tile.relationships.up !== null) {
            return;
        }

        const up = this.findUp(tiles, tile);
        if (up !== null) {
            tile.relationships.up = up;

            // Reciprocate the relationship (if it doesn't already have one)
            if (up.relationships.down === null) {
                up.relationships.down = tile;
            }
        }
    }

    private static addDownRelationship(tiles: Tile[], tile: Tile) {
        if (tile.relationships.down !== null) {
            return;
        }

        const down = this.findDown(tiles, tile);
        if (down !== null) {
            tile.relationships.down = down;

            // Reciprocate the relationship (if it doesn't already have one)
            if (down.relationships.up === null) {
                down.relationships.up = tile;
            }
        }
    }

    private static addLeftRelationship(tiles: Tile[], tile: Tile) {
        if (tile.relationships.left !== null) {
            return;
        }

        const left = this.findLeft(tiles, tile);
        if (left !== null) {
            tile.relationships.left = left;

            // Reciprocate the relationship (if it doesn't already have one)
            if (left.relationships.right  === null) {
                left.relationships.right = tile;
            }
        }
    }

    private static addRightRelationship(tiles: Tile[], tile: Tile) {
        if (tile.relationships.right !== null) {
            return;
        }

        const right = this.findRight(tiles, tile);
        if (right !== null) {
            tile.relationships.right = right;

            // Reciprocate the relationship (if it doesn't already have one)
            if (right.relationships.left  === null) {
                right.relationships.left = tile;
            }
        }
    }
}
