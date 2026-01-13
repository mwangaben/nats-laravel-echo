# NATS Laravel Echo

A NATS driver for Laravel Echo that provides a drop-in replacement for Pusher/Soketi. This package enables real-time communication between Laravel backend applications and JavaScript frontends using NATS as the message broker.

## Features

- 🚀 **Real-time event broadcasting** using NATS as the message broker
- 🔄 **Automatic reconnection** with exponential backoff
- 🔌 **WebSocket support** for browser compatibility
- 🔒 **Private and presence channels** with Laravel authentication
- 📡 **Event name normalization** for Laravel's namespaced events
- 🛡️ **Graceful error handling** and connection state management
- 📦 **Multiple build formats** (ESM, CommonJS, UMD)

## Installation

```bash
npm install nats-laravel-echo
```

## Prerequisites

#### 1. NATS Server
   Ensure you have NATS server running with WebSocket support:

```bash
# Install NATS server
# For macOS:
brew install nats-server

# For Linux/Windows, download from:
# https://github.com/nats-io/nats-server/releases

# Run with WebSocket support
nats-server -ws
```


#### 2. Laravel Backend Configuration
Update your Laravel .env file:

```dotenv
BROADCAST_DRIVER=nats
NATS_HOST=localhost:4223
NATS_AUTH_USER=local
NATS_AUTH_PASS=your_password_here

```


## Quick Start
```javascript
import Echo from "nats-laravel-echo";

// Initialize Echo
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

// Wait for connection and subscribe
echo.ready(() => {
    console.log('✅ Echo is ready!');
    
    // Listen for events
    echo.channel('orders')
        .listen('OrderShipped', (data) => {
            console.log('✅ Order Shipped:', data.order.id);
        });
});

```


### Configuration Options
| Option               | Type    | Default               | Description               |
|----------------------|---------|-----------------------|---------------------------| 
| broadcaster          | string  | 'nats'                | Must be 'nats'            |
| host                 | string  | 'ws://localhost:4223' | NATS WebSocket URL        | 
| auth.user            | string  | -                     | NATS username             |
| auth.pass            | string  | -                     | NATS password             |
| debug                | boolean | false                 | Enable debug logging      |
| timeout              | number  | 5000                  | Connection timeout (ms)   |
| maxReconnectAttempts | number  | 10                    | Max reconnection attempts |


### Usage Examples
#### Method 1: Using ready() callback (Recommended)

```javascript
echo.ready(() => {
    console.log('✅ Connected to NATS');
    
    // Public channels
    echo.channel('orders')
        .listen('OrderCreated', (data) => {
            console.log('🛒 New order:', data);
        })
        .listen('OrderShipped', (data) => {
            console.log('🚚 Order shipped:', data.order.id);
        });
    
    // Private channels (require authentication)
    echo.private('user.123')
        .authenticate({ token: 'your-auth-token' })
        .listen('UserProfileUpdated', (data) => {
            console.log('👤 Profile updated:', data);
        });
    
    // Presence channels
    echo.join('chat.room')
        .here((users) => {
            console.log('👥 Users in room:', users);
        })
        .joining((user) => {
            console.log('🎉 User joined:', user.name);
        })
        .leaving((user) => {
            console.log('👋 User left:', user.name);
        });
});
```

#### Method 2: Using connection state listeners

```javascript
// Listen for connection changes
const unsubscribe = echo.onConnectionChange((connected, error) => {
    if (connected) {
        console.log('✅ Connected to NATS');
    } else {
        console.log('❌ Disconnected:', error || 'Connection lost');
    }
});

// Later, to remove listener:
// unsubscribe();
```

### Channel Types

#### Public Channels

```javascript
echo.channel('public-channel')
    .listen('EventName', (data) => {
        // Handle event
    });
```

#### Private Channels
Require authentication via Laravel's broadcasting/auth endpoint.


