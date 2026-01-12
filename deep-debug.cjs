// deep-debug.cjs - Deep dive into the connection issue
const { connect } = require('nats.ws');

console.log('🔍 DEEP DEBUG: NATS Connection Issue\n');

async function testAllConfigurations() {
    console.log('1️⃣ Testing various NATS connection methods:\n');

    const testConfigs = [
        // Test 1: Basic WebSocket without auth
        {
            name: 'Basic WebSocket (no auth)',
            config: {
                servers: 'ws://localhost:4223',
                timeout: 3000,
                debug: true,
                verbose: true,
                reconnect: false
            }
        },

        // Test 2: WebSocket with increased timeout
        {
            name: 'WebSocket with longer timeout',
            config: {
                servers: 'ws://localhost:4223',
                timeout: 10000,
                debug: true,
                verbose: true,
                reconnect: false
            }
        },

        // Test 3: Different WebSocket URL format
        {
            name: 'Alternative WebSocket URL',
            config: {
                servers: ['ws://localhost:4223'],
                timeout: 5000,
                debug: true,
                verbose: true,
                reconnect: false
            }
        },

        // Test 4: Try regular NATS port
        {
            name: 'Regular NATS port 53969',
            config: {
                servers: 'ws://localhost:53969',
                timeout: 5000,
                debug: true,
                verbose: true,
                reconnect: false
            }
        },

        // Test 5: With auth (in case it's actually required)
        {
            name: 'WebSocket with auth',
            config: {
                servers: 'ws://localhost:4223',
                user: 'local',
                pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
                timeout: 5000,
                debug: true,
                verbose: true,
                reconnect: false
            }
        }
    ];

    for (const test of testConfigs) {
        console.log(`🧪 ${test.name}`);
        console.log('   Config:', JSON.stringify(test.config, null, 2));

        try {
            console.log('   ⌛ Attempting connection...');
            const startTime = Date.now();
            const nc = await connect(test.config);
            const endTime = Date.now();

            console.log(`   ✅ CONNECTED in ${endTime - startTime}ms`);
            console.log('   Server:', nc.getServer());
            console.log('   Is closed?', nc.isClosed());

            // Test basic operations
            console.log('   📡 Testing subscription...');
            const sub = nc.subscribe('test.debug');

            console.log('   📨 Testing publish...');
            await nc.publish('test.debug', 'Test message');

            // Try to receive
            setTimeout(async () => {
                for await (const msg of sub) {
                    console.log('   📢 Received:', msg.data.toString());
                    break;
                }
            }, 100);

            // Wait a bit then close
            setTimeout(async () => {
                await nc.close();
                console.log('   🔌 Connection closed');
            }, 500);

            return { success: true, config: test.config };

        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);

            // Log the full error for debugging
            console.log('   Error details:', {
                name: error.name,
                code: error.code,
                stack: error.stack ? error.stack.split('\n')[0] : 'No stack'
            });
        }

        console.log('   ---');
    }

    return { success: false };
}

async function checkNetwork() {
    console.log('\n2️⃣ Checking network connectivity:\n');

    const net = require('net');

    // Test if we can even connect to the port
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            console.log('   ✅ TCP connection to localhost:4223 successful');
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            console.log('   ❌ TCP connection timeout');
            socket.destroy();
            resolve(false);
        });

        socket.on('error', (err) => {
            console.log(`   ❌ TCP connection error: ${err.code}`);
            socket.destroy();
            resolve(false);
        });

        socket.connect(4223, 'localhost');
    });
}

async function checkNatsServer() {
    console.log('\n3️⃣ Checking NATS server status:\n');

    const http = require('http');

    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 8222,
            path: '/varz',
            timeout: 2000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    console.log('   ✅ NATS server is running');
                    console.log('   Version:', info.version);
                    console.log('   Protocol:', info.proto);
                    console.log('   Connections:', info.connections);
                    resolve(true);
                } catch {
                    console.log('   ⚠️  NATS monitoring responded but with invalid data');
                    resolve(true);
                }
            });
        });

        req.on('timeout', () => {
            console.log('   ❌ NATS monitoring timeout (port 8222)');
            req.destroy();
            resolve(false);
        });

        req.on('error', (err) => {
            console.log(`   ❌ NATS monitoring error: ${err.code}`);
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    console.log('='.repeat(60));
    console.log('STARTING COMPREHENSIVE DEBUG');
    console.log('='.repeat(60));

    // Check basic network connectivity
    const networkOk = await checkNetwork();
    if (!networkOk) {
        console.log('\n🚨 Network connectivity issue detected!');
        console.log('   Make sure NATS server is running:');
        console.log('   nats-server -c nats-websocket.conf');
        return;
    }

    // Check NATS server
    const natsRunning = await checkNatsServer();
    if (!natsRunning) {
        console.log('\n⚠️  NATS server might not have monitoring enabled');
        console.log('   But WebSocket might still work...');
    }

    // Test all connection configurations
    const result = await testAllConfigurations();

    console.log('\n' + '='.repeat(60));

    if (result.success) {
        console.log('🎉 WORKING CONFIGURATION FOUND!');
        console.log('\nUse this configuration:');
        console.log(JSON.stringify(result.config, null, 2));

        console.log('\n💡 Update your NATS Echo config to:');
        console.log(`
const Echo = createNatsEcho({
  wsHost: 'localhost',
  wsPort: 4223,
  nats: {
    servers: '${result.config.servers}',
    ${result.config.user ? `user: '${result.config.user}',` : ''}
    ${result.config.pass ? `pass: '${result.config.pass}',` : ''}
    debug: true,
    timeout: ${result.config.timeout}
  }
});
    `);
    } else {
        console.log('🚨 NO WORKING CONFIGURATION FOUND');

        console.log('\n🔧 Possible issues:');
        console.log('   1. NATS server WebSocket might not be properly configured');
        console.log('   2. Firewall blocking WebSocket connections');
        console.log('   3. NATS server needs specific protocol headers');

        console.log('\n🛠️  Try these fixes:');
        console.log('   1. Restart NATS: nats-server -c nats-websocket.conf');
        console.log('   2. Check NATS logs for WebSocket errors');
        console.log('   3. Try a simpler NATS config:');
        console.log(`
port: 4222
http_port: 8222
websocket {
  port: 4223
  no_tls: true
  no_auth_user: "anonymous"
}
debug: true
    `);
    }

    console.log('='.repeat(60));
}

main();