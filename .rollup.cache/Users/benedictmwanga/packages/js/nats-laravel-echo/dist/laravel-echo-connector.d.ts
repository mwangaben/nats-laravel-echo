import { NatsEchoAdapter } from './echo-adapter';
import { EchoOptions } from './types';
type LaravelEcho = any;
/**
 * Creates a Laravel Echo instance with NATS as the broadcaster
 * This is the main entry point for most users
 */
export declare function createNatsEcho(options: EchoOptions): LaravelEcho;
/**
 * Alternative: Create a custom connector class
 */
export declare class NatsConnector {
    private adapter;
    constructor(options: EchoOptions);
    connect(): void;
    listen(channel: string, event: string, callback: Function): any;
    channel(name: string): any;
    privateChannel(name: string): any;
    presenceChannel(name: string): any;
    leave(name: string): void;
    leaveChannel(name: string): void;
    socketId(): string;
    disconnect(): void;
    getAdapter(): NatsEchoAdapter;
}
export {};
//# sourceMappingURL=laravel-echo-connector.d.ts.map