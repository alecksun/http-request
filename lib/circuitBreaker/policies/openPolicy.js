"use strict";

const Policy = require("./policy");

class OpenPolicy extends Policy {
    constructor (options, retryAfter) {
        super(options);
        this._timer = setTimeout(() => {
            this.emit('halfOpen');
            this.dispose();
        }, retryAfter || this._options.openDuration);
    }

    isOpen() {
        return true;
    }

    onSuccessCall() {
        return;
    }

    onFailedCall() {
        return;
    }

    dispose() {
        if (this._timer) {
            this.removeAllListeners();
            clearTimeout(this._openTimer);
            this._timer = undefined;
        }
    }
}

Policy.OpenPolicy = OpenPolicy;

module.exports = OpenPolicy;
