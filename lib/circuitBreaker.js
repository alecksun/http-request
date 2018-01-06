'use strict';

const timer = require("./timer");


class CircuitBreaker {
    constructor(name) {
        this.name = name;
        this.isBroken = false;
        this.retryAfter = null;
    }

    check(logger) {
        if (this.isBroken) {
            let retryAfter = 5;
            if (this.retryAfter) {
                retryAfter = this.retryAfter - Date.now();
                if (retryAfter <= 5)
                    retryAfter = 5; // at least wait for 5 second
            }

            logger(`[CircuitBreaker] [name=this.name] Circuit already broke, Need to retry after ${retryAfter} seconds`);
            return Promise.reject(this.make429(retryAfter));
        } else {
            return Promise.resolve();
        }
    }

    make429(retryAfter) {
        return {
            status: 429,
            headers: {
                "retry-after": retryAfter,
                "x-circuit-breaker": this.name
            },
            body: {}
        }
    }

    breakOnError(logger, httpStatus, httpHeaders) {
        if (this.isBroken || httpHeaders["x-circuit-breaker"] === this.name) {
            // circuit already broken, we don't need to break it again
            return;
        }

        if (httpStatus === 429) {
            // Too many request, we must break the circuit
            // TODO: we need to check the retry-after header, for now, just simply break it for 30 seconds
            logger('[CircuitBreaker] [name=this.name], Got a 429, circuit will be broken for 30 seconds')
            this.break(30);
        }
    }

    break(seconds) {
        this.retryAfter = Date.now() * seconds * 1000;
        this.isBroken = true;
        timer.sleep(seconds * 1000).then(() => {
            // reset it after these seconds
            this.isBroken = false;
            this.retryAfter = null;
        });
    }
}



const __circuitBreakers = {}

const getCircuitBreaker = (name) => {
    if (!__circuitBreakers[name]) {
        __circuitBreakers[name] = new CircuitBreaker(name)
    }

    return __circuitBreakers[name];
}

module.exports = getCircuitBreaker;
