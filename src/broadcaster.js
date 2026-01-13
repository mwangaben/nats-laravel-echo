import { connect, JSONCodec } from 'nats.ws';

// Import helper functions from connector if needed, or define locally
// function normalizeEventName(eventName) {
//     // Convert "App\Events\OrderShipped" to "OrderShipped"
//     if (eventName.includes('\\')) {
//         return eventName.split('\\').pop();
//     }
//     return eventName;
// }

function normalizeEventName(eventName) {
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
                                const normalizedEventName = normalizeEventName(eventName);

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

export default NATSBroadcaster;