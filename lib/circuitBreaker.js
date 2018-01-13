'use strict';

const timer = require("./timer");


class CircuitBreaker {
    constructor(name) {
        this.name = name;
        this.reset();
    }

    reset() {
        this.isBroken = false;
        this.retryAfter = null;
    }

    check(logger) {
        if (this.isBroken) {
            let retryAfter = 5;
            if (this.retryAfter) {
                retryAfter = this.retryAfter - Date.now();
                if (retryAfter <= 5000)
                    retryAfter = 5000; // at least wait for 5 second
            }

            logger(`[CircuitBreaker] [name=this.name] Circuit already broke, Need to retry after ${retryAfter / 1000} seconds`);
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
            let retryAfter = 30; // default value
            if (httpHeaders['retry-after']) {
                const isNumber = /^\d+$/;

                if (httpHeaders['retry-after'].constructor === Number) {
                    retryAfter = httpHeaders['retry-after'];
                } else if (isNumber.test(httpHeaders['retry-after'])) {
                    retryAfter = parseInt(httpHeaders['retry-after']);
                } else {
                    // test if the header is a date
                    const date = Date.parse(httpHeaders['retry-after']);
                    if (!isNaN(date) && date > Date.now()) {
                        retryAfter = (date - Date.now()) / 1000;
                    }
                }
            }

            logger('[CircuitBreaker] [name=this.name], Got a 429, circuit will be broken for 30 seconds')
            this.break(retryAfter);
        }
    }

    break(seconds) {
        this.retryAfter = Date.now() + seconds * 1000;
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
