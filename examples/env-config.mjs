// Using your NATS environment variables
const { createNatsEcho } = require('../dist/index.js');

// Load environment variables (in real app, use dotenv or similar)
const NATS_HOST = process.env.NATS_HOST || 'localhost';
const NATS_PORT = process.env.NATS_PORT || 4222;
const NATS_USER = process.env.NATS_USER || 'local';
const NATS_PASS = process.env.NATS_PASS || '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH';
const NATS_DEBUG = process.env.NATS_DEBUG === 'true';

console.log('Connecting to NATS with:');
console.log('  Host:', NATS_HOST);
console.log('  Port:', NATS_PORT);
console.log('  User:', NATS_USER);
console.log('  Debug:', NATS_DEBUG);

// Initialize NATS Echo
window.Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: NATS_HOST,
    wsPort: parseInt(NATS_PORT),
    forceTLS: false,

    // NATS-specific authentication
    nats: {
        servers: `ws://${NATS_HOST}:${NATS_PORT}`,
        user: NATS_USER,
        pass: NATS_PASS,
        debug: NATS_DEBUG,
        reconnect: true,
        maxReconnectAttempts: 10,
        timeout: 10000
    },

    // Laravel Echo compatibility
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': 'your-csrf-token',
            'Authorization': 'Bearer your-token'
        }
    }
});

// Use it
window.Echo.channel('public-channel')
    .listen('TestEvent', (data) => {
        console.log('TestEvent received:', data);
    });

console.log('NATS Echo initialized. Socket ID:', window.Echo.socketId());