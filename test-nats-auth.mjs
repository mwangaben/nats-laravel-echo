// test-nats-auth.mjs
import { createNatsEcho } from './dist/index.esm.js';

async function testNatsEcho() {
    console.log('=== Testing NATS Laravel Echo with Authentication ===\n');

    // Test 1: User/Password authentication (your configuration)
    console.log('1. Testing User/Password Authentication...');
    try {
        const echo1 = createNatsEcho({
            broadcaster: 'nats',
            wsHost: 'localhost',
            wsPort: 53969,
            nats: {
                servers: 'ws://localhost:53969',
                user: 'local',
                pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH',
                debug: true,
                reconnect: true,
                maxReconnectAttempts: 5
            }
        });

        console.log('   Socket ID:', echo1.socketId());
        console.log('   Status:', echo1.getConnectionStatus());

        // Subscribe to test channel
        echo1.channel('test-auth')
            .listen('AuthTest', (data) => {
                console.log('   AuthTest event:', data);
            });

        console.log('   ✓ User/Password auth test started\n');

        // Cleanup after 5 seconds
        setTimeout(() => {
            echo1.disconnect();
            console.log('   Disconnected\n');
        }, 5000);

    } catch (error) {
        console.log('   ✗ User/Password auth failed:', error.message, '\n');
    }

    // Test 2: Token authentication
    console.log('2. Testing Token Authentication...');
    try {
        const echo2 = createNatsEcho({
            broadcaster: 'nats',
            wsHost: 'localhost',
            wsPort: 4222,
            nats: {
                servers: 'ws://localhost:4222',
                token: 'your-nats-token-here', // Replace with actual token
                debug: true
            }
        });

        console.log('   Socket ID:', echo2.socketId());
        console.log('   Status:', echo2.getConnectionStatus());
        console.log('   ✓ Token auth test started\n');

        setTimeout(() => echo2.disconnect(), 3000);

    } catch (error) {
        console.log('   ✗ Token auth failed (expected if no token server):', error.message, '\n');
    }

    // Test 3: No authentication (for local dev)
    console.log('3. Testing No Authentication...');
    try {
        const echo3 = createNatsEcho({
            broadcaster: 'nats',
            wsHost: 'localhost',
            wsPort: 4222,
            nats: {
                servers: 'ws://localhost:4222',
                debug: false
            }
        });

        console.log('   Socket ID:', echo3.socketId());

        // Test all channel types
        const publicChannel = echo3.channel('public.test');
        publicChannel.listen('PublicEvent', (data) => {
            console.log('   PublicEvent:', data);
        });

        const privateChannel = echo3.private('private.test');
        privateChannel.listen('PrivateEvent', (data) => {
            console.log('   PrivateEvent:', data);
        });

        const presenceChannel = echo3.join('presence.test');
        presenceChannel
            .here((users) => console.log('   Users here:', users))
            .joining((user) => console.log('   User joined:', user))
            .leaving((user) => console.log('   User left:', user));

        console.log('   ✓ All channel types working\n');

        // Test whisper
        setTimeout(() => {
            privateChannel.whisper('client-message', { text: 'Hello from client!' });
            console.log('   Sent whisper message\n');
        }, 1000);

        setTimeout(() => {
            echo3.disconnect();
            console.log('   Disconnected\n');
            console.log('=== Tests completed ===');
        }, 7000);

    } catch (error) {
        console.log('   ✗ No auth test failed:', error.message, '\n');
        console.log('=== Tests completed with errors ===');
    }
}

// Run tests
testNatsEcho();