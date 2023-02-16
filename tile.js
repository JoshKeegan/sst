"use strict";

const {Meta} = imports.gi;

// Extend Meta.Rectangle as this rect will be what gets passed into the tile preview & window resize calls.
//  It has methods such as .equal() that gnome-shell uses.
var Tile = class Tile extends Meta.Rectangle {
    constructor(monitorIdx, parent, rect) {
        super(rect);
        this.monitorIdx = monitorIdx;
        this.parent = parent;
        this.children = [];
        this.relationships = {
            up: null,
            down: null,
            left: null,
            right: null,
        };
    }

    static combine(a, b) {
        let xStart = Math.min(a.x, b.x);
        let xEnd = Math.max(a.x + a.width, b.x + b.width);

        let yStart = Math.min(a.y, b.y);
        let yEnd = Math.max(a.y + a.height, b.y + b.height);

        // If combining two tiles with the same parent, we can propagate the parent
        //  relationship, otherwise this combined tile becomes unparented.
        // TODO: If we always split tiles in two (currently the case but could change), 
        //  if both tiles have the same parent then in theory combining them is actually
        //  producing the parent. Should we use that instead?
        let parent = a.parent === b.parent ? a.parent : null;

        let tile = new Tile(a.monitorIdx, parent, {
            x: xStart,
            y: yStart,
            width: xEnd - xStart,
            height: yEnd - yStart
        });
        tile.children = [a, b];
        return tile;
    }
}