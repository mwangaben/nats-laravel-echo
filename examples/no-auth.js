const { createNatsEcho } = require('../dist/index.js');

window.Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: 'localhost',
    wsPort: 4222,

    nats: {
        servers: 'ws://localhost:4222',
        // No authentication - works if NATS server allows anonymous connections
        debug: true
    }
});