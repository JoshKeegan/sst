"use strict";

const {layout} = imports.ui;
const Main = imports.ui.main;

var Zones = class TilingZones {
    constructor() {
        // TODO: Make configurable
        // TODO: Apply different relative zone areas depending on monitor aspect ratio.
        // These are my preference for a super-ultrawide but on a 16:9 or 16:10 widescreen (e.g. laptop)
        // I would not want as many columns.
        this._relativeZoneAreas = [
            { x: 0, y: 0, width: 0.25, height: 0.5 },
            { x: 0, y: 0.5, width: 0.25, height: 0.5 },
            { x: 0.25, y: 0, width: 0.5, height: 1 },
            { x: 0.75, y: 0, width: 0.25, height: 1 },
        ];

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
        let zoneAreas = new Array(this._relativeZoneAreas.length);
        for (let i = 0; i < zoneAreas.length; i++) {
            const relArea = this._relativeZoneAreas[i];

            zoneAreas[i] = {
                x: monitorWorkArea.x + (monitorWorkArea.width * relArea.x),
                y: monitorWorkArea.y + (monitorWorkArea.height * relArea.y),
                width: monitorWorkArea.width * relArea.width,
                height: monitorWorkArea.height * relArea.height
            };
        }
        return zoneAreas;
    }
}