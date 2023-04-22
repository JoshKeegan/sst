// Don't use imports here, do them inline via import()
// https://stackoverflow.com/a/51114250

declare const global: Global,
    log: any,
    logError: any;

interface Global {
    get_current_time(): number;
    get_pointer(): [x: number, y: number, modifiers: number];
    //get_window_actors(): Meta.WindowActor[];
    log(msg: string): void;
    logError(error: any): void

    display: import('@girs/meta-12').Meta.Display;
    run_at_leisure(func: () => void): void;
    session_mode: string;
    //stage: Clutter.Actor;
    //window_group: Clutter.Actor;
    //window_manager: Meta.WindowManager;
    workspace_manager: import('@girs/meta-12').Meta.WorkspaceManager;
}

