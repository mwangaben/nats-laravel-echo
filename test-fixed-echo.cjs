// test-fixed-echo.cjs - Test the fixed implementation
const { createFixedNatsEcho } = require('./fixed-simple.js');

console.log('🔧 Testing FIXED NATS Echo\n');

const Echo = createFixedNatsEcho({
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
    const status = Echo.getConnectionStatus();
    console.log('\n🔌 Connection Status:', status);

    if (status.isConnected) {
        console.log('\n🎉 CONNECTED! Testing channels...');

        // Test orders channel (from your original example)
        const ordersChannel = Echo.channel('orders');
        ordersChannel.listen('OrderShipped', (data) => {
            console.log('\n📦 OrderShipped:', data);
        });

        console.log('✅ Listening for OrderShipped on "orders"');

        // Test private channel
        const privateChannel = Echo.private('chat.123');
        privateChannel.listen('MessageSent', (data) => {
            console.log('\n💬 MessageSent:', data);
        });

        console.log('✅ Listening for MessageSent on private-chat.123');

        console.log('\n⏳ Waiting for events... Press Ctrl+C to exit\n');

    } else {
        console.log('\n❌ Still not connected');
    }
}, 3000);

process.on('SIGINT', () => {
    Echo.disconnect();
    process.exit(0);
});