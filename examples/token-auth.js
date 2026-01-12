const { createNatsEcho } = require('../dist/index.js');

window.Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: process.env.NATS_HOST || 'localhost',
    wsPort: parseInt(process.env.NATS_PORT || 4222),

    nats: {
        servers: `ws://${process.env.NATS_HOST || 'localhost'}:${process.env.NATS_PORT || 4222}`,
        token: process.env.NATS_TOKEN, // Token authentication
        debug: process.env.NATS_DEBUG === 'true'
    }
});