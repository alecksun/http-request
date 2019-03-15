"use strict";

const Policies = require("./policies");

const getRetryAfter = retryAfter => {
    if (!retryAfter)
        return null;
    const isNumber = /^\d+$/;
    if (retryAfter.constructor === Number) {
        return retryAfter;
    } else if (isNumber.test(retryAfter)) {
        return Number.parseInt(retryAfter);
    } else {
        const date = Date.parse(retryAfter);
        if (!isNaN(date) && date > Date.now()) {
            return (date - Date.now()) / 1000;
        }
    }
    return null;
};


class Breaker {
    constructor(logger, name, options) {
        this.name = name;
        if (logger.createLogger) {
            this.logger = logger.createLogger({
                Circuit: name
            });
        } else {
            this.logger = logger;
        }
        this.options = { 
            ...options 
        };
        this.createPolicy(Policies.ClosedPolicy, this.options); // By default circuit is closed
    }

    createPolicy(PolicyClass, retryAfter) {
        this._retryAfter = retryAfter;
        if (this._policy)
            this._policy.dispose();
        this._policy = new PolicyClass(this.options, retryAfter);
        this._policy.on('open', () => {
            this.logger.error(`Circuit is open`);
            this.createPolicy(Policies.OpenPolicy);
        });

        this._policy.on('close', () => {
            this.logger.info(`Circuit is closed`);
            this.createPolicy(Policies.ClosedPolicy);
        });

        this._policy.on('halfOpen', () => {
            this.logger.info(`Circuit is half-open`);
            this.createPolicy(Policies.HalfOpenPolicy);
        });
    }

    isOpen() {
        return this._policy.isOpen();
    }

    retryAfter() {
        return this._retryAfter || this._options.openDuration;
    }

    onRequest(statusCode, header) {
        if (statusCode < 400) {
            // That is a success
            this._policy.onSuccessCall();
        } else if (statusCode < 500 && statusCode !== 429) {
            // That is rather a user error instead of a server issue
            this._policy.onSuccessCall();
        } else {
            const retryAfter = getRetryAfter(header["retry-after"]);
            if (retryAfter || statusCode === 429) {
                this._policy.dispose(); // clear current policy and create an open policy
                this.logger.error(`Circuit is open`);
                this.createPolicy(Policies.OpenPolicy, retryAfter || 10000);  // server specify 429, do what it says
            } else {
                this._policy.onFailedCall();
            }
        }
    }
}

module.exports = Breaker;
