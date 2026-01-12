// examples/laravel-usage.js
import Echo from '../dist/index.cjs';

// ============================================================================
// BASIC USAGE
// ============================================================================

console.log('🚀 Laravel Echo NATS - Usage Examples\n');

// Example 1: Basic setup
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

// Wait for connection
setTimeout(() => {
    console.log('📡 Connection Status:', echo.getConnectionStatus());
    console.log('🎯 Socket ID:', echo.socketId());

    if (echo.getConnectionStatus().isConnected) {
        runExamples(echo);
    }
}, 2000);

// ============================================================================
// EXAMPLE FUNCTIONS
// ============================================================================

function runExamples(echo) {
    console.log('\n📚 Running Examples...\n');

    // Example 1: Public Channels
    examplePublicChannels(echo);

    // Example 2: Private Channels (simulated auth)
    examplePrivateChannels(echo);

    // Example 3: Presence Channels
    examplePresenceChannels(echo);

    // Example 4: Multiple Event Listeners
    exampleMultipleEvents(echo);

    // Example 5: Error Handling
    exampleErrorHandling(echo);

    // Example 6: Cleanup and Disconnect
    exampleCleanup(echo);
}

// ============================================================================
// EXAMPLE 1: PUBLIC CHANNELS
// ============================================================================

function examplePublicChannels(echo) {
    console.log('📢 Example 1: Public Channels');
    console.log('   Listening for Order events...\n');

    // Single event on a channel
    echo.channel('orders')
        .listen('OrderCreated', (data) => {
            console.log('   🛒 New Order Created:', data);
            console.log('   Order Total:', data.total);
            console.log('   Customer:', data.customer_name);
        });

    // Multiple events on same channel
    echo.channel('orders')
        .listen('OrderUpdated', (data) => {
            console.log('   📝 Order Updated:', data.order_id);
            console.log('   Status:', data.status);
        })
        .listen('OrderDeleted', (data) => {
            console.log('   🗑️  Order Deleted:', data.order_id);
            console.log('   Reason:', data.reason || 'No reason provided');
        });
}

// ============================================================================
// EXAMPLE 2: PRIVATE CHANNELS
// ============================================================================

function examplePrivateChannels(echo) {
    console.log('🔒 Example 2: Private Channels');
    console.log('   Listening for User notifications...\n');

    const userId = 123;

    // Private channel for user-specific events
    echo.private(`user.${userId}`)
        .listen('UserProfileUpdated', (data) => {
            console.log('   👤 User Profile Updated');
            console.log('   Changes:', data.changes);
            console.log('   Updated at:', new Date(data.updated_at).toLocaleString());
        });

    // Notification channel
    echo.private(`notifications.${userId}`)
        .listen('NotificationReceived', (data) => {
            console.log('   🔔 New Notification:', data.title);
            console.log('   Message:', data.message);
            console.log('   Type:', data.type);
        });

    // Simulate receiving a private event (for demo purposes)
    setTimeout(() => {
        console.log('\n   💡 Simulating private event for user.123...');
        console.log('   (In real app, Laravel would broadcast to this channel)');
    }, 1000);
}

// ============================================================================
// EXAMPLE 3: PRESENCE CHANNELS
// ============================================================================

function examplePresenceChannels(echo) {
    console.log('\n👥 Example 3: Presence Channels');
    console.log('   Monitoring chat room presence...\n');

    const roomName = 'general-chat';
    const presenceChannel = echo.join(roomName);

    // When page loads, get list of users already in channel
    presenceChannel.here((users) => {
        console.log('   👋 Users currently in chat:', users.length);
        users.forEach((user, index) => {
            console.log(`     ${index + 1}. ${user.name} (ID: ${user.id})`);
        });
    });

    // When someone joins
    presenceChannel.joining((user) => {
        console.log(`   🎉 ${user.name} joined the chat!`);
        console.log('   User details:', user);
    });

    // When someone leaves
    presenceChannel.leaving((user) => {
        console.log(`   👋 ${user.name} left the chat`);
        console.log('   Last seen:', new Date().toLocaleTimeString());
    });

    // Simulate presence events (for demo)
    setTimeout(() => {
        console.log('\n   💡 Simulating presence events...');
        console.log('   (In real app, users join/leave via Laravel)');
    }, 1500);
}

// ============================================================================
// EXAMPLE 4: MULTIPLE EVENT LISTENERS
// ============================================================================

