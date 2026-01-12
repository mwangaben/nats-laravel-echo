import { NatsConnection, Subscription } from 'nats.ws';
import { EventCallback, Channel, PrivateChannel, PresenceChannel } from './types';
export declare class NatsChannel implements Channel {
    protected name: string;
    protected connection: NatsConnection;
    protected subscription: Subscription | null;
    protected callbacks: Map<string, EventCallback>;
    protected jsonCodec: import("nats.ws").Codec<unknown>;
    protected stringCodec: import("nats.ws").Codec<string>;
    protected options: any;
    protected subscribed: boolean;
    constructor(name: string, connection: NatsConnection, options?: any);
    subscribe(): Channel;
    listen<T = any>(event: string, callback: EventCallback<T>): Channel;
    notification<T = any>(callback: EventCallback<T>): Channel;
    protected handleEvent(event: string, data: any): void;
    unsubscribe(): void;
    stopListening(event: string): Channel;
}
export declare class NatsPrivateChannel extends NatsChannel implements PrivateChannel {
    private authEndpoint?;
    private headers?;
    constructor(name: string, connection: NatsConnection, options: any);
    subscribe(): Promise<Channel>;
    private authenticate;
    whisper(eventName: string, data: any): void;
}
export declare class NatsPresenceChannel extends NatsPrivateChannel implements PresenceChannel {
    private presenceCallbacks;
    constructor(name: string, connection: NatsConnection, options: any);
    here(callback: (users: any[]) => void): PresenceChannel;
    joining(callback: (user: any) => void): PresenceChannel;
    leaving(callback: (user: any) => void): PresenceChannel;
    protected handleEvent(event: string, data: any): void;
}
//# sourceMappingURL=nats-channel.d.ts.map