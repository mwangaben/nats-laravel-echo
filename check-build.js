// check-build.js - Check what's in the built package
const fs = require('fs');
const path = require('path');

console.log('📦 Checking built package...\n');

// Read the built CommonJS file
const builtFile = path.join(__dirname, 'dist', 'index.cjs');
if (!fs.existsSync(builtFile)) {
    console.log('❌ Built file not found. Run: npm run build');
    process.exit(1);
}

const content = fs.readFileSync(builtFile, 'utf8');

// Look for connection-related code
console.log('Searching for connection logic...\n');

// Check if connect is called
if (content.includes('await connect')) {
    console.log('✅ Found "await connect" in built code');
} else {
    console.log('❌ "await connect" NOT found in built code');
}

// Check for SimpleNatsEcho class
if (content.includes('class SimpleNatsEcho')) {
    console.log('✅ SimpleNatsEcho class found');
} else {
    console.log('❌ SimpleNatsEcho class NOT found');
}

// Check for socketId method
if (content.includes('socketId()')) {
    console.log('✅ socketId() method found');
} else {
    console.log('❌ socketId() method NOT found');
}

// Extract a sample of the connection logic
console.log('\n📝 Sample of connection logic:');
const lines = content.split('\n');
let inConnectMethod = false;
let connectLines = [];

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('async connect()') || lines[i].includes('connect = async')) {
        inConnectMethod = true;
    }
    if (inConnectMethod) {
        connectLines.push(lines[i]);
        if (lines[i].includes('}') && connectLines.length > 10) {
            break;
        }
    }
}

if (connectLines.length > 0) {
    console.log(connectLines.slice(0, 15).join('\n'));
    if (connectLines.length > 15) {
        console.log('...');
    }
}