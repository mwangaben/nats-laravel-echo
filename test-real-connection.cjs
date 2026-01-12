// test-real-connection.cjs - Test the actual connection
const { createNatsEcho } = require('./dist/index.cjs');

console.log('🔌 Testing REAL connection with built package\n');

const Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: 'localhost',
    wsPort: 4223,

    // Exact config that works in debug test
    nats: {
        servers: 'ws://localhost:4223',
        user: 'local',
        pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
        debug: true,
        timeout: 5000,
        verbose: true,
        reconnect: false, // Disable reconnect for debugging
        waitOnFirstConnect: false
    }
});

console.log('📡 Created Echo instance');
console.log('Socket ID:', Echo.socketId());

// Check immediately
console.log('\n🔍 Immediate check:');
console.log('Status:', Echo.getConnectionStatus());

// Check after 1 second
setTimeout(() => {
    console.log('\n🔍 After 1 second:');
    const status1 = Echo.getConnectionStatus();
    console.log('Status:', status1);

    // Try to force connection check
    if (!status1.isConnected) {
        console.log('\n⚠️  Not connected. Trying manual check...');

        // The issue might be that connection happens asynchronously
        // but getConnectionStatus() returns a cached value
        console.log('Checking instance internals...');

        // Try to access private instance (if available)
        if (Echo.__instance) {
            console.log('Found __instance:', Object.keys(Echo.__instance));
        }
    }
}, 1000);

// Check after 3 seconds (should be connected)
setTimeout(() => {
    console.log('\n🔍 After 3 seconds:');
    const status3 = Echo.getConnectionStatus();
    console.log('Status:', status3);

    if (status3.isConnected) {
        console.log('\n🎉 CONNECTED! Testing channels...');

        // Test orders channel
        const ordersChannel = Echo.channel('orders');
        ordersChannel.listen('OrderShipped', (data) => {
            console.log('\n📦 OrderShipped:', data);
        });

        console.log('✅ Listening on "orders" channel');
        console.log('\n💡 Send test: nats pub orders \'{"event":"OrderShipped","data":{"order_id":123}}\'');

    } else {
        console.log('\n❌ STILL NOT CONNECTED after 3 seconds');
        console.log('\n💡 Possible issues:');
        console.log('   1. Connection is async but not awaited');
        console.log('   2. isConnected flag not being set');
        console.log('   3. Error in connection but not logged');
    }
}, 3000);

// Check after 5 seconds
setTimeout(() => {
    console.log('\n🔍 After 5 seconds:');
    console.log('Final status:', Echo.getConnectionStatus());
    Echo.disconnect();
}, 5000);