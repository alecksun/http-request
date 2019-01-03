'use strict';

const request = require('./lib/request');
const Breaker = require('./lib/circuitBreaker');

module.exports = {
    request: request.createHTTPRequest,
    Breaker
};
