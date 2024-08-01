declare module "resource:///org/gnome/shell/ui/windowManager.js" {
    export class TilePreview extends (await import('@girs/st-12')).St.Widget {
        public open(
            window: import('@girs/meta-12').Meta.Window,
            tileRect: import('@girs/meta-12').Meta.Rectangle,
            monitorIndex: number,
        ): void;

        public close(): void;
    }
}
