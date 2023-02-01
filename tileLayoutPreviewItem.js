"use strict";

const {main} = imports.ui;
const {Clutter, GObject, St} = imports.gi;

const ANIMATION_TIME = 250;

var Item = GObject.registerClass(
    class TileLayoutPreviewItem extends St.Widget {
        _init(tile) {
            super._init({
                x: tile.x,
                y: tile.y,
                width: tile.width,
                height: tile.height,
                opacity: 0,
                style_class: "tile-layout-preview",
            });
            this._showing = false;

            main.uiGroup.add_child(this);
        }

        destroy() {
            this.close();
            super.destroy();
        }

        open() {
            if (this._showing) {
                return;
            }
            this._showing = true;
            
            this.show();
            this.ease({
                opacity: 255,
                duration: ANIMATION_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }

        close() {
            if(!this._showing) {
                return;
            }
            this._showing = false;

            this.ease({
                opacity: 0,
                duration: ANIMATION_TIME,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => this.hide(),
            });
        }
    }
)