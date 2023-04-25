const {main} = imports.ui;

import Clutter from "@girs/clutter-12";
import GObject from "@girs/gobject-2.0";
import St from "@girs/st-12";

import Tile from "./tile"

const ANIMATION_TIME = 250;

// TODO: When inhertiting from a GI type, we need to use GObject.registerClass
// Below is a workaround so that we export both the type and the registered instance
// Ideally this wouldn't be required and the GJS esbuild plugin needs to change the output 
// from the ES6 class to:
// var TileLayoutPreviewItem = GObject.registerClass(
// class TileLayoutPreviewItem extends St.Widget {

/**
 * Displays a preview of a single tile by drawing its border on-screen. 
 * Used as part of the wider TileLayoutPreview to preview all tiles in a layer. 
 */
class Type extends St.Widget {
    private showing: boolean = false;

    /**
     * GJS < 1.72 (GNOME < 42) required overriding _init rather than the ctor
     * for classes inheriting from GObject.
     * https://gjs.guide/guides/gobject/subclassing.html#subclassing-gobject
     * For compatibility, we must do the same.
     * 
     * For types to be correct in the constructor call, we also define a constructor
     * that does nothing, but takes the same parameters as _init
     */
    constructor(tile: Tile) {
        super();
    }
    _init(tile: Tile) {
        super._init({
            x: tile.x,
            y: tile.y,
            width: tile.width,
            height: tile.height,
            opacity: 0,
            style_class: "tile-layout-preview",
        });

        main.layoutManager.uiGroup.add_child(this);
    }

    destroy() {
        this.close();
        main.layoutManager.uiGroup.remove_child(this);
        super.destroy();
    }

    open() {
        if (this.showing) {
            return;
        }
        this.showing = true;
        
        this.show();
        // @ts-ignore - .ease is a gnome-shell convenience method around the clutter API
        this.ease({
            opacity: 255,
            duration: ANIMATION_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    close() {
        if(!this.showing) {
            return;
        }
        this.showing = false;

        // @ts-ignore - .ease is a gnome-shell convenience method around the clutter API
        this.ease({
            opacity: 0,
            duration: ANIMATION_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.hide(),
        });
    }
}

var Registered = GObject.registerClass(Type);

export {Type, Registered};
