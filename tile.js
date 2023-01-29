"use strict";

const {Meta} = imports.gi;

// Extend Meta.Rectangle as this rect will be what gets passed into the tile preview & window resize calls.
//  It has methods such as .equal() that gnome-shell uses.
var Tile = class Tile extends Meta.Rectangle {
    constructor(monitorIdx, rect) {
        super(rect);
        this.monitorIdx = monitorIdx;
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

        return new Tile(a.monitorIdx, {
            x: xStart,
            y: yStart,
            width: xEnd - xStart,
            height: yEnd - yStart
        });
    }
}