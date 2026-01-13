import { JSONCodec, connect } from 'nats.ws';

function normalizeEventName$1(eventName) {
    // console.log(`🔍 DEBUG: Normalizing event name: ${eventName}`);
    // Convert "App\Events\OrderShipped" to "OrderShipped"
    if (eventName.includes('\\')) {
        // Handle both single and double backslashes
        const parts = eventName.split(/\\+/);
        // console.log(`🔍 DEBUG: Split parts:`, parts);
        const normalized = parts.pop();
        // console.log(`🔍 DEBUG: Normalized to: ${normalized}`);
        return normalized;
    }
    // console.log(`🔍 DEBUG: No normalization needed: ${eventName}`);
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
        this.pendingSubscriptions = [];
        this.connectionListeners = [];

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

            // Process any subscriptions that were made before connection
            this.processPendingSubscriptions();

            // Notify all connection listeners
            this.notifyConnectionListeners(true);

            // Setup event listeners
            this.connection.closed().then(() => {
                console.log('❌ NATS: Connection closed');
                this.handleDisconnection();
            });

        } catch (error) {
            console.error('❌ NATS: Connection failed:', error.message);
            this.handleReconnect();
        }
    }

    handleDisconnection() {
        this.isConnected = false;
        this.subscriptions.clear(); // NATS subscriptions are automatically closed
        this.notifyConnectionListeners(false);
        this.handleReconnect();
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
            this.notifyConnectionListeners(false, 'max_attempts_reached');
        }
    }

    notifyConnectionListeners(connected, error = null) {
        this.connectionListeners.forEach(listener => {
            try {
                listener(connected, error);
            } catch (err) {
                console.error('Error in connection listener:', err);
            }
        });
    }

    onConnectionChange(listener) {
        this.connectionListeners.push(listener);
        // Immediately notify of current state
        if (this.isConnected) {
            listener(true);
        }
        return () => {
            const index = this.connectionListeners.indexOf(listener);
            if (index > -1) {
                this.connectionListeners.splice(index, 1);
            }
        };
    }

    processPendingSubscriptions() {
        if (!this.isConnected || !this.connection) return;

        // Group pending subscriptions by channel
        const channels = new Set();
        this.callbacks.forEach((callback, key) => {
            const [channel] = key.split('.');
            channels.add(channel);
        });

        // Subscribe to each channel
        channels.forEach(channel => {
            if (!this.subscriptions.has(channel)) {
                this.setupChannelSubscription(channel);
            }
        });

        // Clear pending subscriptions
        this.pendingSubscriptions = [];
    }

    setupChannelSubscription(channel) {
        if (!this.isConnected || !this.connection) return;

        try {
            const sub = this.connection.subscribe(channel);
            this.subscriptions.set(channel, sub);

            (async () => {
                for await (const msg of sub) {
                    this.processMessage(channel, msg);
                }
            })();

            console.log(`📡 NATS: Subscribed to channel "${channel}"`);
        } catch (error) {
            console.error(`❌ Failed to subscribe to channel "${channel}":`, error);
        }
    }

    processMessage(channel, msg) {
        try {
            const data = this.jsonCodec.decode(msg.data);

            if (this.options.debug) {
                // console.log('🔍 DEBUG: Received NATS message on channel:', channel);
                // console.log('🔍 DEBUG: Raw data:', data);
            }

            // Only check for event, not channel
            if (data && data.event) {
                if (this.options.debug) {
                    // console.log(`🔍 DEBUG: Event found: ${data.event}`);
                }

                const eventName = data.event;
                const normalizedEventName = normalizeEventName$1(eventName);

                if (this.options.debug) {
                    // console.log(`🔍 DEBUG: Looking for callbacks:`);
                    console.log(`  Exact: ${channel}.${eventName}`);
                    console.log(`  Normalized: ${channel}.${normalizedEventName}`);
                }

                // Try exact match first, then normalized name
                let cb = this.callbacks.get(`${channel}.${eventName}`);
                if (this.options.debug) {
                    // console.log(`🔍 DEBUG: Exact match found: ${!!cb}`);
                }

                if (!cb) {
                    cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
                    if (this.options.debug) {
                        // console.log(`🔍 DEBUG: Normalized match found: ${!!cb}`);
                    }
                }

                if (cb) {
                    if (this.options.debug) {
                        // console.log('🔍 DEBUG: Callback found, executing...');
                    }
                    // Pass the data (Laravel sends data in data.data)
                    const eventData = data.data || {};
                    cb(eventData);
                } else {
                    if (this.options.debug) {
                        // console.log('🔍 DEBUG: No callback found!');
                        // console.log('🔍 DEBUG: Available callbacks:');
                        this.callbacks.forEach((value, key) => {
                            console.log(`  ${key}`);
                        });
                    }
                }
            } else if (this.options.debug) {
                // console.log('🔍 DEBUG: No event in data or data missing');
            }
        } catch (err) {
            console.error('NATS: Error processing message:', err);
        }
    }

    subscribe(channel, event, callback) {
        if (this.options.debug) ;

        const key = `${channel}.${event}`;

        if (this.options.debug) {
            // console.log(`🔍 DEBUG: Callback key: ${key}`);
            // console.log('🔍 DEBUG: Registered callbacks:');
            this.callbacks.forEach((value, key) => {
                console.log(`  ${key}`);
            });
        }

        this.callbacks.set(key, callback);

        if (this.isConnected && this.connection) {
            if (!this.subscriptions.has(channel)) {
                this.setupChannelSubscription(channel);
            }
        } else {
            // Queue for when connection is established
            this.pendingSubscriptions.push({ channel, event, callback });
            if (this.options.debug) ;
        }

        return {
            unsubscribe: () => {
                if (this.options.debug) ;

                this.callbacks.delete(key);

                // If no more callbacks for this channel, unsubscribe
                const hasOtherCallbacks = Array.from(this.callbacks.keys())
                    .some(key => key.startsWith(channel + '.'));

                if (!hasOtherCallbacks && this.subscriptions.has(channel)) {
                    const sub = this.subscriptions.get(channel);
                    try {
                        sub.unsubscribe();
                        this.subscriptions.delete(channel);
                        console.log(`📡 NATS: Unsubscribed from channel "${channel}"`);
                    } catch (error) {
                        console.error(`❌ Error unsubscribing from channel "${channel}":`, error);
                    }
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
            try {
                this.connection.close();
                this.isConnected = false;
                this.subscriptions.clear();
                this.callbacks.clear();
                this.pendingSubscriptions = [];
                this.notifyConnectionListeners(false);
                console.log('👋 NATS: Disconnected');
            } catch (error) {
                console.error('❌ Error disconnecting:', error);
            }
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socketId,
            subscriptionCount: this.subscriptions.size,
            callbackCount: this.callbacks.size,
            pendingSubscriptions: this.pendingSubscriptions.length,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Helper function to normalize Laravel event names
function normalizeEventName(eventName) {
    // Convert "App\Events\OrderShipped" to "OrderShipped"
    if (eventName.includes('\\')) {
        return eventName.split('\\').pop();
    }
    return eventName;
}

class NATSConnector {
    constructor(options) {
        this.options = options;
        this.broadcaster = null;
        this.connectionListeners = [];
    }

    connect() {
        this.broadcaster = new NATSBroadcaster({
            servers: this.options.host || 'ws://localhost:4223',
            auth: this.options.auth,
            timeout: this.options.timeout || 5000,
            debug: this.options.debug !== false,
            maxReconnectAttempts: this.options.maxReconnectAttempts || 10
        });

        // Listen for connection changes
        this.broadcaster.onConnectionChange((connected, error) => {
            this.notifyConnectionListeners(connected, error);
        });

        return this;
    }

    onConnectionChange(listener) {
        this.connectionListeners.push(listener);
        // Immediately notify of current state if broadcaster exists
        if (this.broadcaster && this.broadcaster.isConnected) {
            listener(true);
        }
        return () => {
            const index = this.connectionListeners.indexOf(listener);
            if (index > -1) {
                this.connectionListeners.splice(index, 1);
            }
        };
    }

    notifyConnectionListeners(connected, error = null) {
        this.connectionListeners.forEach(listener => {
            try {
                listener(connected, error);
            } catch (err) {
                console.error('Error in connection listener:', err);
            }
        });
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
        // This could unsubscribe from all events on the channel
        console.log(`Leaving channel: ${channel}`);
        return this;
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
            {
                isConnected: false,
                socketId: null,
                subscriptionCount: 0,
                callbackCount: 0,
                pendingSubscriptions: 0,
                reconnectAttempts: 0,
                maxReconnectAttempts: 0
            };
    }
}

class Channel {
    constructor(connector, name) {
        this.connector = connector;
        this.name = name;
        this.eventHandlers = new Map();
        this.connectionUnsubscribe = null;

        // Listen for connection changes to resubscribe
        if (this.connector.broadcaster) {
            this.connectionUnsubscribe = this.connector.broadcaster.onConnectionChange((connected) => {
                if (connected) {
                    this.resubscribe();
                }
            });
        }
    }

    resubscribe() {
        // Resubscribe to all events when connection is restored
        for (const [event, subscription] of this.eventHandlers.entries()) {
            // The old subscription is invalid after reconnection
            // We need to create a new one
            const newSubscription = this.connector.broadcaster.subscribe(this.name, event, subscription.callback);
            this.eventHandlers.set(event, {
                unsubscribe: newSubscription.unsubscribe,
                callback: subscription.callback
            });
        }
    }

    listen(event, handler) {
        if (!this.connector.broadcaster) {
            console.error(`Channel "${this.name}": Not connected`);
            return this;
        }

        const subscription = this.connector.broadcaster.subscribe(this.name, event, handler);
        this.eventHandlers.set(event, {
            unsubscribe: subscription.unsubscribe,
            callback: handler
        });

        return this;
    }

    stopListening(event) {
        if (this.eventHandlers.has(event)) {
            const subscription = this.eventHandlers.get(event);
            subscription.unsubscribe();
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

        // Clean up connection listener
        if (this.connectionUnsubscribe) {
            this.connectionUnsubscribe();
        }

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
// export { normalizeEventName, createCallbackKey };

class Echo {
    constructor(options) {
        this.options = options || {};
        this.connector = null;
        this.channels = new Map();
        this.readyCallbacks = [];
        this.connectionListeners = [];

        this.initialize();
    }

    initialize() {
        if (this.options.broadcaster === 'nats') {
            this.connector = new NATSConnector(this.options);
            this.connector.connect();

            // Listen for connection changes
            this.connector.onConnectionChange((connected, error) => {
                if (connected) {
                    this.onConnected();
                } else {
                    this.onDisconnected(error);
                }
            });

        } else {
            throw new Error('Unsupported broadcaster. Use "nats"');
        }
    }

    onConnected() {
        console.log('✅ Echo: Connected to NATS');
        // Execute all ready callbacks
        this.readyCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in ready callback:', error);
            }
        });
        this.readyCallbacks = [];

        // Notify connection listeners
        this.connectionListeners.forEach(listener => {
            try {
                listener(true);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    onDisconnected(error) {
        console.log('❌ Echo: Disconnected from NATS', error ? `Error: ${error}` : '');
        // Notify connection listeners
        this.connectionListeners.forEach(listener => {
            try {
                listener(false, error);
            } catch (error) {
                console.error('Error in connection listener:', error);
            }
        });
    }

    onConnectionChange(listener) {
        this.connectionListeners.push(listener);
        // Immediately notify of current state
        const status = this.getConnectionStatus();
        if (status.isConnected) {
            listener(true);
        }
        return () => {
            const index = this.connectionListeners.indexOf(listener);
            if (index > -1) {
                this.connectionListeners.splice(index, 1);
            }
        };
    }

    ready(callback) {
        const status = this.getConnectionStatus();
        if (status.isConnected) {
            // If already connected, execute immediately
            setTimeout(() => callback(), 0);
        } else {
            // Queue for when connection is established
            this.readyCallbacks.push(callback);
        }
        return this;
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
        // Clear all channels
        this.channels.forEach(channel => {
            if (channel.unsubscribe) {
                channel.unsubscribe();
            }
        });
        this.channels.clear();
        this.readyCallbacks = [];
    }

    getConnectionStatus() {
        return this.connector.getConnectionStatus();
    }

    // Helper methods for connection state
    isConnected() {
        return this.getConnectionStatus().isConnected;
    }

    waitForConnection(timeout = 10000) {
        return new Promise((resolve, reject) => {
            if (this.isConnected()) {
                resolve();
                return;
            }

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error('Connection timeout'));
            }, timeout);

            const cleanup = this.onConnectionChange((connected) => {
                if (connected) {
                    clearTimeout(timer);
                    cleanup();
                    resolve();
                }
            });
        });
    }

    // Expose helper functions as static methods
    static normalizeEventName(eventName) {
        return NATSConnector.normalizeEventName(eventName);
    }

    static createCallbackKey(channel, event) {
        return NATSConnector.createCallbackKey(channel, event);
    }
}

// Attach helper functions to the Echo class
Echo.normalizeEventName = NATSConnector.normalizeEventName;
Echo.createCallbackKey = NATSConnector.createCallbackKey;

export { Echo as default };
