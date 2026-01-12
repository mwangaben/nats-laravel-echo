// src/index.js
const NATSConnector = require('./connector');

class Echo {
    constructor(options) {
        this.options = options || {};
        this.connector = null;
        this.channels = new Map();

        this.initialize();
    }

    initialize() {
        if (this.options.broadcaster === 'nats') {
            this.connector = new NATSConnector(this.options);
            this.connector.connect();
        } else {
            throw new Error('Unsupported broadcaster. Use "nats"');
        }
    }

    channel(name) {
        if (!this.channels.has(name)) {
            this.channels.set(name, this.connector.channel(name));
        }
        return this.channels.get(name);
    }

    private(name) {
        return this.connector.private(name);
    }

    encryptedPrivate(name) {
        return this.connector.encryptedPrivate(name);
    }

    join(name) {
        return this.connector.join(name);
    }

    leave(channel) {
        return this.connector.leave(channel);
    }

    listen(channel, event, callback) {
        return this.connector.listen(channel, event, callback);
    }

    socketId() {
        return this.connector.socketId();
    }

    disconnect() {
        this.connector.disconnect();
    }

    getConnectionStatus() {
        return this.connector.getConnectionStatus();
    }

    // Expose helper functions
    static normalizeEventName(eventName) {
        const NATSConnector = require('./connector');
        return NATSConnector.normalizeEventName(eventName);
    }
}

// Export the Echo class as default
module.exports = Echo;

// Also export helper functions for advanced users
module.exports.normalizeEventName = NATSConnector.normalizeEventName;
module.exports.createCallbackKey = NATSConnector.createCallbackKey;