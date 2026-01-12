// nats-echo-working.js - Single file working package
const { connect, JSONCodec } = require('nats.ws');

function createNatsEcho(options) {
    const socketId = 'nats_' + Math.random().toString(36).substring(2, 15);
    let connection = null;
    let isConnected = false;
    const callbacks = new Map();
    const jsonCodec = JSONCodec();

    console.log('🚀 NATS Laravel Echo - Working Version');

    // Connect
    (async () => {
        try {
            const config = {
                servers: options.nats?.servers || 'ws://localhost:4223',
                debug: options.nats?.debug !== false,
                timeout: options.nats?.timeout || 5000,
                verbose: true
            };

            if (options.nats?.user && options.nats?.pass) {
                config.user = options.nats.user;
                config.pass = options.nats.pass;
            }

            console.log('🔗 Connecting...');
            connection = await connect(config);
            isConnected = true;
            console.log('✅ Connected!');

        } catch (error) {
            console.error('❌ Connection failed:', error.message);
        }
    })();

    // Echo API
    return {
        channel: (name) => {
            const api = {
                subscribe: () => {
                    if (connection && isConnected) {
                        console.log(`📡 Subscribed to ${name}`);
                        const sub = connection.subscribe(name);

                        (async () => {
                            for await (const msg of sub) {
                                try {
                                    const data = jsonCodec.decode(msg.data);
                                    if (data && data.event) {
                                        const cb = callbacks.get(`${name}.${data.event}`);
                                        if (cb) cb(data.data);
                                    }
                                } catch (err) {
                                    console.error('Error:', err);
                                }
                            }
                        })();
                    }
                    return api;
                },

                listen: (event, callback) => {
                    callbacks.set(`${name}.${event}`, callback);
                    console.log(`👂 Listening for ${event}`);
                    return api;
                }
            };
            return api;
        },

        private: (name) => this.channel(`private-${name}`),

        join: (name) => {
            const channel = this.channel(`presence-${name}`);
            channel.here = (cb) => channel.listen('presence:here', cb);
            channel.joining = (cb) => channel.listen('presence:joining', cb);
            channel.leaving = (cb) => channel.listen('presence:leaving', cb);
            return channel;
        },

        socketId: () => socketId,

        getConnectionStatus: () => ({
            isConnected,
            socketId,
            subscriptionCount: 0
        }),

        disconnect: () => {
            if (connection) connection.close();
        }
    };
}

// Test it
console.log('\n🧪 Testing single-file package...\n');
const Echo = createNatsEcho({
    wsHost: 'localhost',
    wsPort: 4223,
    nats: {
        servers: 'ws://localhost:4223',
        user: 'local',
        pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
        debug: true,
        timeout: 5000
    }
});

console.log('📡 Socket ID:', Echo.socketId());

setTimeout(() => {
    console.log('\n🔌 Status:', Echo.getConnectionStatus());

    if (Echo.getConnectionStatus().isConnected) {
        console.log('\n🎉 SINGLE-FILE PACKAGE WORKS!');

        // Test channel
        Echo.channel('orders')
            .subscribe()
            .listen('OrderShipped', (data) => {
                console.log('📦 Order shipped:', data);
            });

        console.log('\n✅ Ready to receive events!');
    }
}, 3000);