function exampleMultipleEvents(echo) {
    console.log('\n🎭 Example 4: Complex Event Handling');
    console.log('   E-commerce store events...\n');

    // E-commerce store with multiple event types
    const storeChannel = echo.channel('store');

    // Inventory events
    storeChannel.listen('InventoryLow', (data) => {
        console.log('   📦 Inventory Alert:', data.product_name);
        console.log('   Current stock:', data.current_stock);
        console.log('   Reorder level:', data.reorder_level);
    });

    // Sales events
    storeChannel.listen('SaleMade', (data) => {
        console.log('   💰 Sale Completed!');
        console.log('   Amount:', data.amount);
        console.log('   Items:', data.items_count);
        console.log('   Customer:', data.customer_email);
    });

    // Customer service events
    storeChannel.listen('SupportTicketCreated', (data) => {
        console.log('   🎫 New Support Ticket');
        console.log('   Ticket #:', data.ticket_number);
        console.log('   Priority:', data.priority);
        console.log('   Customer:', data.customer_name);
    });
}

// ============================================================================
// EXAMPLE 5: ERROR HANDLING
// ============================================================================

function exampleErrorHandling(echo) {
    console.log('\n⚠️  Example 5: Error Handling Patterns');
    console.log('   Safe event handling...\n');

    // Safe event listener with error handling
    echo.channel('system')
        .listen('SystemAlert', (data) => {
            try {
                // Parse complex data
                const alert = JSON.parse(data.alert_data);
                console.log('   🚨 System Alert:', alert.message);
                console.log('   Severity:', alert.severity);

                // Process the alert
                processAlert(alert);
            } catch (error) {
                console.error('   ❌ Error processing system alert:', error.message);
                // Log to error tracking service
                logError(error, data);
            }
        });

    // Graceful degradation
    echo.channel('updates')
        .listen('AppUpdate', (data) => {
            if (!data.version) {
                console.log('   ⚠️  Update received with missing version info');
                return;
            }

            console.log('   🔄 App Update Available:', data.version);
            console.log('   Changelog:', data.changelog || 'No changelog provided');
        });
}

// Helper functions for error handling example
function processAlert(alert) {
    // Simulate alert processing
    console.log('   Processing alert...');
}

function logError(error, data) {
    // Simulate error logging
    console.log('   Logging error to monitoring service...');
}

// ============================================================================
// EXAMPLE 6: CLEANUP AND DISCONNECT
// ============================================================================

function exampleCleanup(echo) {
    console.log('\n🧹 Example 6: Cleanup Patterns');
    console.log('   Proper resource management...\n');

    // Store subscription references for cleanup
    const subscriptions = [];

    // Create subscriptions and store references
    const orderSubscription = echo.channel('temp-orders')
        .listen('TempOrderCreated', (data) => {
            console.log('   📝 Temporary Order:', data);
        });

    const notificationSubscription = echo.channel('temp-notifications')
        .listen('TempNotification', (data) => {
            console.log('   💬 Temp Notification:', data);
        });

    // Store for later cleanup
    subscriptions.push(orderSubscription, notificationSubscription);

    // Cleanup after 5 seconds
    setTimeout(() => {
        console.log('\n   🧼 Cleaning up temporary subscriptions...');

        // Unsubscribe from all temporary channels
        subscriptions.forEach((subscription, index) => {
            if (subscription.unsubscribe) {
                subscription.unsubscribe();
                console.log(`   Unsubscribed from subscription ${index + 1}`);
            }
        });

        // Show final connection status
        console.log('\n   📊 Final Connection Status:');
        console.log('   Subscriptions:', echo.getConnectionStatus().subscriptionCount);

        // Optionally disconnect after cleanup
        // echo.disconnect();
        // console.log('   Disconnected from NATS');

    }, 5000);
}

// ============================================================================
// LARAVEL-SPECIFIC USAGE PATTERNS
// ============================================================================

function laravelSpecificExamples() {
    console.log('\n🛠️  Laravel-Specific Usage Patterns\n');

    // Pattern 1: Channel naming conventions
    console.log('📋 Channel Naming Conventions:');
    console.log('   Public: orders, notifications, system');
    console.log('   Private: App.Models.User.{id}, chat.{room_id}');
    console.log('   Presence: presence-chat.{room_id}, presence-game.{id}');

    // Pattern 2: Event structure matching Laravel
    console.log('\n🎯 Laravel Event Structure:');
    console.log('   Laravel events broadcast as:');
    console.log('   {');
    console.log('     event: "App\\\\Events\\\\OrderShipped",');
    console.log('     data: { order: {...} }');
    console.log('   }');

    // Pattern 3: Authentication integration
    console.log('\n🔐 Authentication Integration:');
    console.log('   Use Laravel\'s broadcasting/auth endpoint');
    console.log('   Include CSRF token in requests');
    console.log('   Handle 403 responses gracefully');
}

