// test/test.js
// const Echo = require('../dist/index.cjs');
import Echo from '../dist/index.cjs';

async function testEcho() {
    console.log('🧪 Testing Laravel Echo NATS Broadcaster\n');

    const echo = new Echo({
        broadcaster: 'nats',
        host: 'ws://localhost:4223',
        auth: {
            user: 'local',
            pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH'
        },
        debug: true,
        timeout: 5000
    });

    console.log('📡 Created Echo instance');

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get socket ID after connection
    console.log('📡 Socket ID:', echo.socketId());

    console.log('\n🔌 Status:', echo.getConnectionStatus());

    if (echo.getConnectionStatus().isConnected) {
        console.log('\n✅ Connected successfully!');

        // Test public channel
        echo.channel('orders')
            .listen('OrderShipped', (data) => {
                console.log('\n📦 Order shipped:', data);
            });

        console.log('👂 Listening for OrderShipped events on "orders" channel');

        // Test private channel
        echo.private('user.123')
            .listen('UserUpdated', (data) => {
                console.log('\n👤 User updated:', data);
            });

        console.log('👂 Listening for UserUpdated events on private "user.123" channel');

        // Test presence channel
        const presenceChannel = echo.join('chat');
        presenceChannel
            .here((users) => {
                console.log('\n👥 Users in chat:', users);
            })
            .joining((user) => {
                console.log('\n👋 User joined:', user);
            })
            .leaving((user) => {
                console.log('\n👋 User left:', user);
            });

        console.log('👥 Listening for presence events on "chat" channel');

        console.log('\n✅ Echo is ready! Waiting for events...\n');

        // Keep alive
        setInterval(() => {
            const status = echo.getConnectionStatus();
            console.log('🟢 Heartbeat - Status:', status);
        }, 30000);

    } else {
        console.error('❌ Failed to connect');
        echo.disconnect();
    }
}

testEcho().catch(console.error);