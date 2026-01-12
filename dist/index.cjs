'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var nats_ws = require('nats.ws');

class SimpleNatsEcho {
    constructor(options) {
        this.options = options;
        this.connection = null;
        this.jsonCodec = nats_ws.JSONCodec();
        this.callbacks = new Map();
        this.subscriptions = new Map();
        this.isConnected = false;
        this.connectionPromise = null;
        this.reconnectAttempts = 0;
        this.socketIdValue = this.generateSocketId();
        this.maxReconnectAttempts = options.nats?.maxReconnectAttempts ?? 10;
    }
    generateSocketId() {
        return 'nats_' + Math.random().toString(36).substring(2, 15);
    }
    async ensureConnected() {
        if (this.isConnected && this.connection)
            return;
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connectionPromise = this.connect();
        return this.connectionPromise;
    }
    async connect() {
        try {
            let servers;
            // Build servers array
            if (this.options.nats?.servers) {
                if (Array.isArray(this.options.nats.servers)) {
                    servers = this.options.nats.servers;
                }
                else {
                    servers = [this.options.nats.servers];
                }
            }
            else {
                const protocol = this.options.forceTLS ? 'wss' : 'ws';
                const host = this.options.wsHost || 'localhost';
                const port = this.options.wsPort || 4222;
                servers = [`${protocol}://${host}:${port}`];
            }
            console.log(`🔗 Connecting to: ${servers[0]}`);
            const connectOptions = {
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
            }
            else {
                console.log('⚠️  WARNING: Server requires auth but no credentials provided');
                console.log('   Add user/pass to nats config or allow anonymous in server');
            }
            console.log('🔧 Connection options:', {
                servers: connectOptions.servers,
                hasAuth: !!(connectOptions.user && connectOptions.pass),
                timeout: connectOptions.timeout
            });
            this.connection = await nats_ws.connect(connectOptions);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log(`✅ Connected to NATS!`);
            this.setupConnectionEvents();
        }
        catch (error) {
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
    setupConnectionEvents() {
        if (!this.connection)
            return;
        // Handle disconnection
        this.connection.closed()
            .then((err) => {
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
            }
            else {
                console.log('Disconnected from NATS (clean)');
            }
        })
            .catch((err) => {
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
    createChannel(channelName, channelType = 'public') {
        const self = this;
        const channelMethods = {
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
                                const data = self.jsonCodec.decode(msg.data);
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
                            }
                            catch (error) {
                                console.error('Error processing message:', error);
                            }
                        }
                    })();
                }
                catch (error) {
                    console.error(`Failed to subscribe to ${channelName}:`, error);
                }
                return channelMethods;
            },
            listen: (event, callback) => {
                const callbackKey = `${channelName}.${event}`;
                self.callbacks.set(callbackKey, callback);
                console.log(`Registered listener for ${callbackKey}`);
                return channelMethods;
            },
            stopListening: (event) => {
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
                    const keysToDelete = [];
                    self.callbacks.forEach((_, key) => {
                        if (key.startsWith(`${channelName}.`)) {
                            keysToDelete.push(key);
                        }
                    });
                    keysToDelete.forEach(key => self.callbacks.delete(key));
                    console.log(`Unsubscribed from ${channelName}`);
                }
            },
            notification: (callback) => {
                return channelMethods.listen('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated', callback);
            }
        };
        // Add whisper method for private/presence channels
        if (channelType === 'private' || channelType === 'presence') {
            channelMethods.whisper = async (eventName, data) => {
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
                }
                catch (error) {
                    console.error('Failed to whisper:', error);
                }
            };
        }
        // Add presence methods
        if (channelType === 'presence') {
            channelMethods.here = (callback) => {
                return channelMethods.listen('presence:here', callback);
            };
            channelMethods.joining = (callback) => {
                return channelMethods.listen('presence:joining', callback);
            };
            channelMethods.leaving = (callback) => {
                return channelMethods.listen('presence:leaving', callback);
            };
        }
        return channelMethods;
    }
    async authenticateChannel(channelName) {
        if (!this.options.authEndpoint)
            return;
        try {
            const headers = {
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
        }
        catch (error) {
            console.error('Channel authentication error:', error);
            throw error;
        }
    }
    channel(channelName) {
        return this.createChannel(channelName, 'public');
    }
    private(channelName) {
        const privateChannelName = channelName.startsWith('private-')
            ? channelName
            : `private-${channelName}`;
        return this.createChannel(privateChannelName, 'private');
    }
    join(channelName) {
        const presenceChannelName = channelName.startsWith('presence-')
            ? channelName
            : `presence-${channelName}`;
        return this.createChannel(presenceChannelName, 'presence');
    }
    leave(channelName) {
        this.leaveChannel(channelName);
    }
    leaveChannel(channelName) {
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
                const keysToDelete = [];
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
    getSocketId() {
        return this.socketIdValue;
    }
    disconnect() {
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
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socketIdValue,
            subscriptionCount: this.subscriptions.size
        };
    }
}
function createNatsEcho(options) {
    const instance = new SimpleNatsEcho(options);
    const echoApi = {
        // Channel methods
        channel: (name) => instance.channel(name).subscribe(),
        private: (name) => instance.private(name).subscribe(),
        join: (name) => instance.join(name).subscribe(),
        // Management methods
        leave: (name) => instance.leave(name),
        leaveChannel: (name) => instance.leaveChannel(name),
        socketId: () => instance.getSocketId(), // Updated to use getter
        disconnect: () => instance.disconnect(),
        // Notification support
        notification: (callback) => {
            return instance.channel('notifications').notification(callback).subscribe();
        },
        // Debug/status methods
        getConnectionStatus: () => instance.getConnectionStatus(),
        // Store instance for advanced usage
        __instance: instance
    };
    return echoApi;
}

// Also export as window.Echo compatible factory
const Echo = createNatsEcho;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createNatsEcho,
        SimpleNatsEcho,
        Echo: createNatsEcho,
        default: createNatsEcho
    };
}

exports.Echo = Echo;
exports.SimpleNatsEcho = SimpleNatsEcho;
exports.createNatsEcho = createNatsEcho;
exports.default = createNatsEcho;
//# sourceMappingURL=index.cjs.map
