// test-anonymous.cjs - Test without authentication
const { createNatsEcho } = require('./dist/index.cjs');

console.log('🧪 Testing NATS Echo WITHOUT authentication\n');

// Since your server allows anonymous connections, don't send auth
const Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: 'localhost',
    wsPort: 4223,
    forceTLS: false,

    // DO NOT include user/pass since server allows anonymous
    nats: {
        servers: 'ws://localhost:4223',
        debug: true,
        reconnect: true,
        maxReconnectAttempts: 5,
        timeout: 5000
    }
});

console.log('📡 Socket ID:', Echo.socketId());

// Check connection status
setTimeout(() => {
    const status = Echo.getConnectionStatus();
    console.log('\n🔌 Connection Status:', status);

    if (status.isConnected) {
        console.log('\n🎉 SUCCESS! Connected to NATS server');

        // Test channels
        console.log('\n🧪 Testing channels...');

        // Public channel
        const publicChannel = Echo.channel('test.public');
        publicChannel.listen('TestEvent', (data) => {
            console.log('📢 TestEvent received:', data);
        });

        // Private channel (will still work without auth for testing)
        const privateChannel = Echo.private('test.private');
        privateChannel.listen('PrivateEvent', (data) => {
            console.log('🔒 PrivateEvent received:', data);
        });

        console.log('\n✅ All channels subscribed');
        console.log('\n⏳ Waiting for events... Press Ctrl+C to exit\n');

        // Keep alive
        setInterval(() => {
            process.stdout.write('.');
        }, 5000);

    } else {
        console.log('\n❌ NOT CONNECTED');
        Echo.disconnect();
        process.exit(1);
    }
}, 2000);

// Cleanup
process.on('SIGINT', () => {
    console.log('\n\n🛑 Cleaning up...');
    Echo.disconnect();
    process.exit(0);
});