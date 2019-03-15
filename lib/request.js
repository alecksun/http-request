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

        this._logger = {
            info: () => {},
            error: () => {}
        };
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

    body(value) {
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
            this.body(value);
        }

        return this._promise.then(() => {
            const _header = this.logHeader ? JSON.stringify(this._headers) : "******";
            const _body = this.logBody ? this._payload : "******";
            this._logger.info(`[HTTP Request] [Method=${this._method}] [URL=${this._url}] HEADER=${_header} BODY=${_body}`);

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
                    if (this._circuitBreaker && this._circuitBreaker.isOpen()) {
                        const _header = this.logHeader ? JSON.stringify(this._headers) : "******";
                        this._logger.error(`[HTTP Response] [Method=${this._method}] [URL=${this._url}] [Status=${429}] HEADER=${_header} Circuit is open`);
                        reject({
                            status: 429,
                            headers: {
                                "retry-after": this._circuitBreaker.retryAfter()
                            },
                            payload: ""
                        });
                        return;
                    }

                    Promise.resolve().then(() => {
                        const req = protocol.request(options, res => {
                            try {
                                const statusCode = res.statusCode;
                                const headers = res.headers;
                                let payload = new Buffer("");
                                res.on("data", chunk => {
                                    payload = payload + chunk;
                                });

                                res.on("end", () => {
                                    try {
                                        payload = JSON.parse(payload);
                                    } catch (err) {}

                                    this._result = {
                                        status: statusCode,
                                        headers: headers,
                                        body: payload
                                    };

                                    const _header = this.logHeader ? JSON.stringify(this._headers) : "******";
                                    const _body = this.logBody ? this._payload : "******";
                                    if (statusCode < 400) {
                                        this._logger.info(`[HTTP Response] [Method=${this._method}] [URL=${this._url}] HEADER=${_header} BODY=${_body}`);
                                        resolve(this._result);
                                    }
                                    else {
                                        // There is an error, we need to record the error for this host
                                        // if the error is 409, we break the circuit directly
                                        // if the error is 5xx, we record the frequency and break it if we get lots of 5xx in 5 seconds
                                        //circuitBreaker.breakCircuit(statusCode, headers);

                                        if (this._circuitBreaker) {
                                            this._circuitBreaker.onRequest(statusCode, headers);
                                        }
                                        this._logger.error(`[HTTP Response] [Method=${this._method}] [URL=${this._url}] HEADER=${_header} BODY=${_body}`);
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

                        req.on("error", err => {
                            reject(err);
                        })

                        if (this._payload) {
                            req.write(this._payload);
                        }
                        req.end();
                    }).catch(err => {
                        reject(err);
                    });

                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    json(value) {
        return this.headers({"content-type": "application/json"}).body(JSON.stringify(value)).send();
    }

    get() {
        return this.method("GET");
    }

    post() {
        return this.method("POST");
    }

    put() {
        return this.method("PUT");
    }

    delete() {
        return this.method("DELETE");
    }

    logger(value, logHeader = false, logBody = true) {
        this._logger = value;
        this.logHeader = logHeader;
        this.logBody = logBody;
        return this;
    }

    circuitBreaker(breaker) {
        this._circuitBreaker = breaker;
        return this;
    }
}


function createHTTPRequest (url, method, headers, payload) {
    return new Request(method, url, headers, payload);
}


module.exports = {
    createHTTPRequest
};
