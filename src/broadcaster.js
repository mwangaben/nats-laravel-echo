import { connect, JSONCodec } from 'nats.ws';

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

export default NATSBroadcaster;