// debug-package-connection.cjs - Debug the package's connection
const { connect } = require('nats.ws');

console.log('🐛 DEBUGGING Package Connection Logic\n');

// First, test direct connection to confirm server is working
async function testDirectConnection() {
    console.log('1️⃣ Testing direct nats.ws connection...');

    try {
        const nc = await connect({
            servers: 'ws://localhost:4223',
            user: 'local',
            pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
            debug: true,
            timeout: 5000,
            verbose: true
        });

        console.log('✅ Direct connection WORKS');
        console.log('   Server:', nc.getServer());
        await nc.close();
        return true;

    } catch (error) {
        console.log('❌ Direct connection failed:', error.message);
        return false;
    }
}

// Now test what our package SHOULD be doing
async function testPackageLogic() {
    console.log('\n2️⃣ Testing package connection logic...');

    // This mimics EXACTLY what our SimpleNatsEcho class does
    const options = {
        wsHost: 'localhost',
        wsPort: 4223,
        nats: {
            servers: 'ws://localhost:4223',
            user: 'local',
            pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
            debug: true,
            timeout: 5000,
            verbose: true,
            reconnect: true,
            maxReconnectAttempts: 10
        }
    };

    console.log('Package options:', JSON.stringify(options, null, 2));

    // Build connection exactly like our package does
    let servers;
    if (options.nats?.servers) {
        if (Array.isArray(options.nats.servers)) {
            servers = options.nats.servers;
        } else {
            servers = [options.nats.servers];
        }
    } else {
        const protocol = false ? 'wss' : 'ws';
        const host = options.wsHost || 'localhost';
        const port = options.wsPort || 4222;
        servers = [`${protocol}://${host}:${port}`];
    }

    console.log('\n🔗 Final servers:', servers);

    const connectOptions = {
        servers,
        reconnect: options.nats?.reconnect ?? true,
        maxReconnectAttempts: options.nats?.maxReconnectAttempts ?? 10,
        timeout: options.nats?.timeout ?? 10000,
        debug: options.nats?.debug ?? false,
        verbose: options.nats?.verbose ?? true,
        waitOnFirstConnect: options.nats?.waitOnFirstConnect ?? true,
        name: options.nats?.name || `laravel-echo-test`
    };

    // Add authentication
    if (options.nats?.user && options.nats?.pass) {
        connectOptions.user = options.nats.user;
        connectOptions.pass = options.nats.pass;
        console.log('🔐 Added authentication');
    }

    console.log('\n🎯 Connection options:', JSON.stringify(connectOptions, null, 2));

    try {
        console.log('\n⌛ Attempting connection...');
        const nc = await connect(connectOptions);

        console.log('✅ Package logic connection WORKS!');
        console.log('   Server:', nc.getServer());

        await nc.close();
        return true;

    } catch (error) {
        console.log('❌ Package logic connection failed:', error.message);
        console.log('   Error details:', {
            name: error.name,
            code: error.code
        });
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));

    const directOk = await testDirectConnection();
    if (!directOk) {
        console.log('\n🚨 Server issue - fix NATS server first');
        return;
    }

    const packageLogicOk = await testPackageLogic();

    console.log('\n' + '='.repeat(60));

    if (packageLogicOk) {
        console.log('✅ Package connection logic is correct');
        console.log('\n💡 The issue is in our package build or initialization');
    } else {
        console.log('🚨 Package connection logic has issues');
        console.log('\n🔧 Need to fix src/simple.ts connection method');
    }
}

main();