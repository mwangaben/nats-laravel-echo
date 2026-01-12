// quick-direct-test.cjs
const { connect, JSONCodec } = require('nats.ws');

console.log('⚡ Quick Direct Test\n');

// Direct implementation
class QuickNatsEcho {
    constructor(options) {
        this.options = options;
        this.socketId = 'nats_' + Math.random().toString(36).substring(2, 15);
        this.connection = null;
        this.isConnected = false;
        this.connect();
    }

    async connect() {
        try {
            const config = {
                servers: 'ws://localhost:4223',
                user: 'local',
                pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
                debug: true,
                timeout: 5000,
                verbose: true
            };

            console.log('Connecting with:', config);
            this.connection = await connect(config);
            this.isConnected = true;
            console.log('✅ Connected!');

        } catch (error) {
            console.error('❌ Connection failed:', error.message);
        }
    }

    socketId() {
        return this.socketId;
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            socketId: this.socketId
        };
    }
}

// Test it
const echo = new QuickNatsEcho({});
console.log('\n📡 Socket ID:', echo.socketId());

setTimeout(() => {
    const status = echo.getConnectionStatus();
    console.log('\n🔌 Connection Status:', status);

    if (status.isConnected) {
        console.log('\n🎉 DIRECT IMPLEMENTATION WORKS!');
        console.log('\n💡 The issue is in our package build/export.');
    }
}, 3000);