import Echo from 'laravel-echo';
import { NatsEchoAdapter } from './echo-adapter';
/**
 * Creates a Laravel Echo instance with NATS as the broadcaster
 * This is the main entry point for most users
 */
export function createNatsEcho(options) {
    const adapter = new NatsEchoAdapter(options);
    // Create Echo with null broadcaster and our adapter as client
    const echo = new Echo({
        broadcaster: 'null', // Type assertion to bypass TypeScript checks
        client: adapter
    });
    // Override Echo methods to use our adapter
    overrideEchoMethods(echo, adapter);
    return echo;
}
/**
 * Alternative: Create a custom connector class
 */
export class NatsConnector {
    constructor(options) {
        this.adapter = new NatsEchoAdapter(options);
    }
    // Implement minimal interface for Echo
    connect() {
        // Connection is managed by the adapter
    }
    listen(channel, event, callback) {
        return this.adapter.channel(channel).listen(event, callback);
    }
    channel(name) {
        return this.adapter.channel(name);
    }
    privateChannel(name) {
        return this.adapter.private(name);
    }
    presenceChannel(name) {
        return this.adapter.join(name);
    }
    leave(name) {
        this.adapter.leaveChannel(name);
    }
    leaveChannel(name) {
        this.adapter.leaveChannel(name);
    }
    socketId() {
        return this.adapter.socketId();
    }
    disconnect() {
        this.adapter.disconnect();
    }
    // Get the underlying adapter
    getAdapter() {
        return this.adapter;
    }
}
/**
 * Helper function to override Echo methods
 */
function overrideEchoMethods(echo, adapter) {
    // Store original methods
    const original = {
        channel: echo.channel,
        private: echo.private,
        join: echo.join,
        leave: echo.leave,
        leaveChannel: echo.leaveChannel,
        socketId: echo.socketId,
        disconnect: echo.disconnect,
    };
    // Override with adapter methods
    echo.channel = (name) => {
        const channel = adapter.channel(name);
        return channel.subscribe ? channel.subscribe() : channel;
    };
    echo.private = (name) => {
        const channel = adapter.private(name);
        return channel.subscribe ? channel.subscribe() : channel;
    };
    echo.join = (name) => {
        const channel = adapter.join(name);
        return channel.subscribe ? channel.subscribe() : channel;
    };
    echo.leave = (name) => {
        adapter.leaveChannel(name);
    };
    echo.leaveChannel = (name) => {
        adapter.leaveChannel(name);
    };
    echo.socketId = () => {
        return adapter.socketId();
    };
    echo.disconnect = () => {
        adapter.disconnect();
    };
    // Store original methods for potential restoration
    echo.__originalMethods = original;
}
//# sourceMappingURL=laravel-echo-connector.js.map