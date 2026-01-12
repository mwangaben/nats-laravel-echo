// test-echo-fixed.cjs - Test with authentication
const { createNatsEcho } = require('./dist/index.cjs');

console.log('🔧 Testing NATS Echo WITH authentication\n');

// Use authentication since server requires it
const Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: 'localhost',
    wsPort: 4223,
    forceTLS: false,

    // MUST include authentication
    nats: {
        servers: 'ws://localhost:4223',
        user: 'local',
        pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
        debug: true,
        reconnect: true,
        maxReconnectAttempts: 5,
        timeout: 5000,
        verbose: true
    }
});

console.log('📡 Socket ID:', Echo.socketId());

// Check connection with timeout
setTimeout(async () => {
    try {
        const status = Echo.getConnectionStatus();
        console.log('\n🔌 Connection Status:', status);

        if (status.isConnected) {
            console.log('\n🎉 SUCCESS! Connected to NATS');

            // Test all channel types
            console.log('\n🧪 Testing channels...');

            // Public channel
            console.log('1️⃣ Public channel');
            const publicChannel = Echo.channel('test.public');
            publicChannel.listen('TestEvent', (data) => {
                console.log('   📢 TestEvent:', data);
            });

            // Private channel
            console.log('2️⃣ Private channel');
            const privateChannel = Echo.private('test.private');
            privateChannel.listen('PrivateEvent', (data) => {
                console.log('   🔒 PrivateEvent:', data);
            });

            // Presence channel
            console.log('3️⃣ Presence channel');
            const presenceChannel = Echo.join('test.presence');
            presenceChannel
                .here((users) => console.log('   👥 Users here:', users))
                .joining((user) => console.log('   👋 User joined:', user))
                .leaving((user) => console.log('   👋 User left:', user));

            // Laravel-style channel
            console.log('4️⃣ Laravel orders channel');
            const ordersChannel = Echo.channel('orders');
            ordersChannel.listen('OrderShipped', (data) => {
                console.log('   📦 Order shipped:', data);
            });

            console.log('\n✅ All channels subscribed');
            console.log('\n⏳ Waiting for events... Press Ctrl+C to exit\n');

            // Keep alive
            setInterval(() => {
                const s = Echo.getConnectionStatus();
                process.stdout.write(`[Connected: ${s.isConnected}, Subs: ${s.subscriptionCount}] `);
            }, 5000);

        } else {
            console.log('\n❌ NOT CONNECTED');
            console.log('\n💡 Check:');
            console.log('   1. NATS server is running');
            console.log('   2. Credentials are correct');
            console.log('   3. User has permissions in NATS config');
            Echo.disconnect();
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        Echo.disconnect();
        process.exit(1);
    }
}, 3000);

// Cleanup
process.on('SIGINT', () => {
    console.log('\n\n🛑 Cleaning up...');
    Echo.disconnect();
    process.exit(0);
});