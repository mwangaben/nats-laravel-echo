import NATSConnector from './connector.js';

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

// Export only default
export default Echo;