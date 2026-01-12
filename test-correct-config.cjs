// In test-correct-config.cjs, update the Echo creation:
const Echo = createNatsEcho({
    broadcaster: 'nats',
    wsHost: NATS_HOST,
    wsPort: WS_PORT,  // 4223
    forceTLS: false,

    // REMOVE user/pass since server allows anonymous
    nats: {
        servers: `ws://${NATS_HOST}:${WS_PORT}`,
        debug: NATS_DEBUG,
        reconnect: true,
        maxReconnectAttempts: 10,
        timeout: 10000
    }
});