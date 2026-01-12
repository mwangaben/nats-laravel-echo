import { connect, JSONCodec } from 'nats.ws';
export class NatsConnector {
    constructor(options) {
        this.connection = null;
        this.jsonCodec = JSONCodec();
        this.isConnecting = false;
        this.connectionPromise = null;
        this.options = {
            reconnect: true,
            maxReconnectAttempts: 10,
            timeout: 10000,
            pingInterval: 60000,
            debug: false,
            ...options
        };
    }
    async connect() {
        if (this.connection && !this.connection.isClosed()) {
            return this.connection;
        }
        if (this.isConnecting && this.connectionPromise) {
            return this.connectionPromise;
        }
        this.isConnecting = true;
        try {
            const servers = Array.isArray(this.options.servers)
                ? this.options.servers
                : [this.options.servers];
            this.connectionPromise = connect({
                servers,
                token: this.options.token,
                user: this.options.user,
                pass: this.options.pass,
                reconnect: this.options.reconnect,
                maxReconnectAttempts: this.options.maxReconnectAttempts,
                timeout: this.options.timeout,
                pingInterval: this.options.pingInterval,
                debug: this.options.debug
            });
            this.connection = await this.connectionPromise;
            console.log(`Connected to NATS server at ${servers[0]}`);
            // Handle connection closure
            (async () => {
                try {
                    const err = await this.connection.closed();
                    if (err) {
                        console.error(`Connection to NATS closed with error:`, err);
                    }
                    else {
                        console.log('Connection to NATS server closed');
                    }
                }
                finally {
                    this.connection = null;
                    this.isConnecting = false;
                    this.connectionPromise = null;
                }
            })();
            return this.connection;
        }
        catch (error) {
            this.isConnecting = false;
            this.connectionPromise = null;
            console.error('Failed to connect to NATS:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
        this.isConnecting = false;
        this.connectionPromise = null;
    }
    getConnection() {
        return this.connection;
    }
    isConnected() {
        return this.connection !== null && !this.connection.isClosed();
    }
    async publish(subject, data) {
        if (!this.connection) {
            throw new Error('Not connected to NATS');
        }
        const payload = this.jsonCodec.encode(data);
        this.connection.publish(subject, payload);
    }
    async request(subject, data, timeout = 5000) {
        if (!this.connection) {
            throw new Error('Not connected to NATS');
        }
        const payload = this.jsonCodec.encode(data);
        const response = await this.connection.request(subject, payload, { timeout });
        return this.jsonCodec.decode(response.data);
    }
}
//# sourceMappingURL=nats-connection.js.map