export interface NatsConnectionOptions {
    servers: string | string[];
    token?: string;
    user?: string;
    pass?: string;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
    timeout?: number;
    pingInterval?: number;
    debug?: boolean;
}
export interface EchoOptions {
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
export interface EventCallback<T = any> {
    (data: T): void;
}
export interface Channel {
    subscribe(): Channel | Promise<Channel>;
    unsubscribe(): void;
    listen<T = any>(event: string, callback: EventCallback<T>): Channel;
    stopListening(event: string): Channel;
    notification<T = any>(callback: EventCallback<T>): Channel;
}
export interface PrivateChannel extends Channel {
    whisper(eventName: string, data: any): void;
}
export interface PresenceChannel extends PrivateChannel {
    here(callback: (users: any[]) => void): PresenceChannel;
    joining(callback: (user: any) => void): PresenceChannel;
    leaving(callback: (user: any) => void): PresenceChannel;
}
export interface EchoConnector {
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
}
//# sourceMappingURL=types.d.ts.map