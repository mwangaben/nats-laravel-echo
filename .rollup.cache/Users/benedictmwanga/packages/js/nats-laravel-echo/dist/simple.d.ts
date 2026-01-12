export interface NatsEchoOptions {
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
        reconnect?: boolean;
        maxReconnectAttempts?: number;
        timeout?: number;
        debug?: boolean;
    };
}
declare class SimpleNatsEcho {
    private options;
    private connection;
    private jsonCodec;
    private stringCodec;
    private callbacks;
    private subscriptions;
    protected socketIdCode: string;
    private isConnected;
    constructor(options: NatsEchoOptions);
    private connect;
    private getConnection;
    private createChannel;
    channel(channelName: string): any;
    private(channelName: string): any;
    join(channelName: string): any;
    leave(channelName: string): void;
    leaveChannel(channelName: string): void;
    socketId(): string;
    disconnect(): void;
}
export declare function createNatsEcho(options: NatsEchoOptions): any;
export { SimpleNatsEcho };
export default createNatsEcho;
//# sourceMappingURL=simple.d.ts.map