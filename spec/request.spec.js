'use strict';
const { request }= require('../');

const getCircuitBreaker = require('../lib/circuitBreaker');

const http = require("http");
const https = require("https");
const nock = require("nock");




describe("request", () => {

    beforeEach(() => {

    });

    afterEach(() => {
        nock.cleanAll();
        getCircuitBreaker('test').reset();
    });


    describe("pass all parameters in constructor", () => {
        it('should work', done => {
            const req = nock("http://test-url").get("/path").query({ query: "value" }).reply(200, "result");

            request('http://test-url/path?query=value', 'get', { "x-header": "my-header" }, "test payload").send().then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });
    });

    describe("chain", () => {
        it("should work", done => {
            const req = nock("http://test-url").get("/path").reply(200, "result");

            request('http://test-url/path').method('get').headers({ "x-header": "my-header" }).body("test payload").send().then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("send a string hould work", done => {
            const req = nock("http://test-url").get("/path").reply(200, "result");

            request('http://test-url/path').method('get').headers({ "x-header": "my-header" }).send('test payload').then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("send a buffer hould work", done => {
            const req = nock("http://test-url").get("/path").reply(200, "result");

            request('http://test-url/path').method('get').headers({ "x-header": "my-header" }).send(Buffer.from('test payload')).then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("send a json hould work", done => {
            const req = nock("http://test-url").get("/path").reply(200, "result");

            request('http://test-url/path').method('get').headers({ "x-header": "my-header" }).json({ key: "value" }).then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("get hould work", done => {
            const req = nock("http://test-url").get("/path").reply(200, "result");

            request('http://test-url/path').get().send().then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("post hould work", done => {
            const req = nock("http://test-url").post("/path").reply(200, "result");

            request('http://test-url/path').post().send("aaa").then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("put hould work", done => {
            const req = nock("http://test-url").put("/path").reply(200, "result");

            request('http://test-url/path').put().send("aaa").then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("delete hould work", done => {
            const req = nock("http://test-url").delete("/path").reply(200, "result");

            request('http://test-url/path').delete().send().then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });


        it("async get headers", done => {
            const req = nock("http://test-url").get("/path").reply(200, "result");

            const getHeaders = process.nextTick(() => {
                return Promise.resolve({ "x-header-1": "my-header-1", "x-header-2": "my-header-2" });
            })

            request('http://test-url/path').method('get').headers(getHeaders).json({ key: "value" }).then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("logger should work", done => {
            const req = nock("http://test-url").post("/path").reply(200, "result");

            request('http://test-url/path').logger(console.log).post().send("aaa").then(result => {
                expect(result.body).toBe('result');
                expect(result.status).toBe(200);
                done();
            }).catch(err => {
                done.fail(err);
            });
        });

        it("circuit reject on error", done => {
            const req = nock("http://test-url").post("/path").reply(500, "result");

            request('http://test-url/path').logger(console.log).post().send("aaa").then(result => {
                done.fail("should fail");
            }).catch(err => {
                expect(err.status).toBe(500);
                expect(err.body).toBe('result');
                done();
            });
        });

        it("circuit should break on 429 should work with Retry-After being seconds", done => {
            const req = nock("http://test-url").post("/path").reply(429, "result", { 'Retry-After': 50 });

            request('http://test-url/path').circuitBreaker('test').post().send("aaa").catch(err => {
                expect(err.status).toBe(429);
                expect(err.body).toBe('result');

                return request('http://test-url/path').logger(console.log).circuitBreaker('test').post().send("aaa");
            }).catch(err => {
                expect(err.status).toBe(429);
                done();
            });
        });

        it("circuit should break on 429 should work with Retry-After being seconds in string format", done => {
            const req = nock("http://test-url").post("/path").reply(429, "result", { 'Retry-After': '60' });

            request('http://test-url/path').circuitBreaker('test').post().send("aaa").catch(err => {
                expect(err.status).toBe(429);
                expect(err.body).toBe('result');

                return request('http://test-url/path').logger(console.log).circuitBreaker('test').post().send("aaa");
            }).catch(err => {
                expect(err.status).toBe(429);
                done();
            });
        });

        it("circuit should break on 429 should work with Retry-After being a date", done => {
            const date = new Date(Date.now() + 70000);
            const req = nock("http://test-url").post("/path").reply(429, "result", { 'Retry-After': date.toUTCString() });

            request('http://test-url/path').circuitBreaker('test').post().send("aaa").catch(err => {
                expect(err.status).toBe(429);
                expect(err.body).toBe('result');

                return request('http://test-url/path').logger(console.log).circuitBreaker('test').post().send("aaa");
            }).catch(err => {
                expect(err.status).toBe(429);
                done();
            });
        });
    })
});
