import { NatsConnector } from './nats-connection';
import { EchoConnector, Channel, PrivateChannel, PresenceChannel, EchoOptions } from './types';
export declare class NatsEchoAdapter implements EchoConnector {
    private connector;
    private options;
    private channels;
    private socketIdValue;
    private globalCallbacks;
    private connectionCallbacks;
    private isDisconnected;
    constructor(options: EchoOptions);
    private generateSocketId;
    private buildNatsServers;
    private triggerConnectionEvent;
    subscribe(channelName: string): Channel;
    unsubscribe(channelName: string): void;
    bind(eventName: string, callback: Function): void;
    unbind(eventName?: string): void;
    bind_global(callback: Function): void;
    unbind_global(callback?: Function): void;
    channel(channelName: string): Channel;
    private(channelName: string): PrivateChannel;
    join(channelName: string): PresenceChannel;
    leave(channelName: string): void;
    leaveChannel(channelName: string): void;
    socketId(): string;
    disconnect(): void;
    connection: {
        bind: (event: string, callback: Function) => void;
        unbind: (event?: string) => void;
    };
    getConnector(): NatsConnector;
    reconnect(): Promise<void>;
}
//# sourceMappingURL=echo-adapter.d.ts.map