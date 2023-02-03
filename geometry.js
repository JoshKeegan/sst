"use strict";

var Geometry = class Geometry {
    /**
     * Finds the euclidean distance between the closest corners of two rectangles
     * @param {x, y, width, height} a 
     * @param {x, y, width, height} b 
     */
    static euclideanDistanceBetweenClosestCorners(a, b) {
        return this._euclideanDistanceBeteenClosestPoints([
            this._rectTopLeft(a),
            this._rectTopRight(a),
            this._rectBottomRight(a),
            this._rectBottomLeft(a),
        ],
        [
            this._rectTopLeft(b),
            this._rectTopRight(b),
            this._rectBottomRight(b),
            this._rectBottomLeft(b),
        ]);
    }

    /**
     * Calculates the euclidean distance between two points
     * @param {x, y} a 
     * @param {x, y} b 
     */
    static euclideanDistance(a, b) {
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        return Math.sqrt((w * w) + (h * h));
    }

    /**
     * Does a rectange contain a point
     * @param {x, y, width, height} rect 
     * @param {x, y} point 
     */
    static contains (rect, point) {
        return rect.x <= point.x &&
            rect.x + rect.width > point.x &&
            rect.y <= point.y &&
            rect.y + rect.height > point.y;
    }
    
    static _euclideanDistanceBeteenClosestPoints(a, b) {
        let dBest = Infinity;
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                dBest = Math.min(dBest, this.euclideanDistance(a[i], b[j]));
            }
        }
        return dBest;
    }
    
    static _rectTopLeft(r) {
        return r;
    }

    static _rectTopRight(r) {
        return {
            x: r.x + r.width - 1,
            y: r.y,
        };
    }

    static _rectBottomRight(r) {
        return {
            x: r.x + r.width - 1,
            y: r.y + r.height - 1,
        };
    }

    static _rectBottomLeft(r) {
        return {
            x: r.x,
            y: r.y + r.height - 1,
        };
    }
}