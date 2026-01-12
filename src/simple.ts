import { connect, JSONCodec } from 'nats.ws';

export interface NatsEchoOptions {
    // Pusher-compatible options (for API compatibility)
    broadcaster?: 'nats';
    key?: string; // App key (kept for API compatibility)
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

    // NATS specific options
    nats?: {
        // Connection options
        servers?: string | string[];

        // Authentication options (choose one)
        token?: string;           // Token authentication
        user?: string;            // Username for user/pass auth
        pass?: string;            // Password for user/pass auth
        creds?: string | Uint8Array; // JWT credentials file

        // Connection settings
        reconnect?: boolean;
        maxReconnectAttempts?: number;
        timeout?: number;
        pingInterval?: number;
        debug?: boolean;

        // Additional NATS options
        name?: string;           // Client name
        pedantic?: boolean;
        tls?: any;              // TLS options
        encoding?: 'binary' | 'json' | 'string';
        verbose?: boolean;
        waitOnFirstConnect?: boolean;
    };
}

class SimpleNatsEcho {
    private connection: any = null;
    private jsonCodec = JSONCodec();
    private callbacks = new Map<string, Function>();
    private subscriptions = new Map<string, any>();
    private socketIdValue: string; // Renamed to avoid conflict
    private isConnected = false;
    private connectionPromise: Promise<any> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts: number;

    constructor(private options: NatsEchoOptions) {
        this.socketIdValue = this.generateSocketId();
        this.maxReconnectAttempts = options.nats?.maxReconnectAttempts ?? 10;
    }

    private generateSocketId(): string {
        return 'nats_' + Math.random().toString(36).substring(2, 15);
    }

    private async ensureConnected(): Promise<void> {
        if (this.isConnected && this.connection) return;

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this.connect();
        return this.connectionPromise;
    }


    private async connect(): Promise<void> {
        try {
            let servers: string[];

            // Build servers array
            if (this.options.nats?.servers) {
                if (Array.isArray(this.options.nats.servers)) {
                    servers = this.options.nats.servers;
                } else {
                    servers = [this.options.nats.servers];
                }
            } else {
                const protocol = this.options.forceTLS ? 'wss' : 'ws';
                const host = this.options.wsHost || 'localhost';
                const port = this.options.wsPort || 4222;
                servers = [`${protocol}://${host}:${port}`];
            }

            console.log(`🔗 Connecting to: ${servers[0]}`);

            const connectOptions: any = {
                servers,
                reconnect: this.options.nats?.reconnect ?? true,
                maxReconnectAttempts: this.maxReconnectAttempts,
                timeout: this.options.nats?.timeout ?? 10000,
                pingInterval: this.options.nats?.pingInterval ?? 60000,
                debug: this.options.nats?.debug ?? false,
                verbose: this.options.nats?.verbose ?? true, // Enable verbose for debugging
                waitOnFirstConnect: this.options.nats?.waitOnFirstConnect ?? true,
                name: this.options.nats?.name || `laravel-echo-${this.socketIdValue.substring(0, 8)}`,
            };

            // CRITICAL: Server requires auth (auth_required: true)
            // So we MUST send authentication
            if (this.options.nats?.user && this.options.nats?.pass) {
                connectOptions.user = this.options.nats.user;
                connectOptions.pass = this.options.nats.pass;
                console.log('🔐 Using authentication:', this.options.nats.user);
            } else {
                console.log('⚠️  WARNING: Server requires auth but no credentials provided');
                console.log('   Add user/pass to nats config or allow anonymous in server');
            }

            console.log('🔧 Connection options:', {
                servers: connectOptions.servers,
                hasAuth: !!(connectOptions.user && connectOptions.pass),
                timeout: connectOptions.timeout
            });

            this.connection = await connect(connectOptions);

            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log(`✅ Connected to NATS!`);

            this.setupConnectionEvents();

        } catch (error: any) {
            console.error('❌ Connection failed:', error.message);

            if (error.message.includes('Authentication')) {
                console.log('🔐 Authentication error - check credentials in nats config');
            }

            throw error;
        }
    }


