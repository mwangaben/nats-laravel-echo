import { NatsConnection } from 'nats.ws';
import { NatsConnectionOptions } from './types';
export declare class NatsConnector {
    private connection;
    private options;
    private jsonCodec;
    private isConnecting;
    private connectionPromise;
    constructor(options: NatsConnectionOptions);
    connect(): Promise<NatsConnection>;
    disconnect(): Promise<void>;
    getConnection(): NatsConnection | null;
    isConnected(): boolean;
    publish(subject: string, data: any): Promise<void>;
    request(subject: string, data: any, timeout?: number): Promise<any>;
}
//# sourceMappingURL=nats-connection.d.ts.map