// final-example.cjs - Complete working example
const { createNatsEcho } = require('./dist/index.cjs');

console.log('🚀 Laravel Echo NATS Driver - Complete Example\n');

// Initialize exactly like your original Pusher example, but for NATS
window.Echo = createNatsEcho({
    broadcaster: 'nats',
    key: 'your-app-key', // Kept for API compatibility
    cluster: 'your-cluster',
    forceTLS: false,
    wsHost: 'localhost',
    wsPort: 4223,        // NATS WebSocket port
    wssPort: 4223,
    enabledTransports: ['ws', 'wss'],

    // NATS configuration (no auth needed for your server)
    nats: {
        servers: 'ws://localhost:4223',
        debug: true,        // Enable debugging
        reconnect: true,    // Auto-reconnect
        maxReconnectAttempts: 10
    }
});

console.log('✅ NATS Echo initialized');
console.log('📡 Socket ID:', window.Echo.socketId());
console.log('🔌 Status:', window.Echo.getConnectionStatus());

// Use exactly like your original code
window.Echo.channel('orders').listen('OrderShipped', e => {
    console.log('\n📦 OrderShipped event:', e);

    // Update UI or process order
    if (e.order_id) {
        console.log(`   Processing order #${e.order_id}`);
    }
});

// Private channels also work (prefix added automatically)
window.Echo.private('chat.123').listen('MessageSent', e => {
    console.log('\n💬 New message:', e);
});

// Presence channels
window.Echo.join('chat.room')
    .here(users => {
        console.log(`\n👥 ${users.length} user(s) in chat`);
    })
    .joining(user => {
        console.log(`\n👋 ${user.name} joined the chat`);
    })
    .leaving(user => {
        console.log(`\n👋 ${user.name} left the chat`);
    });

console.log('\n🎯 Listening on:');
console.log('   - orders (public)');
console.log('   - private-chat.123 (private)');
console.log('   - presence-chat.room (presence)');
console.log('\n⏳ Waiting for events...\n');

// Send test events (simulate Laravel broadcasting)
setTimeout(() => {
    console.log('\n💡 To test, send events from your Laravel app or use:');
    console.log('   nats pub orders \'{"event":"OrderShipped","data":{"order_id":123,"status":"shipped"}}\'');
    console.log('   nats pub private-chat.123 \'{"event":"MessageSent","data":{"text":"Hello!"}}\'');
}, 2000);

// Keep running
setInterval(() => {
    const status = window.Echo.getConnectionStatus();
    if (status.isConnected) {
        process.stdout.write('.');
    } else {
        console.log('\n⚠️  Connection lost, attempting to reconnect...');
    }
}, 10000);