    // private async connect(): Promise<void> {
    //     try {
    //         let servers: string[];
    //
    //         // Build servers array from options
    //         if (this.options.nats?.servers) {
    //             if (Array.isArray(this.options.nats.servers)) {
    //                 servers = this.options.nats.servers;
    //             } else {
    //                 servers = [this.options.nats.servers];
    //             }
    //         } else {
    //             // Build from Pusher-style options
    //             const protocol = this.options.forceTLS ? 'wss' : 'ws';
    //             const host = this.options.wsHost || 'localhost';
    //             const port = this.options.wsPort || 4222;
    //             servers = [`${protocol}://${host}:${port}`];
    //         }
    //
    //         console.log(`🔗 Connecting to NATS WebSocket: ${servers[0]}`);
    //
    //         // Prepare NATS connection options
    //         const connectOptions: any = {
    //             servers,
    //             reconnect: this.options.nats?.reconnect ?? true,
    //             maxReconnectAttempts: this.maxReconnectAttempts,
    //             timeout: this.options.nats?.timeout ?? 10000,
    //             pingInterval: this.options.nats?.pingInterval ?? 60000,
    //             debug: this.options.nats?.debug ?? false,
    //             verbose: this.options.nats?.verbose ?? false,
    //             waitOnFirstConnect: this.options.nats?.waitOnFirstConnect ?? true,
    //             name: this.options.nats?.name || `laravel-echo-${this.socketIdValue.substring(0, 8)}`,
    //         };
    //
    //         console.log('🔧 Connection options prepared');
    //
    //         // CRITICAL FIX: Only add authentication if BOTH user AND pass are provided
    //         // AND the server actually requires it
    //         if (this.options.nats?.user && this.options.nats?.pass) {
    //             // Try with auth first
    //             console.log('🔐 Attempting connection WITH authentication...');
    //             connectOptions.user = this.options.nats.user;
    //             connectOptions.pass = this.options.nats.pass;
    //         } else {
    //             console.log('🔓 Attempting connection WITHOUT authentication');
    //         }
    //
    //         this.connection = await connect(connectOptions);
    //
    //         this.isConnected = true;
    //         this.reconnectAttempts = 0;
    //         console.log(`✅ Connected to NATS at ${servers[0]}`);
    //
    //         // Setup event handlers
    //         this.setupConnectionEvents();
    //
    //     } catch (error: any) {
    //         console.error('❌ Connection failed:', error.message);
    //
    //         // If authentication failed, try without it
    //         if (error.message.includes('Authentication') && this.options.nats?.user && this.options.nats?.pass) {
    //             console.log('🔄 Authentication failed, retrying without credentials...');
    //
    //             // Remove auth and retry
    //             const retryOptions = { ...this.options };
    //             if (retryOptions.nats) {
    //                 delete retryOptions.nats.user;
    //                 delete retryOptions.nats.pass;
    //             }
    //
    //             // Create a new instance without auth
    //             const retryInstance = new SimpleNatsEcho(retryOptions);
    //             this.connection = retryInstance.connection;
    //             this.isConnected = retryInstance.isConnected;
    //
    //             if (this.isConnected) {
    //                 console.log('✅ Connected without authentication');
    //                 return;
    //             }
    //         }
    //
    //         throw error;
    //     }
    // }