```javascript
echo.private('private-channel')
    .authenticate({ token: 'your-csrf-token' })
    .listen('PrivateEvent', (data) => {
        // Handle private event
    });
```


#### Presence Channels

For tracking user presence.

```javascript
const presenceChannel = echo.join('presence-channel');

presenceChannel.here((users) => {
    // Users currently in channel
    console.log('Current users:', users);
});

presenceChannel.joining((user) => {
    // User joined
    console.log('User joined:', user);
});

presenceChannel.leaving((user) => {
    // User left
    console.log('User left:', user);
});
```

### Encrypted Private Channels

```javascript
echo.encryptedPrivate('encrypted-channel')
    .authenticate({ token: 'your-token' })
    .listen('EncryptedEvent', (data) => {
        // Handle encrypted event
    });
```

## API Reference

### Echo Class

| Method                           | Description                         |
|----------------------------------|-------------------------------------| 
| channel(name)                    | Create a public channel             |
| private(name)                    | Create a private channel            |
| encryptedPrivate(name)           | Create an encrypted private channel |
| join(name)                       | Join a presence channel             |
| leave(channel)                   | Leave a channel                     |
| listen(channel, event, callback) | Direct event listening              |
| ready(callback)                  | Execute when connected              |
| onConnectionChange(listener)     | Listen for connection changes       |
| waitForConnection(timeout)       | Wait for connection (async)         |
| socketId()                       | Get unique socket ID                |
| disconnect()                     | Disconnect from NATS                |
| getConnectionStatus()            | Get connection info                 |
| isConnected()                    | Check connection status             |


### Helper Methods


| Method                          | Description                   |
|---------------------------------|-------------------------------| 
| listen(event, callback)         | Listen for event              |
| stopListening(event)            | Stop listening to event       |
| unsubscribe()                   | Unsubscribe from all events   |


### Helper Methods

```javascript
// Normalize Laravel event names
const eventName = Echo.normalizeEventName('App\\Events\\OrderShipped');
// Returns: 'OrderShipped'

// Create callback key
const key = Echo.createCallbackKey('orders', 'OrderShipped');
// Returns: 'orders.OrderShipped'
```


 ### Connection Management
### Automatic Reconnection
The package automatically handles reconnections with exponential backoff. Configure with:

```javascript
new Echo({
    maxReconnectAttempts: 10, // Default: 10
    // Reconnection attempts: 1s, 2s, 4s, 8s, 10s, 10s...
});
```


### Manual Disconnection

```javascript
// Disconnect when leaving page
window.addEventListener('beforeunload', () => {
    echo.disconnect();
});

// Or in your component cleanup
useEffect(() => {
    return () => {
        echo.disconnect();
    };
}, []);
```


## Laravel Integration
###  Backend Event

```php

<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class OrderShipped implements ShouldBroadcast
{
    use SerializesModels;

    public $order;

    public function __construct($order)
    {
        $this->order = $order;
    }

    public function broadcastOn()
    {
        return new Channel('orders');
    }
    
    public function broadcastAs()
    {
        // Optional: Custom event name
        return 'OrderShipped';
    }
}
```

### Broadcasting Configuration

```php
// config/broadcasting.php
'nats' => [
    'driver' => 'nats',
    'host' => env('NATS_HOST', 'localhost:4223'),
    'port' => env('NATS_PORT', 4223),
    'user' => env('NATS_AUTH_USER'),
    'pass' => env('NATS_AUTH_PASS'),
    'cluster' => env('NATS_CLUSTER'),
],
```

### Laravel Broadcasting Routes

```php
// routes/channels.php
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.{roomId}', function ($user, $roomId) {
    if ($user->canJoinRoom($roomId)) {
        return ['id' => $user->id, 'name' => $user->name];
    }
});
```


##  Examples

### E-commerce Application

