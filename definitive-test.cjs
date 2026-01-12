// definitive-test.cjs - Tests both auth and no-auth
const { createNatsEcho } = require('./dist/index.cjs');

console.log('🔧 DEFINITIVE NATS Echo Test\n');

// Try BOTH configurations
const testCases = [
    {
        name: 'WITH authentication',
        config: {
            wsHost: 'localhost',
            wsPort: 4223,
            nats: {
                servers: 'ws://localhost:4223',
                user: 'local',
                pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
                debug: true,
                timeout: 5000,
                verbose: true
            }
        }
    },
    {
        name: 'WITHOUT authentication',
        config: {
            wsHost: 'localhost',
            wsPort: 4223,
            nats: {
                servers: 'ws://localhost:4223',
                debug: true,
                timeout: 5000,
                verbose: true
            }
        }
    }
];

async function runTest(testCase) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('Config:', JSON.stringify(testCase.config, null, 2));

    const Echo = createNatsEcho(testCase.config);
    console.log('📡 Socket ID:', Echo.socketId());

    // Wait and check connection
    return new Promise((resolve) => {
        setTimeout(() => {
            const status = Echo.getConnectionStatus();
            console.log('🔌 Connection Status:', status);

            if (status.isConnected) {
                console.log('✅ CONNECTED!');

                // Quick channel test
                const channel = Echo.channel('test.definitive');
                channel.listen('Test', (data) => {
                    console.log('📢 Test event:', data);
                });

                console.log('✅ Channel subscribed');
                Echo.disconnect();
                resolve({ success: true, config: testCase.config });
            } else {
                console.log('❌ NOT CONNECTED');
                Echo.disconnect();
                resolve({ success: false });
            }
        }, 3000);
    });
}

async function runAllTests() {
    for (const testCase of testCases) {
        const result = await runTest(testCase);
        if (result.success) {
            console.log(`\n🎉 ${testCase.name} WORKS!`);
            console.log('\n📋 Use this configuration:');
            console.log(`
const Echo = createNatsEcho(${JSON.stringify(result.config, null, 2)});
      `);
            return result.config;
        }
        console.log('\n---');
    }

    console.log('\n🚨 All tests failed!');
    console.log('\n💡 Make sure:');
    console.log('   1. NATS server is running');
    console.log('   2. NATS config matches test (auth vs no auth)');
    console.log('   3. Port 4223 is accessible');
    return null;
}

runAllTests().then(workingConfig => {
    if (workingConfig) {
        console.log('\n========================================');
        console.log('✅ FOUND WORKING CONFIGURATION');
        console.log('========================================\n');

        // Create example usage
        console.log('Example usage:');
        console.log(`
import { createNatsEcho } from 'nats-laravel-echo';

// Initialize
window.Echo = createNatsEcho(${JSON.stringify(workingConfig, null, 2)});

// Use like Laravel Echo
window.Echo.channel('orders').listen('OrderShipped', e => {
  console.log('Order shipped:', e);
});
    `);
    }
});