    // private async connect(): Promise<void> {
    //     try {
    //         let servers: string[];
    //
    //         // Build servers array from options
    //         if (this.options.nats?.servers) {
    //             if (Array.isArray(this.options.nats.servers)) {
    //                 servers = this.options.nats.servers;
    //             } else {
    //                 servers = [this.options.nats.servers];
    //             }
    //         } else {
    //             // Build from Pusher-style options for backward compatibility
    //             const protocol = this.options.forceTLS ? 'wss' : 'ws';
    //             const host = this.options.wsHost || 'localhost';
    //             const port = this.options.wsPort || 4222;
    //             servers = [`${protocol}://${host}:${port}`];
    //         }
    //
    //         // Prepare NATS connection options
    //         const connectOptions: any = {
    //             servers,
    //             reconnect: this.options.nats?.reconnect ?? true,
    //             maxReconnectAttempts: this.maxReconnectAttempts,
    //             timeout: this.options.nats?.timeout ?? 10000,
    //             pingInterval: this.options.nats?.pingInterval ?? 60000,
    //             debug: this.options.nats?.debug ?? false,
    //             verbose: this.options.nats?.verbose ?? false,
    //             waitOnFirstConnect: this.options.nats?.waitOnFirstConnect ?? true,
    //             name: this.options.nats?.name || `laravel-echo-${this.socketIdValue.substring(0, 8)}`,
    //         };
    //
    //         // Handle authentication methods (in priority order)
    //         if (this.options.nats?.token) {
    //             // Token authentication
    //             connectOptions.token = this.options.nats.token;
    //             console.log('Using token authentication for NATS');
    //         } else if (this.options.nats?.user && this.options.nats?.pass) {
    //             // User/Password authentication
    //             connectOptions.user = this.options.nats.user;
    //             connectOptions.pass = this.options.nats.pass;
    //             console.log('Using user/password authentication for NATS');
    //         } else if (this.options.nats?.creds) {
    //             // JWT credentials
    //             connectOptions.creds = this.options.nats.creds;
    //             console.log('Using JWT credentials for NATS');
    //         } else {
    //             console.log('Using no authentication for NATS (if server allows)');
    //         }
    //
    //         // Handle TLS if specified
    //         if (this.options.nats?.tls) {
    //             connectOptions.tls = this.options.nats.tls;
    //         }
    //
    //         console.log(`Connecting to NATS servers: ${servers.join(', ')}`);
    //
    //         this.connection = await connect(connectOptions);
    //
    //         this.isConnected = true;
    //         this.reconnectAttempts = 0;
    //         console.log(`✅ Connected to NATS at ${servers[0]}`);
    //
    //         // Setup event handlers
    //         this.setupConnectionEvents();
    //
    //     } catch (error: any) { // Added type annotation
    //         this.connectionPromise = null;
    //         this.reconnectAttempts++;
    //
    //         if (this.reconnectAttempts >= this.maxReconnectAttempts) {
    //             console.error(`❌ Failed to connect to NATS after ${this.reconnectAttempts} attempts:`, error);
    //             throw new Error(`Failed to connect to NATS after ${this.reconnectAttempts} attempts: ${error.message}`);
    //         } else {
    //             console.warn(`⚠️ Connection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} failed:`, error.message);
    //             // Wait before retrying
    //             await new Promise(resolve => setTimeout(resolve, 1000));
    //             return this.connect(); // Retry
    //         }
    //     }
    // }

    private setupConnectionEvents(): void {
        if (!this.connection) return;

        // Handle disconnection
        this.connection.closed()
            .then((err: Error | undefined) => {
                this.isConnected = false;
                this.connection = null;
                this.connectionPromise = null;

                if (err) {
                    console.error('❌ Disconnected from NATS with error:', err.message);
                    this.reconnectAttempts++;

                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        setTimeout(() => this.connect(), 2000);
                    }
                } else {
                    console.log('Disconnected from NATS (clean)');
                }
            })
            .catch((err: Error) => {
                console.error('Error in connection closed handler:', err);
            });

