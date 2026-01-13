import { JSONCodec, connect } from 'nats.ws';

// Import helper functions from connector if needed, or define locally
// function normalizeEventName(eventName) {
//     // Convert "App\Events\OrderShipped" to "OrderShipped"
//     if (eventName.includes('\\')) {
//         return eventName.split('\\').pop();
//     }
//     return eventName;
// }

function normalizeEventName$1(eventName) {
    console.log(`🔍 DEBUG: Normalizing event name: ${eventName}`);
    // Convert "App\Events\OrderShipped" to "OrderShipped"
    if (eventName.includes('\\')) {
        // Handle both single and double backslashes
        const parts = eventName.split(/\\+/);
        console.log(`🔍 DEBUG: Split parts:`, parts);
        const normalized = parts.pop();
        console.log(`🔍 DEBUG: Normalized to: ${normalized}`);
        return normalized;
    }
    console.log(`🔍 DEBUG: No normalization needed: ${eventName}`);
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

    // subscribe(channel, event, callback) {
    //     const key = `${channel}.${event}`;
    //     this.callbacks.set(key, callback);
    //
    //     if (this.isConnected && this.connection) {
    //         if (!this.subscriptions.has(channel)) {
    //             const sub = this.connection.subscribe(channel);
    //             this.subscriptions.set(channel, sub);
    //
    //             (async () => {
    //                 for await (const msg of sub) {
    //                     try {
    //                         const data = this.jsonCodec.decode(msg.data);
    //
    //                         // Validate it's a Laravel event
    //                         if (data && data.event && data.channel) {
    //
    //                             console.log('The Event Data is ', data.event);
    //                             console.log('The  Data is ', data);
    //                             console.log('The  D is channel', data.channel);
    //
    //
    //                             const eventName = data.event;
    //                             const normalizedEventName = normalizeEventName(eventName);
    //
    //                             // Try exact match first, then normalized name
    //                             let cb = this.callbacks.get(`${channel}.${eventName}`);
    //
    //                             console.log('The callback One', cb)
    //                             if (!cb) {
    //                                 cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
    //
    //                                 console.log('The callback Two', cb)
    //                             }
    //
    //                             if (cb) {
    //                                 // Pass the data (Laravel sends data in data.data)
    //                                 const eventData = data.data || {};
    //                                 console.log('The callback Three', cb)
    //
    //                                 console.log('The callback Five', cb(eventData))
    //                                 cb(eventData);
    //                             }
    //                         }
    //                     } catch (err) {
    //                         console.error('NATS: Error processing message:', err);
    //                     }
    //                 }
    //             })();
    //
    //             console.log(`📡 NATS: Subscribed to channel "${channel}"`);
    //         }
    //     }
    //
    //     return {
    //         unsubscribe: () => {
    //             this.callbacks.delete(key);
    //             // If no more callbacks for this channel, unsubscribe
    //             const hasOtherCallbacks = Array.from(this.callbacks.keys())
    //                 .some(key => key.startsWith(channel + '.'));
    //
    //             if (!hasOtherCallbacks && this.subscriptions.has(channel)) {
    //                 const sub = this.subscriptions.get(channel);
    //                 sub.unsubscribe();
    //                 this.subscriptions.delete(channel);
    //                 console.log(`📡 NATS: Unsubscribed from channel "${channel}"`);
    //             }
    //         }
    //     };
    // }
    // subscribe(channel, event, callback) {
    //     const key = `${channel}.${event}`;
    //     this.callbacks.set(key, callback);
    //
    //     if (this.isConnected && this.connection) {
    //         if (!this.subscriptions.has(channel)) {
    //             const sub = this.connection.subscribe(channel);
    //             this.subscriptions.set(channel, sub);
    //
    //             (async () => {
    //                 for await (const msg of sub) {
    //                     try {
    //                         const data = this.jsonCodec.decode(msg.data);
    //
    //                         // Validate it's a Laravel event
    //                         // Use data.channel.name to get the channel name
    //                         if (data && data.event && data.channel && data.channel.name) {
    //
    //                             // Get the channel name from the Laravel event
    //                             const laravelChannel = data.channel.name;
    //
    //                             // Only process if it matches our subscribed channel
    //                             if (laravelChannel !== channel) {
    //                                 console.log(`⚠️  Channel mismatch: Expected ${channel}, got ${laravelChannel}`);
    //                                 continue;
    //                             }
    //
    //                             const eventName = data.event;
    //                             const normalizedEventName = normalizeEventName(eventName);
    //
    //                             // Try exact match first, then normalized name
    //                             let cb = this.callbacks.get(`${channel}.${eventName}`);
    //                             if (!cb) {
    //                                 cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
    //                             }
    //
    //                             if (cb) {
    //                                 // Pass the data (Laravel sends data in data.data)
    //                                 const eventData = data.data || {};
    //                                 cb(eventData);
    //                             }
    //                         }
    //                     } catch (err) {
    //                         console.error('NATS: Error processing message:', err);
    //                     }
    //                 }
    //             })();
    //
    //             console.log(`📡 NATS: Subscribed to channel "${channel}"`);
    //         }
    //     }
    //
    //     return {
    //         unsubscribe: () => {
    //             this.callbacks.delete(key);
    //             // If no more callbacks for this channel, unsubscribe
    //             const hasOtherCallbacks = Array.from(this.callbacks.keys())
    //                 .some(key => key.startsWith(channel + '.'));
    //
    //             if (!hasOtherCallbacks && this.subscriptions.has(channel)) {
    //                 const sub = this.subscriptions.get(channel);
    //                 sub.unsubscribe();
    //                 this.subscriptions.delete(channel);
    //                 console.log(`📡 NATS: Unsubscribed from channel "${channel}"`);
    //             }
    //         }
    //     };
    // }

    // subscribe(channel, event, callback) {
    //     const key = `${channel}.${event}`;
    //     this.callbacks.set(key, callback);
    //
    //     if (this.isConnected && this.connection) {
    //         if (!this.subscriptions.has(channel)) {
    //             const sub = this.connection.subscribe(channel);
    //             this.subscriptions.set(channel, sub);
    //
    //             (async () => {
    //                 for await (const msg of sub) {
    //                     try {
    //                         const data = this.jsonCodec.decode(msg.data);
    //
    //                         // Only check for event, not channel
    //                         if (data && data.event) {
    //                             const eventName = data.event;
    //                             const normalizedEventName = normalizeEventName(eventName);
    //
    //                             // Try exact match first, then normalized name
    //                             let cb = this.callbacks.get(`${channel}.${eventName}`);
    //                             if (!cb) {
    //                                 cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
    //                             }
    //
    //                             if (cb) {
    //                                 // Pass the data (Laravel sends data in data.data)
    //                                 const eventData = data.data || {};
    //                                 cb(eventData);
    //                             }
    //                         }
    //                     } catch (err) {
    //                         console.error('NATS: Error processing message:', err);
    //                     }
    //                 }
    //             })();
    //
    //             console.log(`📡 NATS: Subscribed to channel "${channel}"`);
    //         }
    //     }
    //
    //     return {
    //         unsubscribe: () => {
    //             this.callbacks.delete(key);
    //             // If no more callbacks for this channel, unsubscribe
    //             const hasOtherCallbacks = Array.from(this.callbacks.keys())
    //                 .some(key => key.startsWith(channel + '.'));
    //
    //             if (!hasOtherCallbacks && this.subscriptions.has(channel)) {
    //                 const sub = this.subscriptions.get(channel);
    //                 sub.unsubscribe();
    //                 this.subscriptions.delete(channel);
    //                 console.log(`📡 NATS: Unsubscribed from channel "${channel}"`);
    //             }
    //         }
    //     };
    // }


    subscribe(channel, event, callback) {
        console.log(`🔍 DEBUG: Subscribing to ${channel}.${event}`);
        const key = `${channel}.${event}`;
        console.log(`🔍 DEBUG: Callback key: ${key}`);

        this.callbacks.set(key, callback);

        // Log all registered callbacks for debugging
        console.log('🔍 DEBUG: Registered callbacks:');
        this.callbacks.forEach((value, key) => {
            console.log(`  ${key}`);
        });

        if (this.isConnected && this.connection) {
            if (!this.subscriptions.has(channel)) {
                console.log(`🔍 DEBUG: Creating new subscription for channel: ${channel}`);
                const sub = this.connection.subscribe(channel);
                this.subscriptions.set(channel, sub);

                (async () => {
                    for await (const msg of sub) {
                        try {
                            const data = this.jsonCodec.decode(msg.data);
                            console.log('🔍 DEBUG: Received NATS message on channel:', channel);
                            console.log('🔍 DEBUG: Raw data:', data);

                            // Only check for event, not channel
                            if (data && data.event) {
                                console.log(`🔍 DEBUG: Event found: ${data.event}`);

                                const eventName = data.event;
                                const normalizedEventName = normalizeEventName$1(eventName);

                                console.log(`🔍 DEBUG: Looking for callbacks:`);
                                console.log(`  Exact: ${channel}.${eventName}`);
                                console.log(`  Normalized: ${channel}.${normalizedEventName}`);

                                // Try exact match first, then normalized name
                                let cb = this.callbacks.get(`${channel}.${eventName}`);
                                console.log(`🔍 DEBUG: Exact match found: ${!!cb}`);

                                if (!cb) {
                                    cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
                                    console.log(`🔍 DEBUG: Normalized match found: ${!!cb}`);
                                }

                                if (cb) {
                                    console.log('🔍 DEBUG: Callback found, executing...');
                                    // Pass the data (Laravel sends data in data.data)
                                    const eventData = data.data || {};
                                    cb(eventData);
                                } else {
                                    console.log('🔍 DEBUG: No callback found!');
                                    console.log('🔍 DEBUG: Available callbacks:');
                                    this.callbacks.forEach((value, key) => {
                                        console.log(`  ${key}`);
                                    });
                                }
                            } else {
                                console.log('🔍 DEBUG: No event in data or data missing');
                            }
                        } catch (err) {
                            console.error('NATS: Error processing message:', err);
                        }
                    }
                })();

                console.log(`📡 NATS: Subscribed to channel "${channel}"`);
            } else {
                console.log(`🔍 DEBUG: Already subscribed to channel: ${channel}`);
            }
        } else {
            console.log('🔍 DEBUG: Not connected or no connection');
        }

        return {
            unsubscribe: () => {
                console.log(`🔍 DEBUG: Unsubscribing from ${key}`);
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
// export { normalizeEventName, createCallbackKey };

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

    // Expose helper functions as static methods
    static normalizeEventName(eventName) {
        return normalizeEventName(eventName);
    }

    static createCallbackKey(channel, event) {
        return createCallbackKey(channel, event);
    }
}

// Attach helper functions to the Echo class
Echo.normalizeEventName = normalizeEventName;
Echo.createCallbackKey = createCallbackKey;

export { Echo as default };
