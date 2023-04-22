import Meta from "@girs/meta-12"

import Tile from "./tile";

export default interface TiledWindow extends Meta.Window {
    tile: Tile | null;
}
