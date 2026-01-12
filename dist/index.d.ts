interface NatsEchoOptions {
    broadcaster?: 'nats';
    key?: string;
    cluster?: string;
    forceTLS?: boolean;
    wsHost?: string;
    wsPort?: number;
    wssPort?: number;
    enabledTransports?: string[];
    disableStats?: boolean;
    authEndpoint?: string;
    auth?: {
        headers?: Record<string, string>;
    };
    namespace?: string;
    nats?: {
        servers?: string | string[];
        token?: string;
        user?: string;
        pass?: string;
        creds?: string | Uint8Array;
        reconnect?: boolean;
        maxReconnectAttempts?: number;
        timeout?: number;
        pingInterval?: number;
        debug?: boolean;
        name?: string;
        pedantic?: boolean;
        tls?: any;
        encoding?: 'binary' | 'json' | 'string';
        verbose?: boolean;
        waitOnFirstConnect?: boolean;
    };
}
declare class SimpleNatsEcho {
    private options;
    private connection;
    private jsonCodec;
    private callbacks;
    private subscriptions;
    private socketIdValue;
    private isConnected;
    private connectionPromise;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor(options: NatsEchoOptions);
    private generateSocketId;
    private ensureConnected;
    private connect;
    private setupConnectionEvents;
    private createChannel;
    private authenticateChannel;
    channel(channelName: string): any;
    private(channelName: string): any;
    join(channelName: string): any;
    leave(channelName: string): void;
    leaveChannel(channelName: string): void;
    getSocketId(): string;
    disconnect(): void;
    getConnectionStatus(): {
        isConnected: boolean;
        socketId: string;
        subscriptionCount: number;
    };
}
declare function createNatsEcho(options: NatsEchoOptions): any;

type Channel = any;
type PrivateChannel = any;
type PresenceChannel = any;
type EventCallback = Function;

declare const Echo: typeof createNatsEcho;

export { Echo, SimpleNatsEcho, createNatsEcho, createNatsEcho as default };
export type { Channel, EventCallback, NatsEchoOptions, PresenceChannel, PrivateChannel };
