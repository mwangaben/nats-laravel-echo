// src/connector.js
const NATSBroadcaster = require('./broadcaster');

class NATSConnector {
    constructor(options) {
        this.options = options;
        this.broadcaster = null;
    }

    connect() {
        this.broadcaster = new NATSBroadcaster({
            servers: this.options.host || 'ws://localhost:4223',
            auth: this.options.auth,
            timeout: this.options.timeout || 5000,
            debug: this.options.debug !== false,
            maxReconnectAttempts: this.options.maxReconnectAttempts || 10
        });

        return this;
    }

    listen(channel, event, callback) {
        if (!this.broadcaster) {
            console.error('NATS Connector: Not connected');
            return { unsubscribe: () => {} };
        }

        return this.broadcaster.subscribe(channel, event, callback);
    }

    channel(name) {
        return new Channel(this, name);
    }

    private(name) {
        return new PrivateChannel(this, `private-${name}`);
    }

    encryptedPrivate(name) {
        return new PrivateChannel(this, `private-encrypted-${name}`);
    }

    join(name) {
        return new PresenceChannel(this, name);
    }

    leave(channel) {
        // Implementation for leaving channels
    }

    socketId() {
        return this.broadcaster ? this.broadcaster.socketId : null; // Changed from method to property
    }

    disconnect() {
        if (this.broadcaster) {
            this.broadcaster.disconnect();
        }
    }
}

class Channel {
    constructor(connector, name) {
        this.connector = connector;
        this.name = name;
        this.eventHandlers = new Map();
    }

    listen(event, handler) {
        if (!this.connector.broadcaster) {
            console.error(`Channel "${this.name}": Not connected`);
            return this;
        }

        const subscription = this.connector.broadcaster.subscribe(this.name, event, handler);
        this.eventHandlers.set(event, subscription);

        return this;
    }

    stopListening(event) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).unsubscribe();
            this.eventHandlers.delete(event);
        }
        return this;
    }
}

class PrivateChannel extends Channel {
    // Add authentication for private channels
}

class PresenceChannel extends Channel {
    constructor(connector, name) {
        super(connector, `presence-${name}`);
    }

    here(callback) {
        return this.listen('presence:here', callback);
    }

    joining(callback) {
        return this.listen('presence:joining', callback);
    }

    leaving(callback) {
        return this.listen('presence:leaving', callback);
    }
}

module.exports = NATSConnector;