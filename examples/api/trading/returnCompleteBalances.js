#!/usr/bin/env node
/*
 *
 * poloniex-unofficial
 * https://git.io/polonode
 *
 * Yet another unofficial Node.js wrapper for the Poloniex cryptocurrency
 * exchange APIs.
 *
 * Copyright (c) 2016 Tyler Filla
 *
 * This software may be modified and distributed under the terms of the MIT
 * license. See the LICENSE file for details.
 *
 */

"use strict";

// Import main module
const polo = require("./../../../");

// Obtain API credentials from environment
const apiKey = process.env.POLONIEX_API_TEST_NOP_KEY;
const apiSecret = process.env.POLONIEX_API_TEST_NOP_SECRET;

// Create authenticated trading API wrapper
const poloTrading = new polo.TradingWrapper(apiKey, apiSecret);

// Demonstrate the returnCompleteBalances command without account parameter
poloTrading.returnCompleteBalances((err, response) => {
    if (err) {
        throw err.msg;
    }

    console.log("Without account parameter:");
    console.log(response);
});

// Command parameters (with optional parameter)
let params2 = {
    account: "all"
};

// Demonstrate the returnCompleteBalances command with account parameter
poloTrading.returnCompleteBalances(params2, (err, response) => {
    if (err) {
        throw err.msg;
    }

    console.log("With account parameter set to \"all\":");
    console.log(response);
});
