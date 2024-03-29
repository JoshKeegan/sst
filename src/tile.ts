import Meta from "@girs/meta-12";

// Note: Meta.Rectangle is a struct not a class. In older versions of GJS we could still extend it, but
// after they changed how classes work to be ES6 or GObject.registerClass(...) it's no longer possible.
// So instead of inheriting it a tile must now be composed of it. Whenever passing to native functions simply
// pass .rect instead of the whole tile.
export default class Tile {
    public monitorIdx: number;
    public parent: Tile | null;
    public rect: Meta.Rectangle;
    public children: Tile[] = [];
    public relationships: {
        up: Tile | null,
        down: Tile | null,
        left: Tile | null,
        right: Tile | null,
    } = {
        up: null,
        down: null,
        left: null,
        right: null
    };
    public combined: boolean = false;

    get x() { return this.rect.x; }
    get y() { return this.rect.y; }
    get width() { return this.rect.width; }
    get height() { return this.rect.height; }

    get sibling(): Tile | null {
        if (this.combined || this.parent === null) {
            return null;
        }
        return this.parent.children.find(t => t !== this) || null;
    }

    constructor(monitorIdx: number, parent: Tile | null, rect: Meta.Rectangle) {
        this.monitorIdx = monitorIdx;
        this.parent = parent;
        this.rect = rect;
    }

    toString() {
        return `x:${this.x} y:${this.y} width:${this.width} height:${this.height} ` + 
                `monitor:${this.monitorIdx} ` + 
                `${this.parent !== null ? "has" : "no"} parent ` + 
                `${this.children.length} children ` +
                `${this.relationships.up !== null ? "has" : "no"} up ` +
                `${this.relationships.down !== null ? "has" : "no"} down ` +
                `${this.relationships.left !== null ? "has" : "no"} left ` +
                `${this.relationships.right !== null ? "has" : "no"} right ` +
                `${this.combined ? "is" : "not"} combined`;
    }
    
    static combine(a: Tile, b: Tile): Tile {
        const xStart = Math.min(a.x, b.x);
        const xEnd = Math.max(a.x + a.width, b.x + b.width);

        const yStart = Math.min(a.y, b.y);
        const yEnd = Math.max(a.y + a.height, b.y + b.height);

        // If combining two tiles with the same parent, we can propagate the parent
        //  relationship, otherwise this combined tile becomes unparented.
        // TODO: If we always split tiles in two (currently the case but could change), 
        //  if both tiles have the same parent then in theory combining them is actually
        //  producing the parent. Should we use that instead?
        const parent = a.parent === b.parent ? a.parent : null;

        const tile = new Tile(a.monitorIdx, parent, 
            // @ts-ignore - missing ctor for Meta.Rectange struct
            new Meta.Rectangle({
            x: xStart,
            y: yStart,
            width: xEnd - xStart,
            height: yEnd - yStart
        }));
        tile.children = [a, b];
        tile.combined = true;
        return tile;
    }
}
