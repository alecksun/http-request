"use strict";

const Policy = require("./policy");

class HalfOpenPolicy extends Policy {
    constructor (options) {
        super(options);

        this._windowStart = Date.now();
        this._totalCount = 0;
        this._failedCount = 0;

        this._timer = setTimeout(() => { 
            this.emit('close');
            this.dispose();
        }, this._options.halfOpenDuration);
    }

    isOpen() {
        return Math.random() < 0.5;
    }

    onSuccessCall() {
        this._totalCount ++;
        this._failedCount ++;
        return this;
    }

    onFailedCall() {
        this._totalCount ++;
        this._failedCount ++;

        if (this._failedCount < this._options.halfOpenCountThreshold)
            return;
        if (this._failedCount / this._totalCount > this._options.halfOpenThreshold) {
            this.emit('open');
            this.dispose();
        }

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

Policy.HalfOpenPolicy = HalfOpenPolicy;

module.exports = HalfOpenPolicy;
