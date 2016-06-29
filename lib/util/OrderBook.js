
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

/*
 * NOTICE: This file needs documentation revisions.
 */

// Localize wrappers
var PushWrapper = module.parent.exports.PushWrapper;
var PublicWrapper = module.parent.exports.PublicWrapper;

// Do not continue without these wrappers
if (!PushWrapper || !PublicWrapper) {
    throw "Failed to localize wrappers (OrderBook.js should not be require()'d externally)";
}

/*
 * Order book utility constructor.
 */
function OrderBook(currencyPair) {
    this._currencyPair = currencyPair;

    this._asks = null;
    this._bids = null;

    this._wrapperPush = null;
    this._wrapperPublic = null;

    this._running = false;

    this._synchronized = false;
    this._synchronizing = false;
    this._syncReady = false;

    this._lastSeq = -2;

    this._callbackSetStart = new Array();
    this._callbackSetStop = new Array();
    this._callbackSetSync = new Array();
}

/*
 *
 * function getWrapperPush()
 *
 * Get the push wrapper instance.
 *
 */
OrderBook.prototype.getWrapperPush = function() {
    return this._wrapperPush;
};

/*
 *
 * function setWrapperPush(wrapperPush)
 *
 * Set the push wrapper instance.
 *
 */
OrderBook.prototype.setWrapperPush = function(wrapperPush) {
    // Lock while running
    if (this._running) {
        throw "Push wrapper instance cannot be changed while running";
    }

    // Sanity check
    if (!(wrapperPush instanceof PushWrapper)) {
        throw new TypeError("wrapperPush is not an instance of PushWrapper");
    }

    this._wrapperPush = wrapperPush;
};

/*
 *
 * function getWrapperPublic()
 *
 * Get the public wrapper instance.
 *
 */
OrderBook.prototype.getWrapperPublic = function() {
    return this._wrapperPublic;
};

/*
 *
 * function setWrapperPublic(wrapperPublic)
 *
 * Set the public wrapper instance.
 *
 */
OrderBook.prototype.setWrapperPublic = function(wrapperPublic) {
    // Lock while running
    if (this._running) {
        throw "Public wrapper instance cannot be changed while running";
    }

    // Sanity check
    if (!(wrapperPublic instanceof PublicWrapper)) {
        throw new TypeError("wrapperPublic is not an instance of PublicWrapper");
    }

    this._wrapperPublic = wrapperPublic;
};

/*
 *
 * function getCurrencyPair()
 *
 * Get the target currency pair.
 *
 */
OrderBook.prototype.getCurrencyPair = function() {
    return this._currencyPair;
};

/*
 *
 * function setCurrencyPair(currencyPair)
 *
 * Set the target currency pair.
 *
 */
OrderBook.prototype.setCurrencyPair = function(currencyPair) {
    // Lock while running
    if (this._running) {
        throw "Currency pair cannot be changed while running";
    }

    this._currencyPair = currencyPair;
};

/*
 *
 * function useDefaultWrappers()
 *
 * Create new push and public wrappers and use them.
 *
 */
OrderBook.prototype.useDefaultWrappers = function() {
    this.setWrapperPush(new PushWrapper());
    this.setWrapperPublic(new PublicWrapper());
};

/*
 *
 * function start()
 *
 * Start tracking the target currency pair's order book.
 *
 */
OrderBook.prototype.start = function() {
    // Sanity check
    if (this._running) {
        throw "Attempt to start, but already running";
    }

    // Start listening to the push API
    this._wrapperPush.orderTrade(this._currencyPair, (err, response) => {
        // Disconnect as soon as running flag is cleared
        if (!this._running) {
            return true;
        }

        // If an error occurred
        if (err) {
            // TODO: Handle error
        }

        // Handle update
        this._handleUpdate(response);
    });

    // Set running flag
    this._running = true;
};

/*
 *
 * function stop()
 *
 * Stop tracking the target currency pair's order book.
 *
 */
OrderBook.prototype.stop = function() {
    // Sanity check
    if (!this._running) {
        throw "Attempt to stop, but not running";
    }

    // Clear running flag
    this._running = false;

    // TODO: Do any necessary cleanup
};

/*
 *
 * function onStart(callback)
 *
 * Register a callback to receive start events.
 *
 */
OrderBook.prototype.onStart = function(callback) {
    // Push to start callback set
    this._callbackSetStart.push(callback);

    // Give user the option to remove it
    return {
        "remove": () => {
            // Remove from start callback set
            this._callbackSetStart.splice(this._callbackSetStart.indexOf(callback), 1);
        }
    };
};

/*
 *
 * function onStop(callback)
 *
 * Register a callback to receive stop events.
 *
 */
OrderBook.prototype.onStop = function(callback) {
    // Push to stop callback set
    this._callbackSetStop.push(callback);

    // Give user the option to remove it
    return {
        "remove": () => {
            // Remove from stop callback set
            this._callbackSetStop.splice(this._callbackSetStop.indexOf(callback), 1);
        }
    };
};

/*
 *
 * function onSync(callback)
 *
 * Register a callback to receive sync events.
 *
 */
OrderBook.prototype.onSync = function(callback) {
    // Push to sync callback set
    this._callbackSetSync.push(callback);

    // Give user the option to remove it
    return {
        "remove": () => {
            // Remove from sync callback set
            this._callbackSetSync.splice(this._callbackSetSync.indexOf(callback), 1);
        }
    };
};

/*
 * Internal function to handle order book updates.
 */
OrderBook.prototype._handleUpdate = function(update) {

console.log("handle update " + update.seq);
    // If not yet synchronized or currently synchronizing
    if (!this._synchronized || this._synchronizing) {
        // If currently synchronizing
        if (this._synchronizing) {
            // meh
            console.log("waiting for sync");
        } else {
            console.log("beginning sync");
            // Set synchronizing flag
            this._synchronizing = true;

            // Request snapshot of order book from public API (TODO: Use a configurable depth)
            this._wrapperPublic.returnOrderBook(this._currencyPair, 999999999, (err, response) => {
                // If this market is frozen
                if (response.isFrozen == "1") {
                    throw "Market for " + update.currencyPair + " is frozen";
                }

                // Store seq from snapshot
                this._lastSeq = response.seq;

                // Reset order book data
                this._asks = new Array();
                this._bids = new Array();

                // Store data from snapshot
                for (var i = 0; i < response.asks.length; i++) {
                    this._asks.push({
                        "rate": response.asks[i][0],
                        "amount": response.asks[i][1]
                    });
                }
                for (var i = 0; i < response.bids.length; i++) {
                    this._bids.push({
                        "rate": response.bids[i][0],
                        "amount": response.bids[i][1]
                    });
                }

                // Set synchronized flag and clear synchronizing flag
                this._synchronized = true;
                this._synchronizing = false;

                console.log("sync complete");
            });
        }

        // Wait for next update to begin tracking updates
        return;
    }

    // If this update's seq is greater than, but not equal or 1 higher than the last update's seq
    if (update.seq > this._lastSeq && update.seq != this._lastSeq && update.seq != this._lastSeq + 1) {
        console.log("out of sync");

        // Consider this a loss of synchronization
        this._synchronized = false;

        // Wait for next update to begin synchronization
        return;
    }

    // Handle update
    switch (update.updateType) {
    case "orderBookModify":
        if (update.type == "bid") {
            // meh
        } else if (update.type == "ask") {
            // meh
        }
        break;
    case "orderBookRemove":
        break;
    }

    // Store seq for future comparison
    this._lastSeq = update.seq;
};

module.exports = OrderBook;