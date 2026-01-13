import Echo from "nats-laravel-echo";

const echo = new Echo({
    broadcaster: 'nats',
    host: 'ws://localhost:4223',
    auth: {
        user: 'local',
        pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH'
    },
    debug: true,
    timeout: 5000,
    maxReconnectAttempts: 5
});

// Method 1: Using ready() callback (recommended)
echo.ready(() => {
    console.log('✅ Echo is ready!');

    echo.channel('orders')
        .listen('OrderShipped', (data) => {
            console.log('✅ OrderShipped event received!');
            console.log('Order ID:', data.order?.id);
        });
});

// Method 2: Using connection change listener
const unsubscribe = echo.onConnectionChange((connected, error) => {
    if (connected) {
        console.log('✅ Connected to NATS');
    } else {
        console.log('❌ Disconnected from NATS', error || '');
    }
});

// Method 3: Using promise (for async/await)
async function setupEcho() {
    try {
        await echo.waitForConnection();
        console.log('✅ Connected, setting up listeners...');

        echo.channel('notifications')
            .listen('NotificationCreated', (data) => {
                console.log('🔔 New notification:', data);
            });

    } catch (error) {
        console.error('Failed to connect:', error);
    }
}

setupEcho();

// Clean up when done
// unsubscribe(); // Remove connection listener
// echo.disconnect(); // Disconnect completely