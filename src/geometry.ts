export default class Geometry {
    /**
     * Finds the euclidean distance between the closest corners of two rectangles
     */
    static euclideanDistanceBetweenClosestCorners(a: Rect, b: Rect): number {
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
     */
    static euclideanDistance(a: Point, b: Point): number {
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        return Math.sqrt((w * w) + (h * h));
    }

    /**
     * Does a rectange contain a point
     */
    static contains (rect: Rect, point: Point): boolean {
        return rect.x <= point.x &&
            rect.x + rect.width > point.x &&
            rect.y <= point.y &&
            rect.y + rect.height > point.y;
    }

    /**
     * Finds the center of a rectangle
     */
    static center (rect: Rect): Point {
        return {
            x: rect.x + Math.floor(rect.width / 2),
            y: rect.y + Math.floor(rect.height / 2),
        };
    }
    
    static _euclideanDistanceBeteenClosestPoints(a: Point[], b: Point[]): number {
        let dBest = Infinity;
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                dBest = Math.min(dBest, this.euclideanDistance(a[i], b[j]));
            }
        }
        return dBest;
    }
    
    static _rectTopLeft(r: Rect): Point {
        return r;
    }

    static _rectTopRight(r: Rect): Point {
        return {
            x: r.x + r.width - 1,
            y: r.y,
        };
    }

    static _rectBottomRight(r: Rect): Point {
        return {
            x: r.x + r.width - 1,
            y: r.y + r.height - 1,
        };
    }

    static _rectBottomLeft(r: Rect): Point {
        return {
            x: r.x,
            y: r.y + r.height - 1,
        };
    }
}
