// test-with-auth.cjs
const { connect } = require('nats.ws');

async function testWithAuth() {
    console.log('🔐 Testing NATS connection WITH authentication\n');

    const config = {
        servers: 'ws://localhost:4223',
        user: 'local',
        pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
        timeout: 5000,
        debug: true,
        verbose: true
    };

    console.log('Config:', JSON.stringify(config, null, 2));

    try {
        console.log('\n⌛ Connecting with auth...');
        const nc = await connect(config);

        console.log('✅ CONNECTED with authentication!');
        console.log('Server:', nc.getServer());

        // Test subscription
        console.log('\n📡 Testing subscription...');
        const sub = nc.subscribe('test.auth');

        // Test publish
        console.log('📨 Testing publish...');
        await nc.publish('test.auth', 'Test with auth');

        // Try to receive
        setTimeout(async () => {
            for await (const msg of sub) {
                console.log('📢 Received:', msg.data.toString());
                break;
            }
        }, 100);

        // Test Laravel-style channel
        console.log('\n🎭 Testing Laravel-style channel...');
        const laravelSub = nc.subscribe('orders');
        await nc.publish('orders', JSON.stringify({
            event: 'OrderShipped',
            data: { order_id: 123, status: 'shipped' }
        }));

        await nc.close();
        console.log('\n🔌 Connection closed');

        console.log('\n🎉 AUTHENTICATION WORKS!');
        return config;

    } catch (error) {
        console.error('\n❌ Authentication failed:', error.message);

        if (error.message.includes('Authentication')) {
            console.log('\n💡 Check:');
            console.log('   1. User "local" exists in NATS config');
            console.log('   2. Password is correct');
            console.log('   3. User has permissions to subscribe/publish');
        }

        return null;
    }
}

testWithAuth().then(config => {
    if (config) {
        console.log('\n📋 Use this for NATS Echo:');
        console.log(`
const Echo = createNatsEcho({
  wsHost: 'localhost',
  wsPort: 4223,
  nats: {
    servers: '${config.servers}',
    user: '${config.user}',
    pass: '${config.pass}',
    debug: true,
    timeout: ${config.timeout}
  }
});
    `);
    }
});