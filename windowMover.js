"use strict";

var Mover = class WindowMover {
    static move(window, tile) {
        window.move_resize_frame(false, tile.x, tile.y, tile.width, tile.height);
    }
}