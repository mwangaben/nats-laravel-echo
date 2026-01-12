// Example usage with Laravel Echo compatibility
const { createNatsEcho } = require('./dist/index.js');

// Initialize exactly like Pusher
window.Echo = createNatsEcho({
    broadcaster: 'nats',
    key: process.env.VITE_PUSHER_APP_KEY || 'your-app-key',
    wsHost: process.env.VITE_NATS_HOST || 'localhost',
    wsPort: parseInt(process.env.VITE_NATS_PORT || '4222'),
    forceTLS: false,
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': 'your-csrf-token'
        }
    }
});

// Use exactly like Laravel Echo
window.Echo.channel('orders').listen('OrderShipped', (data) => {
    console.log('Order shipped:', data);
});

window.Echo.private('chat.123').listen('MessageSent', (data) => {
    console.log('New message:', data);
});

window.Echo.join('chat.room')
    .here((users) => console.log('Users here:', users))
    .joining((user) => console.log('User joined:', user))
    .leaving((user) => console.log('User left:', user));

console.log('NATS Echo is ready! Socket ID:', window.Echo.socketId());