"use strict";

const EventEmitter = require("events");

class Policy extends EventEmitter {
    constructor (options) {
        super();
        this._options = {
            breakerWindow: options.breakerWindow || 60000,
            openThreshold: options.openThreshold || 0.8,
            openCountThreshold: options.openCountThreshold || 60,
            openDuration: options.openDuration || 10000,
            maxOpenDuration: options.maxOpenDuration || 60000,
            halfOpenDuration: options.halfOpenDuration || 10000,
            halfOpenThreshold: options.halfOpenThreshold || 0.8,
            halfOpenCountThreshold: options.halfOpenCountThreshold || 10
        };
    }

    isOpen() {

    }

    onSuccessCall() {

    }

    onFailedCall() {

    }

    dispose() {
        
    }
}

module.exports = Policy;
