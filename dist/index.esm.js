import require$$0 from 'nats.ws';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var src = {exports: {}};

var connector = {exports: {}};

var broadcaster;
var hasRequiredBroadcaster;

function requireBroadcaster () {
	if (hasRequiredBroadcaster) return broadcaster;
	hasRequiredBroadcaster = 1;
	// src/broadcaster.js
	const { connect, JSONCodec } = require$$0;

	// Import helper functions from connector if needed, or define locally
	function normalizeEventName(eventName) {
	    // Convert "App\Events\OrderShipped" to "OrderShipped"
	    if (eventName.includes('\\')) {
	        return eventName.split('\\').pop();
	    }
	    return eventName;
	}

	class NATSBroadcaster {
	    constructor(options) {
	        this.options = options;
	        this.socketId = 'nats_' + Math.random().toString(36).substring(2, 15);
	        this.connection = null;
	        this.isConnected = false;
	        this.jsonCodec = JSONCodec();
	        this.callbacks = new Map();
	        this.subscriptions = new Map();
	        this.reconnectAttempts = 0;
	        this.maxReconnectAttempts = this.options.maxReconnectAttempts || 10;

	        this.connect();
	    }

	    async connect() {
	        try {
	            const config = {
	                servers: this.options.servers || 'ws://localhost:4223',
	                debug: this.options.debug !== false,
	                timeout: this.options.timeout || 5000,
	                verbose: true
	            };

	            if (this.options.auth && this.options.auth.user && this.options.auth.pass) {
	                config.user = this.options.auth.user;
	                config.pass = this.options.auth.pass;
	            }

	            console.log('🔗 NATS: Connecting...');
	            this.connection = await connect(config);
	            this.isConnected = true;
	            this.reconnectAttempts = 0;
	            console.log('✅ NATS: Connected!');

	            // Setup event listeners
	            this.connection.closed().then(() => {
	                this.isConnected = false;
	                console.log('❌ NATS: Connection closed');
	                this.handleReconnect();
	            });

	        } catch (error) {
	            console.error('❌ NATS: Connection failed:', error.message);
	            this.handleReconnect();
	        }
	    }

	    handleReconnect() {
	        if (this.reconnectAttempts < this.maxReconnectAttempts) {
	            this.reconnectAttempts++;
	            const delay = Math.min(1000 * this.reconnectAttempts, 10000);

	            console.log(`🔄 NATS: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

	            setTimeout(() => {
	                this.connect();
	            }, delay);
	        } else {
	            console.error('❌ NATS: Max reconnection attempts reached');
	        }
	    }

	    subscribe(channel, event, callback) {
	        const key = `${channel}.${event}`;
	        this.callbacks.set(key, callback);

	        if (this.isConnected && this.connection) {
	            if (!this.subscriptions.has(channel)) {
	                const sub = this.connection.subscribe(channel);
	                this.subscriptions.set(channel, sub);

	                (async () => {
	                    for await (const msg of sub) {
	                        try {
	                            const data = this.jsonCodec.decode(msg.data);

	                            // Validate it's a Laravel event
	                            if (data && data.event && data.channel) {
	                                const eventName = data.event;
	                                const normalizedEventName = normalizeEventName(eventName);

	                                // Try exact match first, then normalized name
	                                let cb = this.callbacks.get(`${channel}.${eventName}`);
	                                if (!cb) {
	                                    cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
	                                }

	                                if (cb) {
	                                    // Pass the data (Laravel sends data in data.data)
	                                    const eventData = data.data || {};
	                                    cb(eventData);
	                                }
	                            }
	                        } catch (err) {
	                            console.error('NATS: Error processing message:', err);
	                        }
	                    }
	                })();

	                console.log(`📡 NATS: Subscribed to channel "${channel}"`);
	            }
	        }

	        return {
	            unsubscribe: () => {
	                this.callbacks.delete(key);
	                // If no more callbacks for this channel, unsubscribe
	                const hasOtherCallbacks = Array.from(this.callbacks.keys())
	                    .some(key => key.startsWith(channel + '.'));

	                if (!hasOtherCallbacks && this.subscriptions.has(channel)) {
	                    const sub = this.subscriptions.get(channel);
	                    sub.unsubscribe();
	                    this.subscriptions.delete(channel);
	                    console.log(`📡 NATS: Unsubscribed from channel "${channel}"`);
	                }
	            }
	        };
	    }

	    unsubscribe(channel, event) {
	        const key = `${channel}.${event}`;
	        this.callbacks.delete(key);
	    }

	    disconnect() {
	        if (this.connection) {
	            this.connection.close();
	            this.isConnected = false;
	            this.subscriptions.clear();
	            this.callbacks.clear();
	            console.log('👋 NATS: Disconnected');
	        }
	    }

	    getConnectionStatus() {
	        return {
	            isConnected: this.isConnected,
	            socketId: this.socketId,
	            subscriptionCount: this.subscriptions.size
	        };
	    }
	}

	broadcaster = NATSBroadcaster;
	return broadcaster;
}

var hasRequiredConnector;

function requireConnector () {
	if (hasRequiredConnector) return connector.exports;
	hasRequiredConnector = 1;
	// src/connector.js
	const NATSBroadcaster = requireBroadcaster();

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
	connector.exports = NATSConnector;
	connector.exports.normalizeEventName = normalizeEventName;
	connector.exports.createCallbackKey = createCallbackKey;
	return connector.exports;
}

var hasRequiredSrc;

function requireSrc () {
	if (hasRequiredSrc) return src.exports;
	hasRequiredSrc = 1;
	// src/index.js
	const NATSConnector = requireConnector();

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
	        const NATSConnector = requireConnector();
	        return NATSConnector.normalizeEventName(eventName);
	    }
	}

	// Export the Echo class as default
	src.exports = Echo;

	// Also export helper functions for advanced users
	src.exports.normalizeEventName = NATSConnector.normalizeEventName;
	src.exports.createCallbackKey = NATSConnector.createCallbackKey;
	return src.exports;
}

var srcExports = requireSrc();
var index = /*@__PURE__*/getDefaultExportFromCjs(srcExports);

export { index as default };
