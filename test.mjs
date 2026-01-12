// test.js
const { createNatsEcho } = require('./dist/index.js');

console.log('Testing NATS Laravel Echo...');

const echo = createNatsEcho({
    wsHost: 'localhost',
    wsPort: 4222,
    key: 'test-app'
});

console.log('Socket ID:', echo.socketId());

// Test basic functionality
const testChannel = echo.channel('test-channel');
console.log('Channel created:', testChannel ? 'Yes' : 'No');

// Test listening
testChannel.listen('test-event', (data) => {
    console.log('Test event received:', data);
});

console.log('Test completed successfully!');
echo.disconnect();