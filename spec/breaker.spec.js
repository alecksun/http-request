"use strict";
const Breaker = require("../lib/circuitBreaker");
const timer = require("../lib/timer");
const Logger = require("logger");
const logger = new Logger("UnitTest");

const breakerState = breaker => {
    let count = 0;
    for (let i = 0; i < 10; i++)
        if (breaker.isOpen())
            count ++;
    switch (count) {
        case 0:
            return "CLOSED";
        case 10:
            return "OPEN";
        default:
            return "HALF-OPEN";
    }
}

describe("Breaker", () => {
    describe("closed", () => {
        it("should pass in normal case", () => {
            const breaker = new Breaker(logger, "test");
            expect(breakerState(breaker)).toBe('CLOSED');
        });

        it("should swhich to open for many 5xx", () => {
            const breaker = new Breaker(logger, "test");

            for (let i = 0; i < 59; i++) {
                breaker.onRequest(500, {});
                expect(breaker.isOpen()).toBe(false);
            }

            breaker.onRequest(500, {});
            expect(breakerState(breaker)).toBe('OPEN');
        });

        it("should not switch to open for 4xx", () => {
            const breaker = new Breaker(logger, "test");

            for (let i = 0; i < 60; i++) {
                breaker.onRequest(400, {});
                expect(breakerState(breaker)).toBe('CLOSED');
            }
        });

        it("should switch to open on 429", () => {
            const breaker = new Breaker(logger, "test");
            expect(breakerState(breaker)).toBe('CLOSED');
            breaker.onRequest(429, {});
            expect(breakerState(breaker)).toBe('OPEN');
        });

        it("should switch to half open and closed", async done => {
            try {
                const breaker = new Breaker(logger, 'test', {
                    halfOpenDuration: 300
                });
                expect(breaker.isOpen()).toBe(false);
                breaker.onRequest(429, {
                    "retry-after" : 100
                });
                expect(breakerState(breaker)).toBe('OPEN');

                await timer.sleep(200);
                expect(breakerState(breaker)).toBe('HALF-OPEN');

                // wait until it close
                await timer.sleep(500);
                expect(breakerState(breaker)).toBe('CLOSED');

                done();
            } catch (err) {
                done.fail(err);
            }
        });

        it("should switch to half open and open if still fail", async done => {
            try {
                const breaker = new Breaker(logger, 'test', {
                    halfOpenDuration: 500
                });
                expect(breaker.isOpen()).toBe(false);
                breaker.onRequest(429, {
                    "retry-after" : 100
                });
                expect(breakerState(breaker)).toBe('OPEN');

                await timer.sleep(200);
                expect(breakerState(breaker)).toBe('HALF-OPEN');

                for (let i = 0; i < 10; i++)
                    breaker.onRequest(500, {});

                expect(breakerState(breaker)).toBe('OPEN');

                done();
            } catch (err) {
                done.fail(err);
            }
        });

        it("should switch to half open and open if 429", async done => {
            try {
                const breaker = new Breaker(console, 'test', {
                    halfOpenDuration: 500
                });
                expect(breaker.isOpen()).toBe(false);
                breaker.onRequest(429, {
                    "retry-after" : 100
                });
                expect(breakerState(breaker)).toBe('OPEN');

                await timer.sleep(200);
                expect(breakerState(breaker)).toBe('HALF-OPEN');

                breaker.onRequest(429, {
                    "retry-after" : 100
                });

                expect(breakerState(breaker)).toBe('OPEN');

                done();
            } catch (err) {
                done.fail(err);
            }
        });
    });
});