// ============================================================================
// REAL-WORLD SCENARIO: E-COMMERCE APP
// ============================================================================

function ecommerceScenario() {
    console.log('\n🛍️  Real-World Scenario: E-commerce Application\n');

    const scenarioEcho = new Echo({
        broadcaster: 'nats',
        host: 'ws://localhost:4223',
        auth: {
            user: 'local',
            pass: '4elDZZTb7ofiN83BKjXOvhZvOuhUouhH'
        }
    });

    // Admin dashboard monitoring
    setTimeout(() => {
        if (scenarioEcho.getConnectionStatus().isConnected) {
            console.log('🏪 Admin Dashboard Events:');

            // Real-time sales monitoring
            scenarioEcho.channel('admin-dashboard')
                .listen('RealTimeSale', (sale) => {
                    console.log(`   💸 New Sale: $${sale.amount}`);
                    console.log(`   Product: ${sale.product_name}`);
                    updateDashboard(sale);
                });

            // Inventory alerts
            scenarioEcho.channel('admin-dashboard')
                .listen('InventoryAlert', (alert) => {
                    console.log(`   📦 ${alert.product} is running low!`);
                    console.log(`   Stock: ${alert.stock}, Threshold: ${alert.threshold}`);
                });

            // Customer support
            scenarioEcho.channel('admin-support')
                .listen('NewSupportTicket', (ticket) => {
                    console.log(`   🎫 New Ticket #${ticket.id}`);
                    console.log(`   Customer: ${ticket.customer_email}`);
                    console.log(`   Priority: ${ticket.priority}`);
                });
        }
    }, 3000);

    // Helper function
    function updateDashboard(sale) {
        // Simulate dashboard update
        console.log('   📊 Updating admin dashboard...');
    }
}

// ============================================================================
// EVENT SIMULATION (for demonstration)
// ============================================================================

// This function simulates receiving events for demo purposes
function simulateEvents() {
    console.log('\n🎪 Simulating Incoming Events (for demo)...\n');

    // These would normally come from Laravel via NATS
    const simulatedEvents = [
        {
            channel: 'orders',
            event: 'OrderCreated',
            data: {
                order_id: 1001,
                customer_name: 'John Doe',
                total: 149.99,
                items: 3,
                timestamp: new Date().toISOString()
            }
        },
        {
            channel: 'store',
            event: 'SaleMade',
            data: {
                amount: 299.99,
                items_count: 5,
                customer_email: 'jane@example.com',
                timestamp: new Date().toISOString()
            }
        },
        {
            channel: 'user.123',
            event: 'UserProfileUpdated',
            data: {
                user_id: 123,
                changes: ['email', 'avatar'],
                updated_at: new Date().toISOString()
            }
        }
    ];

    // Log what would happen
    simulatedEvents.forEach((simEvent, index) => {
        setTimeout(() => {
            console.log(`   📨 [SIMULATED] Event on ${simEvent.channel}: ${simEvent.event}`);
            console.log(`      Data:`, JSON.stringify(simEvent.data, null, 2));
        }, (index + 1) * 2000);
    });
}

// ============================================================================
// INITIALIZE ALL EXAMPLES
// ============================================================================

// Run Laravel-specific patterns
setTimeout(laravelSpecificExamples, 3000);

// Run e-commerce scenario
setTimeout(ecommerceScenario, 4000);

// Simulate events for demonstration
setTimeout(simulateEvents, 5000);

// Show how to use the package
console.log('\n💡 Usage Tips:');
console.log('   1. Always check connection status before subscribing');
console.log('   2. Use proper error handling in event callbacks');
console.log('   3. Clean up subscriptions when not needed');
console.log('   4. Implement reconnection logic for production');
console.log('   5. Use environment variables for configuration\n');

// Graceful shutdown handler
process.on('SIGINT', () => {
    console.log('\n👋 Gracefully shutting down...');
    if (echo && echo.disconnect) {
        echo.disconnect();
    }
    process.exit(0);
});

console.log('\n✅ Examples loaded. Waiting for events...\n');
console.log('Press Ctrl+C to exit\n');