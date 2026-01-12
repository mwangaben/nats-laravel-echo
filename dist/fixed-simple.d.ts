export interface NatsEchoOptions {
    broadcaster?: 'nats';
    wsHost?: string;
    wsPort?: number;
    nats?: {
        servers?: string | string[];
        user?: string;
        pass?: string;
        debug?: boolean;
        timeout?: number;
    };
}
export declare class FixedNatsEcho {
    private options;
    private connection;
    private jsonCodec;
    private callbacks;
    private subscriptions;
    private socketIdValue;
    private isConnected;
    constructor(options: NatsEchoOptions);
    private connect;
    socketId(): string;
    getConnectionStatus(): {
        isConnected: boolean;
        socketId: string;
        subscriptionCount: number;
    };
    channel(name: string): any;
    disconnect(): void;
}
export declare function createFixedNatsEcho(options: NatsEchoOptions): any;
//# sourceMappingURL=fixed-simple.d.ts.map