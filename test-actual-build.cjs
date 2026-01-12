// test-actual-build.cjs - See what's actually in the built package
const builtPackage = require('./dist/index.cjs');

console.log('📦 What\'s actually in the built package?\n');
console.log('Exports:', Object.keys(builtPackage));

// Check if createNatsEcho exists
if (builtPackage.createNatsEcho) {
    console.log('\n✅ createNatsEcho exists');

    // Try to create an instance
    const Echo = builtPackage.createNatsEcho({
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

    console.log('\n🎯 Echo instance created');
    console.log('Type:', typeof Echo);
    console.log('Methods:', Object.keys(Echo).filter(k => typeof Echo[k] === 'function'));

    // Check specific methods
    console.log('\n🔍 Checking specific methods:');
    console.log('socketId exists?', typeof Echo.socketId === 'function');
    console.log('getConnectionStatus exists?', typeof Echo.getConnectionStatus === 'function');
    console.log('channel exists?', typeof Echo.channel === 'function');

} else if (builtPackage.default) {
    console.log('\n⚠️  Only default export exists');
    // Try with default
} else {
    console.log('\n❌ No createNatsEcho found in exports!');
}