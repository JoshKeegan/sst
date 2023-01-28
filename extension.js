/* exported init */

class Extension {
    constructor() {
    }

    enable() {
        log("enable sst");
    }

    disable() {
        log("disable sst");
    }
}

function init() {
    log("Init sst");
    return new Extension();
}
