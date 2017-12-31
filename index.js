'use strict';

const request = require('./lib/request');

module.exports = {
    request: request.createHTTPRequest
};
