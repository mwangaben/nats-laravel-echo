import { connect, JSONCodec, StringCodec } from 'nats.ws';
class SimpleNatsEcho {
    constructor(options) {
        this.options = options;
        this.connection = null;
        this.jsonCodec = JSONCodec();
        this.stringCodec = StringCodec();
        this.callbacks = new Map();
        this.subscriptions = new Map();
        this.isConnected = false;
        this.socketIdCode = 'nats_' + Math.random().toString(36).substring(2, 15);
        this.connect();
    }
    async connect() {
        let servers;
        if (this.options.nats?.servers) {
            if (Array.isArray(this.options.nats.servers)) {
                servers = this.options.nats.servers;
            }
            else {
                servers = [this.options.nats.servers];
            }
        }
        else {
            const protocol = this.options.forceTLS ? 'wss' : 'ws';
            const host = this.options.wsHost || 'localhost';
            const port = this.options.wsPort || 4222;
            servers = [`${protocol}://${host}:${port}`];
        }
        try {
            this.connection = await connect({
                servers,
                token: this.options.nats?.token,
                user: this.options.nats?.user,
                pass: this.options.nats?.pass,
                reconnect: this.options.nats?.reconnect ?? true,
                maxReconnectAttempts: this.options.nats?.maxReconnectAttempts ?? 10,
                timeout: this.options.nats?.timeout ?? 10000,
                debug: this.options.nats?.debug ?? false
            });
            this.isConnected = true;
            console.log('Connected to NATS server at', servers[0]);
        }
        catch (error) {
            console.error('Failed to connect to NATS:', error);
            throw error;
        }
    }
    getConnection() {
        if (!this.connection || !this.isConnected) {
            throw new Error('Not connected to NATS');
        }
        return this.connection;
    }
    createChannel(channelName) {
        const self = this;
        const channel = {
            subscribe: () => {
                if (self.subscriptions.has(channelName)) {
                    return channel;
                }
                try {
                    const subscription = self.getConnection().subscribe(channelName);
                    self.subscriptions.set(channelName, subscription);
                    (async () => {
                        for await (const msg of subscription) {
                            try {
                                const data = self.jsonCodec.decode(msg.data);
                                if (data && data.event) {
                                    const callback = self.callbacks.get(`${channelName}.${data.event}`);
                                    if (callback) {
                                        callback(data.data);
                                    }
                                }
                            }
                            catch (error) {
                                console.error('Error processing message:', error);
                            }
                        }
                    })();
                }
                catch (error) {
                    console.error('Failed to subscribe to channel:', error);
                }
                return channel;
            },
            listen: (event, callback) => {
                self.callbacks.set(`${channelName}.${event}`, callback);
                return channel;
            },
            stopListening: (event) => {
                self.callbacks.delete(`${channelName}.${event}`);
                return channel;
            },
            unsubscribe: () => {
                const subscription = self.subscriptions.get(channelName);
                if (subscription) {
                    subscription.unsubscribe();
                    self.subscriptions.delete(channelName);
                    // Remove all callbacks for this channel
                    const keysToDelete = [];
                    self.callbacks.forEach((_, key) => {
                        if (key.startsWith(`${channelName}.`)) {
                            keysToDelete.push(key);
                        }
                    });
                    keysToDelete.forEach(key => self.callbacks.delete(key));
                }
            },
            notification: (callback) => {
                return channel.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', callback);
            }
        };
        return channel;
    }
    channel(channelName) {
        return this.createChannel(channelName);
    }
    private(channelName) {
        const privateChannelName = `private-${channelName}`;
        const channel = this.createChannel(privateChannelName);
        // Add whisper method for private channels
        channel.whisper = (eventName, data) => {
            const subject = `${privateChannelName}.client-${eventName}`;
            const payload = this.jsonCodec.encode({
                event: `client-${eventName}`,
                data: data,
                channel: privateChannelName
            });
            this.getConnection().publish(subject, payload);
        };
        return channel;
    }
    join(channelName) {
        const presenceChannelName = `presence-${channelName}`;
        const channel = this.createChannel(presenceChannelName);
        // Add presence-specific methods
        channel.here = (callback) => {
            channel.listen('presence:here', callback);
            return channel;
        };
        channel.joining = (callback) => {
            channel.listen('presence:joining', callback);
            return channel;
        };
        channel.leaving = (callback) => {
            channel.listen('presence:leaving', callback);
            return channel;
        };
        // Add whisper method from private channels
        channel.whisper = (eventName, data) => {
            const subject = `${presenceChannelName}.client-${eventName}`;
            const payload = this.jsonCodec.encode({
                event: `client-${eventName}`,
                data: data,
                channel: presenceChannelName
            });
            this.getConnection().publish(subject, payload);
        };
        return channel;
    }
    leave(channelName) {
        this.leaveChannel(channelName);
    }
    leaveChannel(channelName) {
        // Try all possible channel names
        const possibleNames = [
            channelName,
            `private-${channelName}`,
            `presence-${channelName}`
        ];
        for (const name of possibleNames) {
            const channel = this.subscriptions.get(name);
            if (channel) {
                // Find and call unsubscribe method
                if (typeof channel.unsubscribe === 'function') {
                    channel.unsubscribe();
                }
                this.subscriptions.delete(name);
            }
        }
    }
    socketId() {
        return this.socketIdCode;
    }
    disconnect() {
        if (this.connection && this.isConnected) {
            this.connection.close();
            this.isConnected = false;
        }
        this.subscriptions.clear();
        this.callbacks.clear();
    }
}
export function createNatsEcho(options) {
    const instance = new SimpleNatsEcho(options);
    // Return an object that mimics Laravel Echo's interface
    const echo = {
        // Channel methods
        channel: (name) => instance.channel(name).subscribe(),
        private: (name) => instance.private(name).subscribe(),
        join: (name) => instance.join(name).subscribe(),
        // Management methods
        leave: (name) => instance.leave(name),
        leaveChannel: (name) => instance.leaveChannel(name),
        socketId: () => instance.socketId(),
        disconnect: () => instance.disconnect(),
        // Notification support
        notification: (callback) => {
            // Create a dummy channel for notifications
            const channel = instance.channel('notifications');
            return channel.notification(callback).subscribe();
        },
        // Store instance for advanced usage
        __instance: instance
    };
    return echo;
}
export { SimpleNatsEcho };
export default createNatsEcho;
//# sourceMappingURL=simple.js.map