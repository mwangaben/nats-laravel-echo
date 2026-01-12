// src/connector.js
const NATSBroadcaster = require('./broadcaster');

// Helper function to normalize Laravel event names
function normalizeEventName(eventName) {
    // Convert "App\Events\OrderShipped" to "OrderShipped"
    if (eventName.includes('\\')) {
        return eventName.split('\\').pop();
    }
    return eventName;
}

// Helper function to create callback key
function createCallbackKey(channel, event) {
    return `${channel}.${event}`;
}

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
        return this.broadcaster ? this.broadcaster.socketId : null;
    }

    disconnect() {
        if (this.broadcaster) {
            this.broadcaster.disconnect();
        }
    }

    // Optional: Add a helper method for users
    normalizeEvent(eventName) {
        return normalizeEventName(eventName);
    }

    // Helper to get connection status
    getConnectionStatus() {
        return this.broadcaster ?
            this.broadcaster.getConnectionStatus() :
            { isConnected: false, socketId: null, subscriptionCount: 0 };
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

    unsubscribe() {
        // Unsubscribe from all events on this channel
        for (const [event, subscription] of this.eventHandlers.entries()) {
            subscription.unsubscribe();
        }
        this.eventHandlers.clear();
        return this;
    }
}

class PrivateChannel extends Channel {
    constructor(connector, name) {
        super(connector, name);
        this.authenticated = false;
    }

    // Add authentication for private channels
    authenticate(authData) {
        // This would typically make a request to Laravel's broadcasting/auth endpoint
        console.log(`Authenticating private channel: ${this.name}`);
        this.authenticated = true;
        return this;
    }

    listen(event, handler) {
        if (!this.authenticated) {
            console.warn(`⚠️  Channel "${this.name}": Not authenticated. Call .authenticate() first.`);
            return this;
        }
        return super.listen(event, handler);
    }
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

    whisper(event, data) {
        // For sending whispers to other users in the channel
        console.log(`Whispering "${event}" on ${this.name}:`, data);
        return this;
    }
}

// Export the connector and helper functions
module.exports = NATSConnector;
module.exports.normalizeEventName = normalizeEventName;
module.exports.createCallbackKey = createCallbackKey;