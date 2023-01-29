"use strict";

const {Meta} = imports.gi;
const {layout} = imports.ui;
const Main = imports.ui.main;

var Zones = class TilingZones {
    constructor() {
        this._layoutSignalId = Main.layoutManager.connect('monitors-changed', this._refreshZones.bind(this));
        this._refreshZones();
    }

    getZones(monitorIdx) {
        return this._zoneAreas[monitorIdx];
    }

    destroy() {
        Main.layoutManager.disconnect(this._layoutSignalId);
    }

    _refreshZones() {
        log("sst: refreshing zones");

        // Assume that all workspaces will be the same & just use the first.
        //  gnome-shell makes the same assumption internally so seems safe enough for now...
        let ws = global.workspace_manager.get_workspace_by_index(0);

        this._zoneAreas = new Array(Main.layoutManager.monitors.length);        
        for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
            const monitorWorkArea = ws.get_work_area_for_monitor(i);
            log("work area monitor idx: " + i + " w: " + monitorWorkArea.width + " h: " + monitorWorkArea.height);

            // monitor idx => { x, y, width, height }
            this._zoneAreas[i] = this._calculateZoneAreas(monitorWorkArea);
        }
    }

    _calculateZoneAreas(monitorWorkArea) {
        const relZoneAreas = this._getRelativeZoneAreasForMonitor(monitorWorkArea);
        let zoneAreas = new Array(relZoneAreas.length);
        for (let i = 0; i < zoneAreas.length; i++) {
            const relArea = relZoneAreas[i];

            // Use Meta.Rectangle as this rect will be what gets passed into the tile preview &  window resize calls
            //  it adds methods such as .equal() that gnome-shell uses.
            zoneAreas[i] = new Meta.Rectangle({
                x: monitorWorkArea.x + (monitorWorkArea.width * relArea.x),
                y: monitorWorkArea.y + (monitorWorkArea.height * relArea.y),
                width: monitorWorkArea.width * relArea.width,
                height: monitorWorkArea.height * relArea.height
            });
        }
        return zoneAreas;
    }

    _getRelativeZoneAreasForMonitor(monitorWorkArea) {
        // Base the zones off of the monitor aspect ratio range.
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
}