```javascript
echo.ready(() => {
    // Admin dashboard
    echo.channel('admin-dashboard')
        .listen('RealTimeSale', (sale) => {
            updateSalesChart(sale);
        });
    
    // Customer notifications
    echo.private(`user.${userId}`)
        .authenticate({ token: csrfToken })
        .listen('OrderStatusChanged', (order) => {
            showNotification(`Order #${order.id} status: ${order.status}`);
        });
    
    // Live support chat
    echo.join(`support.${ticketId}`)
        .here((agents) => {
            console.log(`${agents.length} support agents online`);
        })
        .joining((agent) => {
            showMessage(`${agent.name} joined the chat`);
        });
});
```


 ### Real-time Dashboard

```javascript
class Dashboard {
    constructor() {
        this.echo = new Echo({
            broadcaster: 'nats',
            host: 'ws://dashboard.nats.example.com',
            auth: { user: 'dashboard', pass: 'secret' }
        });

        this.setupListeners();
    }

    setupListeners() {
        this.echo.ready(() => {
            // System metrics
            this.echo.channel('system-metrics')
                .listen('CpuUsage', this.updateCpuChart.bind(this))
                .listen('MemoryUsage', this.updateMemoryChart.bind(this));

            // Application logs
            this.echo.channel('application-logs')
                .listen('ErrorLogged', this.addErrorLog.bind(this))
                .listen('InfoLogged', this.addInfoLog.bind(this));
        });
    }
}
```

### Error Handling

```javascript
echo.onConnectionChange((connected, error) => {
    if (!connected) {
        if (error === 'max_attempts_reached') {
            console.error('Max reconnection attempts reached');
            // Show user interface for manual reconnect
            showReconnectButton();
        } else {
            console.error('Connection error:', error);
        }
    }
});

// In event callbacks
echo.channel('orders').listen('OrderShipped', (data) => {
    try {
        // Process data
        processOrder(data.order);
    } catch (error) {
        console.error('Error processing event:', error);
        logError(error, data);
    }
});

```

### Troubleshooting
### Common Issues
#### 1.Connection Failed


```bash
# Check NATS server is running
nats-server -DV

# Check WebSocket port
curl -v ws://localhost:4223
```



#### 2. No Events Received

- Verify channel names match between Laravel and frontend

- Check event names (Laravel sends App\Events\OrderShipped, listen for OrderShipped)

- Ensure Laravel is broadcasting to correct channel

#### 3. Private Channel Authentication

- Ensure Laravel's /broadcasting/auth endpoint is implemented

- Include CSRF token in requests

- Check Laravel CORS configuration

### Debug Mode

Enable debug logs to see connection and subscription details:

```javascript
new Echo({
    debug: true,
    // ... other options
});
```

#### Debug output includes:

- Connection attempts and status
- Subscription details
- Received messages
- Callback execution
- Reconnection attempts

### Related Projects

- [Laravel Broadcasting](https://laravel.com/docs/12.x/broadcasting)
- [NATS Server](https://github.com/nats-io/nats-server)
- [Laravel Backend Package for this Frontend broadcaster](https://github.com/mwangaben/laravel-nats-server)
- [NATS ws Client](https://github.com/nats-io/nats.ws)

 #### Browser Support
- Chrome 58+
- Firefox 55+
- Safari 11+
- Edge 16+
- Opera 45+


### Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/nats-laravel-echo.git
cd nats-laravel-echo

# Install dependencies
npm install

# Build the package
npm run build

# Test the build
npm test

```


###   Contributing
Contributions are welcome! Please see CONTRIBUTING.md for details.
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request


#### License
MIT License. See LICENSE file for details.


#### Changelog

#### v1.0.0

- Initial release
- NATS WebSocket support
- Laravel Echo compatibility
- Automatic reconnection
- Private and presence channels


Note: This package requires a NATS server with WebSocket support. For production use, ensure proper authentication, encryption, and security measures are in place.

### Acknowledgments

- Built on top of the excellent [nats.ws](https://github.com/nats-io/nats.ws) library
- Inspired by Laravel's broadcasting system
- Thanks to all contributors and testers







































