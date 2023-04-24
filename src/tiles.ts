import Meta from "@girs/meta-12";

import TileRelationshipCalculator from "./tileRelationshipCalculator";
import Tile from "./tile";
import TileLayoutPreview from "./tileLayoutPreview";

const Main = imports.ui.main;

export default class Tiles {
    private previews: TileLayoutPreview[] = [];
    private layoutChangedCallbacks: (() => void)[] = [];
    private layoutSignalId: number;

    /** tileLayer => monitorIdx => [Tile] */
    private tilesByMonitor: Tile[][][] = [];
    /** tileLayer => [Tile] */
    private allTiles: Tile[][] = [];

    constructor() {
        this.layoutSignalId = global.display.connect('workareas-changed', this.refreshTiles.bind(this));
        this.refreshTiles();
    }

    get numLayers() { return this.tilesByMonitor.length; }

    getTiles(tileLayer: number, monitorIdx: number) {
        return this.tilesByMonitor[tileLayer][monitorIdx];
    }

    getAllTiles(tileLayer: number) {
        return this.allTiles[tileLayer];
    }

    getTileLayoutPreview(tileLayer: number) {
        return this.previews[tileLayer];
    }

    // TODO: Needn't be calculated at runtime
    get all() {
        return Array<Tile>().concat(...this.allTiles);
    }

    destroy() {
        global.display.disconnect(this.layoutSignalId);
        this.destroyPreviews();
    }

    /**
     * Registers a function to be called when the layout changes
     * @param function callback - function to be called when the layout changes
     */
    connectLayoutChanged(callback: () => void) {
        this.layoutChangedCallbacks.push(callback);
    }

    private destroyPreviews() {
        this.previews.forEach(p => p.destroy());
        this.previews = [];
    }

    private refreshTiles() {
        log("sst: refreshing tiles");

        this.destroyPreviews();

        const monitorWorkAreas = this.getMonitorWorkAreas();

        const topLayerRelTileAreasByMon = monitorWorkAreas.map(this.getRelativeTileAreasForMonitor);

        this.tilesByMonitor = new Array<Tile[][]>(3);
        this.tilesByMonitor[0] = this.generateTilesByMonitor(monitorWorkAreas, topLayerRelTileAreasByMon);
        this.tilesByMonitor[1] = this.tilesByMonitor[0].map(this.splitLayerTileAreas);
        this.tilesByMonitor[2] = this.tilesByMonitor[1].map(this.splitLayerTileAreas);

        this.allTiles = this.tilesByMonitor.map(this.generateAllTiles);
        this.previews = this.allTiles.map(tiles => new TileLayoutPreview(tiles));

        // Log tiles for debugging
        log("Generated Tiles:");
        for(let i = 0; i < this.allTiles.length; i++) {
            log(`Layer ${i}`);
            this.allTiles[i].forEach(t => log(t));
        }

        // Layout has been changed
        this.layoutChangedCallbacks.forEach(fn => fn());
    }

    private getMonitorWorkAreas() {
        // Assume that all workspaces will be the same & just use the first.
        //  gnome-shell makes the same assumption internally so seems safe enough for now...
        const ws = global.workspace_manager.get_workspace_by_index(0);
        if (ws === null) {
            throw new Error("Workspace index 0 not found");
        }

        const workAreas = new Array<Meta.Rectangle>(Main.layoutManager.monitors.length);
        for (let i = 0; i < workAreas.length; i++) {
            workAreas[i] = ws.get_work_area_for_monitor(i);
            log("work area monitor idx: " + i + " w: " + workAreas[i].width + " h: " + workAreas[i].height);
        }
        return workAreas;
    }

    private generateTilesByMonitor(monitorWorkAreas: Meta.Rectangle[], relativeTileAreasByMonitor: Rect[][]) {
        const tilesByMonitor = new Array<Tile[]>(monitorWorkAreas.length);        
        for (let i = 0; i < monitorWorkAreas.length; i++) {
            tilesByMonitor[i] = this.calculateTileAreas(i, monitorWorkAreas[i], relativeTileAreasByMonitor[i]);
        }
        return tilesByMonitor;
    }

    private generateAllTiles(tilesByMonitor: Tile[][]) {
        let allTiles: Tile[] = [];
        tilesByMonitor.forEach(tiles => allTiles = allTiles.concat(tiles));
        TileRelationshipCalculator.addRelationships(allTiles);
        return allTiles;
    }

