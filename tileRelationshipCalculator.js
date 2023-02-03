"use strict";

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Geometry = Me.imports.geometry.Geometry;

var Calculator = class TileRelationshipCalculator {
    static addRelationships(tiles) {
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            this._addUpRelationship(tiles, tile);
            this._addDownRelationship(tiles, tile);
            this._addLeftRelationship(tiles, tile);
            this._addRightRelationship(tiles, tile);
        }
    }

    /**
     * Finds the tile above the top of the supplied rectangle (may overlap)
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param {Meta.Rectangle} rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findUp(tiles, rect) {
        let candidates = tiles.filter(t => 
            // Horizontally overlap
            t.x < (rect.x + rect.width) && 
            (t.x + t.width) > rect.x && 
            // Candidate above this tile
            t.y < rect.y);
        
        // Sort by y desc to find the closest
        candidates = candidates.sort((a, b) => a.y < b.y);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile below the bottom of the supplied rectangle (may overlap)
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param {Meta.Rectangle} rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findDown(tiles, rect) {
        let candidates = tiles.filter(t =>
            // Horizontally overlap
            t.x < (rect.x + rect.width) && 
            (t.x + t.width) > rect.x && 
            // Candidate below this tile
            t.y > rect.y);
        
        // Sort by y asc to find the closest
        candidates = candidates.sort((a, b) => a.y > b.y);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile to the left of the supplied rectangle (may overlap)
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param {Meta.Rectangle} rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findLeft(tiles, rect) {
        let candidates = tiles.filter(t => 
            // Vertically overlap
            t.y < (rect.y + rect.height) &&
            (t.y + t.height) > rect.y && 
            // Candidate to the left of this tile
            t.x < rect.x);
        
        // Sort by x desc to find the closest
        candidates = candidates.sort((a, b) => a.x < b.x);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile to the right of the supplied rectangle (may overlap)
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param {Meta.Rectangle} rect rectanagle to find tile relative to
     * @returns closest tile
     */
    static findRight(tiles, rect) {
        let candidates = tiles.filter(t => 
            // Vertically overlap
            t.y < (rect.y + rect.height) &&
            (t.y + t.height) > rect.y && 
            // Candidate to the right of this tile
            t.x > rect.x);
        
        // Sort by x asc to find the closest
        candidates = candidates.sort((a, b) => a.x > b.x);
        return candidates.length > 0 ? candidates[0] : null;
    }

    /**
     * Finds the tile with the largest intersecting area to the supplied rectangle.
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param {Meta.Rectangle} rect rectangle to find tile relative to
     */
    static findLargestIntersection(tiles, rect) {
        let iArea = 0;
        let iTile = null;
        for (let i = 0; i < tiles.length; i++) {
            const [intersect, iRect] = rect.intersect(tiles[i]);
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
     * If overlapping, will find the one with the shortest distance between corners.
     * @param tiles array of tiles to consider (should be all tiles in the current layer)
     * @param {Meta.Rectangle} rect rectangle to find tile relative to
     * @returns closest tile
     */
    static findClosest(tiles, rect) {
        let dBest = Infinity;
        let tBest = null;
        for (let i = 0; i < tiles.length; i++) {
            const d = Geometry.euclideanDistanceBetweenClosestCorners(tiles[i], rect);
            if (d < dBest) {
                dBest = d;
                tBest = tiles[i];
            }
        }
        return tBest;
    }

    static _addUpRelationship(tiles, tile) {
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

    static _addDownRelationship(tiles, tile) {
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

    static _addLeftRelationship(tiles, tile) {
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

    static _addRightRelationship(tiles, tile) {
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