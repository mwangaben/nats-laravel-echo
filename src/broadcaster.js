import { connect, JSONCodec } from 'nats.ws';

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
                console.log('🔍 DEBUG: Received NATS message on channel:', channel);
                console.log('🔍 DEBUG: Raw data:', data);
            }

            // Only check for event, not channel
            if (data && data.event) {
                if (this.options.debug) {
                    console.log(`🔍 DEBUG: Event found: ${data.event}`);
                }

                const eventName = data.event;
                const normalizedEventName = normalizeEventName(eventName);

                if (this.options.debug) {
                    console.log(`🔍 DEBUG: Looking for callbacks:`);
                    console.log(`  Exact: ${channel}.${eventName}`);
                    console.log(`  Normalized: ${channel}.${normalizedEventName}`);
                }

                // Try exact match first, then normalized name
                let cb = this.callbacks.get(`${channel}.${eventName}`);
                if (this.options.debug) {
                    console.log(`🔍 DEBUG: Exact match found: ${!!cb}`);
                }

                if (!cb) {
                    cb = this.callbacks.get(`${channel}.${normalizedEventName}`);
                    if (this.options.debug) {
                        console.log(`🔍 DEBUG: Normalized match found: ${!!cb}`);
                    }
                }

                if (cb) {
                    if (this.options.debug) {
                        console.log('🔍 DEBUG: Callback found, executing...');
                    }
                    // Pass the data (Laravel sends data in data.data)
                    const eventData = data.data || {};
                    cb(eventData);
                } else {
                    if (this.options.debug) {
                        console.log('🔍 DEBUG: No callback found!');
                        console.log('🔍 DEBUG: Available callbacks:');
                        this.callbacks.forEach((value, key) => {
                            console.log(`  ${key}`);
                        });
                    }
                }
            } else if (this.options.debug) {
                console.log('🔍 DEBUG: No event in data or data missing');
            }
        } catch (err) {
            console.error('NATS: Error processing message:', err);
        }
    }

    subscribe(channel, event, callback) {
        if (this.options.debug) {
            console.log(`🔍 DEBUG: Subscribing to ${channel}.${event}`);
        }

        const key = `${channel}.${event}`;

        if (this.options.debug) {
            console.log(`🔍 DEBUG: Callback key: ${key}`);
            console.log('🔍 DEBUG: Registered callbacks:');
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
            if (this.options.debug) {
                console.log('🔍 DEBUG: Not connected, subscription queued');
            }
        }

        return {
            unsubscribe: () => {
                if (this.options.debug) {
                    console.log(`🔍 DEBUG: Unsubscribing from ${key}`);
                }

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

export default NATSBroadcaster;