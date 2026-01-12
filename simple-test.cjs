// simple-test.cjs
const { createNatsEcho } = require('./dist/index.cjs');

console.log('Testing NATS Laravel Echo...\n');

// Using your NATS credentials
const echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: process.env.NATS_HOST || 'localhost',
    wsPort: parseInt(process.env.NATS_PORT || 4222),

    // NATS-specific authentication
    nats: {
        servers: process.env.NATS_SERVERS || `ws://${process.env.NATS_HOST || 'localhost'}:${process.env.NATS_PORT || 4222}`,
        user: process.env.NATS_USER,      // 'local'
        pass: process.env.NATS_PASS,      // '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH'
        debug: process.env.NATS_DEBUG === 'true',
        reconnect: true,
        maxReconnectAttempts: 5,
        timeout: 5000
    }
});

console.log('Socket ID:', echo.socketId());
console.log('Connection Status:', echo.getConnectionStatus());

// Test public channel
const publicChannel = echo.channel('test-channel');
publicChannel.listen('TestEvent', (data) => {
    console.log('\nTestEvent received:', data);
});

console.log('\nSubscribed to test-channel. Waiting for events...');
console.log('Press Ctrl+C to exit\n');

// Keep alive
setInterval(() => {
    console.log('.');
}, 5000);