    private calculateTileAreas(monitorIdx: number, monitorWorkArea: Meta.Rectangle, relTileAreas: Rect[]) {
        let tileAreas = new Array<Tile>(relTileAreas.length);
        for (let i = 0; i < tileAreas.length; i++) {
            const relArea = relTileAreas[i];

            // @ts-ignore - missing ctor for Meta.Rectange struct
            const rect = new Meta.Rectangle({
                x: monitorWorkArea.x + (monitorWorkArea.width * relArea.x),
                y: monitorWorkArea.y + (monitorWorkArea.height * relArea.y),
                width: monitorWorkArea.width * relArea.width,
                height: monitorWorkArea.height * relArea.height
            });

            // fix accumalative rounding (always floor) errors by stretching a calculated tile
            // if it would otherwise be only 1px away from the edge
            if (rect.x + rect.width === monitorWorkArea.width + monitorWorkArea.x - 1) {
                rect.width++;
            }
            if (rect.y + rect.height === monitorWorkArea.height + monitorWorkArea.y - 1) {
                rect.height++;
            }

            tileAreas[i] = new Tile(monitorIdx, null, rect);
        }
        return tileAreas;
    }

    private getRelativeTileAreasForMonitor(monitorWorkArea: Meta.Rectangle): Rect[] {
        // Base the tiles off of the monitor aspect ratio range.
        //  Note that this is the work area, not the entire monitor area, so large taskbars etc... will be accounted for.
        const aspectRatio = monitorWorkArea.width / monitorWorkArea.height;

        // TODO: Make configurable. These are just my preferences for current 32:9 desktop & 16:9 laptop displays.

        // Super ultra-wide (~32:9) & ultra-wide (~21:9) use priority columns (centre half of screen, left and right quarter) 
        //  with a horizontal split on the left col.
        if (aspectRatio > 2) {
            return [
                { x: 0, y: 0, width: 0.25, height: 0.5 },
                { x: 0, y: 0.5, width: 0.25, height: 0.5 },
                { x: 0.25, y: 0, width: 0.5, height: 1 },
                { x: 0.75, y: 0, width: 0.25, height: 1 },
            ];
        }
        // Otherwise it'll be my laptop screen, split into two columns.
        // Having smaller tiles in the top-level isn't preferably because it's so easy to sub-tile.
        // Fullscreen is easily achieved from either column with <Super>Up, which is nice because it's exclusive fullscreen
        //  with everything else (title bar, app dock) out of view. This is what I want for fullscreen on a small display. 
        else {
            return [
                { x: 0, y: 0, width: 0.5, height: 1 },
                { x: 0.5, y: 0, width: 0.5, height: 1 },
            ];
        }
    }

    private splitLayerTileAreas(topLayerTileAreas: Tile[]) {
        const splitLayerTileAreas = [];
        for (let i = 0; i < topLayerTileAreas.length; i++) {
            const topTile = topLayerTileAreas[i];

            // Split each tile in two along its longest axis.
            //  Vertical split
            if (topTile.height > topTile.width) {
                const w = topTile.width;
                const h = topTile.height / 2;

                // Top
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, topTile, 
                    // @ts-ignore - missing ctor for Meta.Rectange struct
                    new Meta.Rectangle({
                    x: topTile.x,
                    y: topTile.y,
                    width: w,
                    height: h,
                })));
                // Bottom
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, topTile, 
                    // @ts-ignore - missing ctor for Meta.Rectange struct
                    new Meta.Rectangle({
                    x: topTile.x,
                    y: topTile.y + h,
                    width: w,
                    height: h,
                })));
            }
            // Horizontal split (including if tile is exactly square)
            else {
                const w = topTile.width / 2;
                const h = topTile.height;

                // Left
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, topTile, 
                    // @ts-ignore - missing ctor for Meta.Rectange struct
                    new Meta.Rectangle({
                    x: topTile.x,
                    y: topTile.y,
                    width: w,
                    height: h,
                })));
                // Right
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, topTile, 
                    // @ts-ignore - missing ctor for Meta.Rectange struct
                    new Meta.Rectangle({
                    x: topTile.x + w,
                    y: topTile.y,
                    width: w,
                    height: h,
                })));
            }

            // Add the new child tiles (will always be two per loop) as children of this tile.
            topTile.children.push(...splitLayerTileAreas.slice(splitLayerTileAreas.length - 2));
        }
        return splitLayerTileAreas;
    }
}
