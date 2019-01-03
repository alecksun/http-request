"use strict";

const Policy = require("./policy");

class ClosedPolicy extends Policy {
    constructor (options) {
        super(options);

        this._windowStart = Date.now();
        this._totalCount = 0;
        this._failedCount = 0;
    }

    isOpen() {
        return false;
    }

    onSuccessCall() {
        this._resetWindow();
        this._totalCount ++;
        return;
    }

    onFailedCall() {
        this._resetWindow();
        this._totalCount ++;
        this._failedCount ++;
        if (this._failedCount < this._options.openCountThreshold)
            return;
        if (this._failedCount / this._totalCount > this._options.openThreshold)
            this.emit("open");

        return;
    }

    _resetWindow() {
        const now = Date.now();
        if (this._windowStart + this._options.breakerWindow < now) {
            this._windowStart = now;
            this._totalCount = 0;
            this._failedCount = 0;
        }
    }
}

Policy.ClosedPolicy = ClosedPolicy;

module.exports = ClosedPolicy;
