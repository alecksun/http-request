"use strict";
const url = require("url");
const http = require("http");
const https = require("https");

class Request {
    constructor(method, url, headers = {}, payload) {
        this._url = url;
        this._method = method;
        this._headers = headers;
        this._payload = payload;

        this._promise = Promise.resolve();
    }

    method(value) {
        this._promise = this._promise.then().then(() => value).then(v => {
            this._method = v;
        });
        return this;
    }

    headers(value = {}) {
        this._promise = this._promise.then().then(() => value).then(h => {
            this._headers = Object.assign({}, this._headers, h);
        });

        return this;
    }

    payload(value) {
        this._promise = this._promise.then().then(() => value).then(p => {
            if (p instanceof Buffer) {
                this._payload = p;
            } else if (p) {
                this._payload = Buffer.from(p.toString());
            }

            if (p) {
                this._headers = Object.assign({}, this._headers, { "content-length": this._payload.length });
            }
        });
        return this;
    }

    send(value) {
        if (value) {
            this.payload(value);
        }

        return this._promise.then(() => {
            return new Promise((resolve, reject) => {
                try {
                    const options = new url.parse(this._url);
                    options.method = this._method;
                    options.headers = this._headers;

                    let protocol;
                    if (options.protocol.toLowerCase() === "http:") {
                        protocol = http;
                    } else if (options.protocol.toLowerCase() === "https:") {
                        protocol = https;
                    } else {
                        // we only support http and https
                        reject(new Error(`Unsupported Protocol: ${options.protocol}`));
                    }

                    // check if circuate has broken
                    // const retryAfter = circuitBreaker.checkCircuit(options.host);
                    // if (retryAfter > 0) {
                    //     reject({
                    //         statusCode: 409,
                    //         headers: {
                    //             "retry-after": retryAfter
                    //         },
                    //         payload: ""
                    //     });

                    //     return;
                    // }

                    const req = protocol.request(options, res => {
                        try {
                            const statusCode = res.statusCode;
                            const headers = res.headers;
                            let payload = new Buffer("");
                            res.on("data", chunk => {
                                payload = payload + chunk;
                            });

                            res.on("end", () => {
                                this._result = {
                                    statusCode,
                                    headers,
                                    payload
                                };
                                if (statusCode < 400)
                                    resolve(this._result);
                                else {
                                    // There is an error, we need to record the error for this host
                                    // if the error is 409, we break the circuit directly
                                    // if the error is 5xx, we record the frequency and break it if we get lots of 5xx in 5 seconds
                                    //circuitBreaker.breakCircuit(statusCode, headers);

                                    reject(this._result);
                                }
                            });

                            res.on("error", err => {
                                reject(err);
                            });
                        } catch (err) {
                            reject(err);
                        }
                    });

                    if (this._payload) {
                        req.write(this._payload);
                    }
                    req.end();
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    json(value) {
        return this.payload(JSON.stringify(value)).send();
    }

    get() {
        return this.method("GET").send();
    }

    post() {
        return this.method("POST").send();
    }

    put() {
        return this.method("PUT").send();
    }

    delete() {
        return this.method("DELETE").send();
    }
}


function createHTTPRequest (method, url, headers, payload) {
    return new Request(method, url, headers, payload);
}


module.exports = {
    createHTTPRequest
};
