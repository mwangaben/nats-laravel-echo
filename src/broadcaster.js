// src/broadcaster.js
const { connect, JSONCodec } = require('nats.ws');

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

module.exports = NATSBroadcaster;