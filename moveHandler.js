"use strict";

const {windowManager} = imports.ui;
const {Clutter, GLib, Meta} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const MainExtension = Me.imports.extension;
const GNOME_VERSION = parseFloat(imports.misc.config.PACKAGE_VERSION);

var Handler = class MoveHandler {
    constructor() {
        const isMoving = grabOp => [Meta.GrabOp.MOVING, Meta.GrabOp.KEYBOARD_MOVING].includes(grabOp);

        this._displaySignals = [];
        this._displaySignals.push(global.display.connect("grab-op-begin", (...params) => {
            // pre GNOME 40 the signal emitter was added as the first and second param, fixed with !1734 in mutter
            const [window, grabOp] = [params[params.length - 2], params[params.length - 1]];
            if (window && isMoving(grabOp))
                this._onMoveStarted(window, grabOp);
        }));
        this._displaySignals.push(global.display.connect("grab-op-end", (...params) => {
            // pre GNOME 40 the signal emitter was added as the first and second param, fixed with !1734 in mutter
            const [window, grabOp] = [params[params.length - 2], params[params.length - 1]];
            if (window && isMoving(grabOp))
                this._onMoveFinished(window);
        }));

        this._posChangedId = 0;
        this._lastActive = false;

        this._tilePreview = new windowManager.TilePreview();

        // metaRect, which the grabbed window will tile to
        this._tileRect = null;
    }

    destroy() {
        this._displaySignals.forEach(sId => global.display.disconnect(sId));
        (GNOME_VERSION < 3.36 ? this._tilePreview.actor : this._tilePreview).destroy();
        this._tilePreview = null;
    }

    _onMoveStarted(window, grabOp) {
        log("sst: move started");

        this._posChangedId = window.connect("position-changed"
            , this._onMoving.bind(this, grabOp, window));
    }

    _onMoveFinished(window) {
        log("sst: moved finished");

        if (this._posChangedId) {
            window.disconnect(this._posChangedId);
            this._posChangedId = 0;
        }

        if (this._isMouseSnapKeyPressed()) {
            this._moveWindow(window, this._tileRect);
        }

        this._tilePreview.close();
        this._tileRect = null;
    }

    _onMoving(grabOp, window) {
        log("sst: on moving");

        let active = this._isMouseSnapKeyPressed();
        log("sst: mouse snap key pressed " + active);

        if (active) {
            this._draw(grabOp, window);
        }
        else if (this._lastActive) {
            this._undraw();
        }
        this._lastActive = active;
    }

    _isMouseSnapKeyPressed() {
        // TODO: Make key configurable
        const modMask = Clutter.ModifierType.CONTROL_MASK;

        const event = Clutter.get_current_event();
        const modifiers = event ? event.get_state() : 0;
        return (modifiers & modMask) !== 0;
    }

    _draw(grabOp, window) {
        const monitorIdx = global.display.get_current_monitor();

        const zones = MainExtension.tilingZones.getZones(monitorIdx);
        // TODO: Would be nice to display all possible zones (perhaps even on all monitors)
        //  separate to the tile preview

        // TODO: Select the zone that the cursor intersects
        const pointer = global.get_pointer();
        log('sst: ptr x: ' + pointer[0] + ' y: ' + pointer[1]);

        const tRect = this._selectZone(zones, pointer[0], pointer[1]);

        if (tRect != this._tileRect) {
            // If we already have another tile selected (window is being dragged), we have to close the existing one before
            //  opening a new preview. Also delay showing the next preview, if we reuse the tile preview whilst the last one is 
            //  still animating away then it won't be shown.
            if (this._tileRect !== null) {
                this._tilePreview.close();
                GLib.timeout_add(GLib.PRIORITY_HIGH, 250, () => this._tilePreview.open(window, tRect, monitorIdx));
            }
            else {
                this._tilePreview.open(window, tRect, monitorIdx);
            }
            this._tileRect = tRect;
        }
    }

    _undraw() {
        this._tilePreview.close();
        this._tileRect = null;
    }

    _selectZone(zones, xPtr, yPtr) {
        return zones.find(zone => 
            zone.x <= xPtr && 
            zone.x + zone.width > xPtr &&
            zone.y <= yPtr &&
            zone.y + zone.height > yPtr);
    }

    _moveWindow(window, rect) {
        window.move_resize_frame(false, rect.x, rect.y, rect.width, rect.height);
    }
}