        // Listen for errors
        (async () => {
            for await (const err of this.connection.status()) {
                switch (err.type) {
                    case 'disconnect':
                        console.warn('NATS disconnected');
                        break;
                    case 'reconnect':
                        console.log('NATS reconnected');
                        this.isConnected = true;
                        break;
                    case 'update':
                        console.log('NATS connection update:', err.data);
                        break;
                    case 'error':
                        console.error('NATS error:', err.data);
                        break;
                    default:
                        console.log('NATS status:', err.type, err.data);
                }
            }
        })();
    }

    private createChannel(channelName: string, channelType: 'public' | 'private' | 'presence' = 'public'): any {
        const self = this;

        const channelMethods: any = {
            subscribe: async () => {
                try {
                    await self.ensureConnected();

                    if (self.subscriptions.has(channelName)) {
                        console.log(`Already subscribed to ${channelName}`);
                        return channelMethods;
                    }

                    // Authenticate private/presence channels if needed
                    if ((channelType === 'private' || channelType === 'presence') &&
                        self.options.authEndpoint &&
                        !channelName.startsWith('private-') &&
                        !channelName.startsWith('presence-')) {
                        await self.authenticateChannel(channelName);
                    }

                    const subscription = self.connection.subscribe(channelName);
                    self.subscriptions.set(channelName, subscription);

                    console.log(`✅ Subscribed to ${channelName}`);

                    // Process incoming messages
                    (async () => {
                        for await (const msg of subscription) {
                            try {
                                const data = self.jsonCodec.decode(msg.data) as any;
                                if (data && data.event) {
                                    const callbackKey = `${channelName}.${data.event}`;
                                    const callback = self.callbacks.get(callbackKey);
                                    if (callback) {
                                        callback(data.data);
                                    }

                                    // Also check for wildcard listeners
                                    const wildcardCallback = self.callbacks.get(`${channelName}.*`);
                                    if (wildcardCallback) {
                                        wildcardCallback({ event: data.event, data: data.data });
                                    }
                                }
                            } catch (error) {
                                console.error('Error processing message:', error);
                            }
                        }
                    })();
                } catch (error: any) {
                    console.error(`Failed to subscribe to ${channelName}:`, error);
                }

                return channelMethods;
            },

            listen: (event: string, callback: Function) => {
                const callbackKey = `${channelName}.${event}`;
                self.callbacks.set(callbackKey, callback);
                console.log(`Registered listener for ${callbackKey}`);
                return channelMethods;
            },

            stopListening: (event: string) => {
                const callbackKey = `${channelName}.${event}`;
                const removed = self.callbacks.delete(callbackKey);
                if (removed) {
                    console.log(`Removed listener for ${callbackKey}`);
                }
                return channelMethods;
            },

            unsubscribe: () => {
                const subscription = self.subscriptions.get(channelName);
                if (subscription) {
                    subscription.unsubscribe();
                    self.subscriptions.delete(channelName);

                    // Clean up callbacks for this channel
                    const keysToDelete: string[] = [];
                    self.callbacks.forEach((_, key) => {
                        if (key.startsWith(`${channelName}.`)) {
                            keysToDelete.push(key);
                        }
                    });
                    keysToDelete.forEach(key => self.callbacks.delete(key));

                    console.log(`Unsubscribed from ${channelName}`);
                }
            },

            notification: (callback: Function) => {
                return channelMethods.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', callback);
            }
        };

        // Add whisper method for private/presence channels
        if (channelType === 'private' || channelType === 'presence') {
            channelMethods.whisper = async (eventName: string, data: any) => {
                try {
                    await self.ensureConnected();

                    if (!self.connection || !self.isConnected) {
                        throw new Error('Not connected to NATS');
                    }

                    const subject = `${channelName}.client-${eventName}`;
                    const payload = self.jsonCodec.encode({
                        event: `client-${eventName}`,
                        data: data,
                        channel: channelName,
                        socket_id: self.socketIdValue
                    });

                    self.connection.publish(subject, payload);
                    console.log(`Whispered to ${subject}:`, data);
                } catch (error: any) {
                    console.error('Failed to whisper:', error);
                }
            };
        }

        // Add presence methods
        if (channelType === 'presence') {
            channelMethods.here = (callback: Function) => {
                return channelMethods.listen('presence:here', callback);
            };

            channelMethods.joining = (callback: Function) => {
                return channelMethods.listen('presence:joining', callback);
            };

            channelMethods.leaving = (callback: Function) => {
                return channelMethods.listen('presence:leaving', callback);
            };
        }

        return channelMethods;
    }

    private async authenticateChannel(channelName: string): Promise<void> {
        if (!this.options.authEndpoint) return;

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(this.options.auth?.headers || {})
            };

            const response = await fetch(this.options.authEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    channel_name: channelName,
                    socket_id: this.socketIdValue
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.statusText}`);
            }

            console.log(`✅ Authenticated channel: ${channelName}`);
        } catch (error: any) {
            console.error('Channel authentication error:', error);
            throw error;
        }
    }

    channel(channelName: string): any {
        return this.createChannel(channelName, 'public');
    }

    private(channelName: string): any {
        const privateChannelName = channelName.startsWith('private-')
            ? channelName
            : `private-${channelName}`;
        return this.createChannel(privateChannelName, 'private');
    }

    join(channelName: string): any {
        const presenceChannelName = channelName.startsWith('presence-')
            ? channelName
            : `presence-${channelName}`;
        return this.createChannel(presenceChannelName, 'presence');
    }

    leave(channelName: string): void {
        this.leaveChannel(channelName);
    }

    leaveChannel(channelName: string): void {
        const possibleNames = [
            channelName,
            `private-${channelName}`,
            `presence-${channelName}`
        ];

        for (const name of possibleNames) {
            const subscription = this.subscriptions.get(name);
            if (subscription) {
                subscription.unsubscribe();
                this.subscriptions.delete(name);

                // Clean up callbacks
                const keysToDelete: string[] = [];
                this.callbacks.forEach((_, key) => {
                    if (key.startsWith(`${name}.`)) {
                        keysToDelete.push(key);
                    }
                });
                keysToDelete.forEach(key => this.callbacks.delete(key));

                console.log(`Left channel: ${name}`);
            }
        }
    }

    // Getter method for socketId
    getSocketId(): string {
        return this.socketIdValue;
    }

    disconnect(): void {
        if (this.connection && this.isConnected) {
            this.connection.close();
            console.log('Disconnecting from NATS...');
        }
        this.subscriptions.clear();
        this.callbacks.clear();
        this.isConnected = false;
        this.connection = null;
        this.connectionPromise = null;
        console.log('Disconnected from NATS');
    }

    // Helper method to get connection status
    getConnectionStatus(): { isConnected: boolean; socketId: string; subscriptionCount: number } {
        return {
            isConnected: this.isConnected,
            socketId: this.socketIdValue,
            subscriptionCount: this.subscriptions.size
        };
    }
}

export function createNatsEcho(options: NatsEchoOptions): any {
    const instance = new SimpleNatsEcho(options);

    const echoApi: any = {
        // Channel methods
        channel: (name: string) => instance.channel(name).subscribe(),
        private: (name: string) => instance.private(name).subscribe(),
        join: (name: string) => instance.join(name).subscribe(),

        // Management methods
        leave: (name: string) => instance.leave(name),
        leaveChannel: (name: string) => instance.leaveChannel(name),
        socketId: () => instance.getSocketId(), // Updated to use getter

        disconnect: () => instance.disconnect(),

        // Notification support
        notification: (callback: Function) => {
            return instance.channel('notifications').notification(callback).subscribe();
        },

        // Debug/status methods
        getConnectionStatus: () => instance.getConnectionStatus(),

        // Store instance for advanced usage
        __instance: instance
    };

    return echoApi;
}

export { SimpleNatsEcho };
export default createNatsEcho;