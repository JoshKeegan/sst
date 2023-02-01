"use strict";

const {Meta} = imports.gi;
const {layout} = imports.ui;
const Main = imports.ui.main;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const TileRelationshipCalculator = Me.imports.tileRelationshipCalculator.Calculator;
const Tile = Me.imports.tile.Tile;
const TileLayoutPreview = Me.imports.tileLayoutPreview.Preview;

var Tiles = class Tiles {
    constructor() {
        this._previews = null;
        this._layoutSignalId = Main.layoutManager.connect('monitors-changed', this._refreshTiles.bind(this));
        this._refreshTiles();
    }

    getTiles(tileLayer, monitorIdx) {
        return this._tilesByMonitor[tileLayer][monitorIdx];
    }

    getTileLayoutPreview(tileLayer) {
        return this._previews[tileLayer];
    }

    destroy() {
        Main.layoutManager.disconnect(this._layoutSignalId);
        this._destroyPreviews();
    }

    _destroyPreviews() {
        if(this._previews === null) {
            return;
        }
        this._previews.forEach(p => p.destroy());

        this._previews = null;
    }

    _refreshTiles() {
        log("sst: refreshing tiles");

        this._destroyPreviews();

        const monitorWorkAreas = this._getMonitorWorkAreas();

        const topLayerRelTileAreasByMon = monitorWorkAreas.map(this._getRelativeTileAreasForMonitor);

        // tileLayer => monitorIdx => [{ x, y, width, height }]
        this._tilesByMonitor = new Array(3);
        this._tilesByMonitor[0] = this._generateTilesByMonitor(monitorWorkAreas, topLayerRelTileAreasByMon);
        this._tilesByMonitor[1] = this._tilesByMonitor[0].map(this._splitLayerTileAreas);
        this._tilesByMonitor[2] = this._tilesByMonitor[1].map(this._splitLayerTileAreas);

        // tileLayer => [{ x, y, width, height }]
        this._allTiles = this._tilesByMonitor.map(this._generateAllTiles);

        this._previews = this._allTiles.map(tiles => new TileLayoutPreview(tiles));
    }

    _getMonitorWorkAreas() {
        // Assume that all workspaces will be the same & just use the first.
        //  gnome-shell makes the same assumption internally so seems safe enough for now...
        let ws = global.workspace_manager.get_workspace_by_index(0);

        const workAreas = new Array(Main.layoutManager.monitors.length);
        for (let i = 0; i < workAreas.length; i++) {
            workAreas[i] = ws.get_work_area_for_monitor(i);
            log("work area monitor idx: " + i + " w: " + workAreas[i].width + " h: " + workAreas[i].height);
        }
        return workAreas;
    }

    _generateTilesByMonitor(monitorWorkAreas, relativeTileAreasByMonitor) {
        const tilesByMonitor = new Array(monitorWorkAreas.length);        
        for (let i = 0; i < monitorWorkAreas.length; i++) {
            tilesByMonitor[i] = this._calculateTileAreas(i, monitorWorkAreas[i], relativeTileAreasByMonitor[i]);
        }
        return tilesByMonitor;
    }

    _generateAllTiles(tilesByMonitor) {
        let allTiles = [];
        tilesByMonitor.forEach(tiles => allTiles = allTiles.concat(tiles));
        TileRelationshipCalculator.addRelationships(allTiles);
        return allTiles;
    }

    _calculateTileAreas(monitorIdx, monitorWorkArea, relTileAreas) {
        let tileAreas = new Array(relTileAreas.length);
        for (let i = 0; i < tileAreas.length; i++) {
            const relArea = relTileAreas[i];

            tileAreas[i] = new Tile(monitorIdx, {
                x: monitorWorkArea.x + (monitorWorkArea.width * relArea.x),
                y: monitorWorkArea.y + (monitorWorkArea.height * relArea.y),
                width: monitorWorkArea.width * relArea.width,
                height: monitorWorkArea.height * relArea.height
            });
        }
        return tileAreas;
    }

    _getRelativeTileAreasForMonitor(monitorWorkArea) {
        // Base the tiles off of the monitor aspect ratio range.
        //  Note that this is the work area, not the entire monitor area, so large taskbars etc... will be accounted for.
        const aspectRatio = monitorWorkArea.width / monitorWorkArea.height;

        // TODO: Make configurable. These are just my preferences for current 32:9 desktop & 16:9 laptop displays.

        // Super ultra-wide (~32:9) & ultra-wide (~21:9) use preiority columns (centre half of screen, left and right quarter) 
        //  with a horizontal split on the left col.
        if (aspectRatio > 2) {
            return [
                { x: 0, y: 0, width: 0.25, height: 0.5 },
                { x: 0, y: 0.5, width: 0.25, height: 0.5 },
                { x: 0.25, y: 0, width: 0.5, height: 1 },
                { x: 0.75, y: 0, width: 0.25, height: 1 },
            ];
        }
        // Otherwise it'll be my laptop screen, tile horizontally and then also tile the right half vertically.
        else {
            return [
                { x: 0, y: 0, width: 0.5, height: 1 },
                { x: 0.5, y: 0, width: 0.5, height: 0.5 },
                { x: 0.5, y: 0.5, width: 0.5, height: 0.5},
            ];
        }
    }

    _splitLayerTileAreas(topLayerTileAreas) {
        const splitLayerTileAreas = [];
        for (let i = 0; i < topLayerTileAreas.length; i++) {
            const topTile = topLayerTileAreas[i];

            log("w: " + topTile.width + "h: " + topTile.height);

            // Split each tile in two along its longest axis.
            //  Vertical split
            if (topTile.height > topTile.width) {
                const w = topTile.width;
                const h = topTile.height / 2;

                // Top
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, {
                    x: topTile.x,
                    y: topTile.y,
                    width: w,
                    height: h,
                }));
                // Bottom
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, {
                    x: topTile.x,
                    y: topTile.y + h,
                    width: w,
                    height: h,
                }));
            }
            // Horizontal split (including if tile is exacxtly square)
            else {
                const w = topTile.width / 2;
                const h = topTile.height;

                // Left
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, {
                    x: topTile.x,
                    y: topTile.y,
                    width: w,
                    height: h,
                }));
                // Right
                splitLayerTileAreas.push(new Tile(topTile.monitorIdx, {
                    x: topTile.x + w,
                    y: topTile.y,
                    width: w,
                    height: h,
                }));
            }
        }
        return splitLayerTileAreas;
    }
}