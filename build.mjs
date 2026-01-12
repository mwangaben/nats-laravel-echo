// build.mjs
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function build() {
    try {
        console.log('Building TypeScript...');
        await execAsync('tsc --noEmit');

        console.log('Building with Rollup...');
        await execAsync('rollup -c');

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error.message);
        process.exit(1);
    }
}

build();