import require$$0 from 'nats.ws';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var broadcaster;
var hasRequiredBroadcaster;

function requireBroadcaster () {
	if (hasRequiredBroadcaster) return broadcaster;
	hasRequiredBroadcaster = 1;
	// src/broadcaster.js
	const { connect, JSONCodec } = require$$0;

	class NATSBroadcaster {
	    constructor(options) {
	        this.options = options;
	        this.socketId = 'nats_' + Math.random().toString(36).substring(2, 15); // Property, not method
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
	                            if (data && data.event) {
	                                const cb = this.callbacks.get(`${channel}.${data.event}`);
	                                if (cb) {
	                                    cb(data.data || {});
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

	    // Change socketId from method to getter if you want to keep it as a method
	    // getSocketId() {
	    //     return this.socketId;
	    // }

	    getConnectionStatus() {
	        return {
	            isConnected: this.isConnected,
	            socketId: this.socketId, // Now a property
	            subscriptionCount: this.subscriptions.size
	        };
	    }
	}

	broadcaster = NATSBroadcaster;
	return broadcaster;
}

var connector;
var hasRequiredConnector;

function requireConnector () {
	if (hasRequiredConnector) return connector;
	hasRequiredConnector = 1;
	// src/connector.js
	const NATSBroadcaster = requireBroadcaster();

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

	connector = NATSConnector;
	return connector;
}

var src;
var hasRequiredSrc;

function requireSrc () {
	if (hasRequiredSrc) return src;
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
	        return this.connector.socketId(); // This now calls the connector's socketId() method
	    }

	    disconnect() {
	        this.connector.disconnect();
	    }

	    getConnectionStatus() {
	        return this.connector.broadcaster ?
	            this.connector.broadcaster.getConnectionStatus() :
	            { isConnected: false, socketId: null, subscriptionCount: 0 };
	    }
	}

	src = Echo;
	return src;
}

var srcExports = requireSrc();
var index = /*@__PURE__*/getDefaultExportFromCjs(srcExports);

export { index as default };
