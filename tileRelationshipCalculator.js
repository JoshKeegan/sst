"use strict";

// TODO: Unit tests would be nice here
var Calculator = class TileRelationshipCalculator {
    static addRelationships(tiles) {
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            this._addUpRelationship(tile, tiles);
            this._addDownRelationship(tile, tiles);
            this._addLeftRelationship(tile, tiles);
            this._addRightRelationship(tile, tiles);
        }
    }

    static _addUpRelationship(tile, tiles) {
        if (tile.relationships.up !== null) {
            return;
        }

        let candidates = tiles.filter(t => 
            // Horizontally overlap
            t.x <= (tile.x + tile.width) && 
            (t.x + t.width) >= tile.x && 
            // Candidate above this tile
            t.y < tile.y);
        
        // Sort by y desc to find the closest
        candidates = candidates.sort((a, b) => a.y < b.y);

        // Set the relationship to the best candidate
        if (candidates.length > 0) {
            tile.relationships.up = candidates[0];

            // Reciprocate the relationship (if it doesn't already have one)
            if (candidates[0].relationships.down === null) {
                candidates[0].relationships.down = tile;
            }
        }
    }

    static _addDownRelationship(tile, tiles) {
        if (tile.relationships.down !== null) {
            return;
        }

        let candidates = tiles.filter(t =>
            // Horizontally overlap
            t.x <= (tile.x + tile.width) && 
            (t.x + t.width) >= tile.x && 
            // Candidate below this tile
            t.y > tile.y);
        
        // Sort by y asc to find the closest
        candidates = candidates.sort((a, b) => a.y > b.y);
        
        // Set the relationship to the best candidate
        if (candidates.length > 0) {
            tile.relationships.down = candidates[0];

            // Reciprocate the relationship (if it doesn't already have one)
            if (candidates[0].relationships.up === null) {
                candidates[0].relationships.up = tile;
            }
        }
    }

    static _addLeftRelationship(tile, tiles) {
        if (tile.relationships.left !== null) {
            return;
        }

        let candidates = tiles.filter(t => 
            // Vertically overlap
            t.y <= (tile.y + tile.height) &&
            (t.y + t.height) >= tile.y && 
            // Candidate to the left of this tile
            t.x < tile.x);
        
        // Sort by x desc to find the closest
        candidates = candidates.sort((a, b) => a.x < b.x);

        // Set the relationship to the best candidate
        if (candidates.length > 0) {
            tile.relationships.left = candidates[0];

            // Reciprocate the relationship (if it doesn't already have one)
            if (candidates[0].relationships.right  === null) {
                candidates[0].relationships.right = tile;
            }
        }
    }

    static _addRightRelationship(tile, tiles) {
        if (tile.relationships.right !== null) {
            return;
        }

        let candidates = tiles.filter(t => 
            // Vertically overlap
            t.y <= (tile.y + tile.height) &&
            (t.y + t.height) >= tile.y && 
            // Candidate to the right of this tile
            t.x > tile.x);
        
        // Sort by x asc to find the closest
        candidates = candidates.sort((a, b) => a.x > b.x);

        // Set the relationship to the best candidate
        if (candidates.length > 0) {
            tile.relationships.right = candidates[0];

            // Reciprocate the relationship (if it doesn't already have one)
            if (candidates[0].relationships.left  === null) {
                candidates[0].relationships.left = tile;
            }
        }
    }
}