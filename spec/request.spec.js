'use strict';
const { request }= require('../');

const http = require("http");
const https = require("https");

var mockserver = require('mockserver-node');

describe("request", () => {
    before(() => {
        mockserver.start_mockserver({
            serverPort: 1080,
            proxyPort: 1090,
            verbose: true
        });
    });

    beforeEach(() => {

    });

    afterEach(() => {

    });


    describe("pass all parameters in constructor", () => {
        it('should work', done => {
            const req = {
                write: jasmine.createSpy(),
                end: jasmine.createSpy()
            };

            const res = {
                on: jasmine.createSpy().and.callFake()
            }


            spyOn(http, 'request').and.callFake((options, cb) => {
                cb(null, );
                return req;
            });

            request('method', 'http://test-url', { "x-header": "my-header" }, "test payload").send().then(result => {
                expect(http.request).toHaveBeenCalled();
                expect(http.request.calls.argsFor(0)[0].host).toBe("test-url");
                done();
            }).catch(err => {
                done.fail(err);
            });
        });
    });
});