import { connect, JSONCodec } from 'nats.ws';

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

export class FixedNatsEcho {
    private connection: any = null;
    private jsonCodec = JSONCodec();
    private callbacks = new Map<string, Function>();
    private subscriptions = new Map<string, any>();
    private socketIdValue: string;  // Renamed to avoid conflict
    private isConnected = false;

    constructor(private options: NatsEchoOptions) {
        this.socketIdValue = 'nats_' + Math.random().toString(36).substring(2, 15);
        this.connect();
    }

    private async connect(): Promise<void> {
        try {
            let servers: string;

            if (this.options.nats?.servers) {
                servers = Array.isArray(this.options.nats.servers)
                    ? this.options.nats.servers[0]
                    : this.options.nats.servers;
            } else {
                const host = this.options.wsHost || 'localhost';
                const port = this.options.wsPort || 4222;
                servers = `ws://${host}:${port}`;
            }

            console.log(`🔗 Connecting to: ${servers}`);

            const connectOptions: any = {
                servers: [servers],
                debug: this.options.nats?.debug ?? true,
                timeout: this.options.nats?.timeout ?? 5000,
                reconnect: false,
                verbose: true
            };

            if (this.options.nats?.user && this.options.nats?.pass) {
                connectOptions.user = this.options.nats.user;
                connectOptions.pass = this.options.nats.pass;
            }

            this.connection = await connect(connectOptions);
            this.isConnected = true;

            console.log('✅ Connected to NATS!');

            this.connection.closed().then(() => {
                this.isConnected = false;
                console.log('🔌 Disconnected from NATS');
            });

        } catch (error: any) {
            console.error('❌ Connection failed:', error.message);
        }
    }

    // Public method - Laravel Echo expects socketId()
    socketId(): string {
        return this.socketIdValue;
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socketIdValue,
            subscriptionCount: this.subscriptions.size
        };
    }

    channel(name: string): any {
        const self = this;

        return {
            subscribe: () => {
                if (!self.connection || !self.isConnected) {
                    console.log('⚠️  Not connected, cannot subscribe');
                    return this;
                }

                console.log(`📡 Subscribing to ${name}`);
                const subscription = self.connection.subscribe(name);
                self.subscriptions.set(name, subscription);

                (async () => {
                    for await (const msg of subscription) {
                        try {
                            const data = self.jsonCodec.decode(msg.data) as any;
                            if (data && data.event) {
                                const callback = self.callbacks.get(`${name}.${data.event}`);
                                if (callback) {
                                    callback(data.data);
                                }
                            }
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    }
                })();

                return this;
            },

            listen: (event: string, callback: Function) => {
                self.callbacks.set(`${name}.${event}`, callback);
                console.log(`👂 Listening for ${event} on ${name}`);
                return this;
            }
        };
    }

    disconnect(): void {
        if (this.connection) {
            this.connection.close();
        }
    }
}

export function createFixedNatsEcho(options: NatsEchoOptions): any {
    const instance = new FixedNatsEcho(options);

    return {
        channel: (name: string) => instance.channel(name).subscribe(),
        private: (name: string) => instance.channel(`private-${name}`).subscribe(),
        join: (name: string) => {
            const channel = instance.channel(`presence-${name}`).subscribe();
            channel.here = (callback: Function) => channel.listen('presence:here', callback);
            channel.joining = (callback: Function) => channel.listen('presence:joining', callback);
            channel.leaving = (callback: Function) => channel.listen('presence:leaving', callback);
            return channel;
        },
        socketId: () => instance.socketId(),
        getConnectionStatus: () => instance.getConnectionStatus(),
        disconnect: () => instance.disconnect()
    };
}