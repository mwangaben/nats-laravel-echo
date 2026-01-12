import { NatsConnector } from './nats-connection';
import { NatsChannel, NatsPrivateChannel, NatsPresenceChannel } from './nats-channel';
export class NatsEchoAdapter {
    constructor(options) {
        this.channels = new Map();
        this.globalCallbacks = new Map();
        this.connectionCallbacks = new Map();
        this.isDisconnected = false;
        // Connection object for Pusher compatibility
        this.connection = {
            bind: (event, callback) => {
                this.connectionCallbacks.set(event, callback);
            },
            unbind: (event) => {
                if (event) {
                    this.connectionCallbacks.delete(event);
                }
                else {
                    this.connectionCallbacks.clear();
                }
            }
        };
        this.options = options;
        this.socketIdValue = this.generateSocketId();
        // Build NATS server URL from options
        const servers = this.buildNatsServers();
        this.connector = new NatsConnector({
            servers,
            token: options.nats?.token,
            user: options.nats?.user,
            pass: options.nats?.pass,
            reconnect: options.nats?.reconnect ?? true,
            maxReconnectAttempts: options.nats?.maxReconnectAttempts ?? 10,
            timeout: options.nats?.timeout ?? 10000,
            debug: options.nats?.debug ?? (process.env.NODE_ENV === 'development')
        });
        // Auto-connect
        this.connector.connect().catch(error => {
            console.error('NATS connection failed:', error);
            this.triggerConnectionEvent('error', error);
        }).then(() => {
            this.triggerConnectionEvent('connected');
        });
    }
    generateSocketId() {
        return 'nats_' + Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    buildNatsServers() {
        const servers = [];
        if (this.options.nats?.servers) {
            if (Array.isArray(this.options.nats.servers)) {
                servers.push(...this.options.nats.servers);
            }
            else {
                servers.push(this.options.nats.servers);
            }
        }
        else {
            // Build from standard options
            const protocol = this.options.forceTLS ? 'wss' : 'ws';
            const host = this.options.wsHost || 'localhost';
            const port = this.options.wsPort || 4222;
            servers.push(`${protocol}://${host}:${port}`);
        }
        return servers;
    }
    triggerConnectionEvent(event, data) {
        const callback = this.connectionCallbacks.get(event);
        if (callback) {
            callback(data);
        }
        // Also trigger global callbacks for connection events
        const globalCallback = this.globalCallbacks.get('*');
        if (globalCallback) {
            globalCallback(event, data);
        }
    }
    // Pusher-like methods
    subscribe(channelName) {
        return this.channel(channelName);
    }
    unsubscribe(channelName) {
        this.leaveChannel(channelName);
    }
    bind(eventName, callback) {
        this.globalCallbacks.set(eventName, callback);
    }
    unbind(eventName) {
        if (eventName) {
            this.globalCallbacks.delete(eventName);
        }
        else {
            this.globalCallbacks.clear();
        }
    }
    bind_global(callback) {
        this.globalCallbacks.set('*', callback);
    }
    unbind_global(callback) {
        if (callback) {
            const globalCallback = this.globalCallbacks.get('*');
            if (globalCallback === callback) {
                this.globalCallbacks.delete('*');
            }
        }
        else {
            this.globalCallbacks.delete('*');
        }
    }
    // Channel methods
    channel(channelName) {
        if (this.channels.has(channelName)) {
            return this.channels.get(channelName);
        }
        const channel = new NatsChannel(channelName, this.connector.getConnection(), {
            authEndpoint: this.options.authEndpoint,
            headers: this.options.auth?.headers,
            namespace: this.options.namespace
        });
        this.channels.set(channelName, channel);
        return channel;
    }
    private(channelName) {
        const fullChannelName = `private-${channelName}`;
        if (this.channels.has(fullChannelName)) {
            return this.channels.get(fullChannelName);
        }
        const channel = new NatsPrivateChannel(fullChannelName, this.connector.getConnection(), {
            authEndpoint: this.options.authEndpoint,
            headers: this.options.auth?.headers,
            namespace: this.options.namespace
        });
        this.channels.set(fullChannelName, channel);
        return channel;
    }
    join(channelName) {
        const fullChannelName = `presence-${channelName}`;
        if (this.channels.has(fullChannelName)) {
            return this.channels.get(fullChannelName);
        }
        const channel = new NatsPresenceChannel(fullChannelName, this.connector.getConnection(), {
            authEndpoint: this.options.authEndpoint,
            headers: this.options.auth?.headers,
            namespace: this.options.namespace
        });
        this.channels.set(fullChannelName, channel);
        return channel;
    }
    leave(channelName) {
        this.leaveChannel(channelName);
    }
    leaveChannel(channelName) {
        // Try different channel prefixes
        const possibleNames = [
            channelName,
            `private-${channelName}`,
            `presence-${channelName}`
        ];
        for (const name of possibleNames) {
            const channel = this.channels.get(name);
            if (channel) {
                channel.unsubscribe();
                this.channels.delete(name);
                break;
            }
        }
    }
    socketId() {
        return this.socketIdValue;
    }
    disconnect() {
        if (this.isDisconnected)
            return;
        // Unsubscribe from all channels
        for (const [name, channel] of this.channels) {
            channel.unsubscribe();
        }
        this.channels.clear();
        this.globalCallbacks.clear();
        this.connectionCallbacks.clear();
        // Disconnect from NATS
        this.connector.disconnect();
        this.isDisconnected = true;
        this.triggerConnectionEvent('disconnected');
    }
    // Additional helper methods
    getConnector() {
        return this.connector;
    }
    reconnect() {
        this.isDisconnected = false;
        return this.connector.connect().then(() => {
            this.triggerConnectionEvent('reconnected');
        });
    }
}
//# sourceMappingURL=echo-adapter.js.map