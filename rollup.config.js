import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
    // CommonJS (for Node.js)
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.cjs',
            format: 'cjs',
            exports: 'named'
        },
        plugins: [
            resolve(),
            commonjs()
        ],
        external: ['nats.ws']
    },
    // ES Module (for modern bundlers)
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.esm.js',
            format: 'es',
            exports: 'named'
        },
        plugins: [
            resolve()
        ],
        external: ['nats.ws']
    },
    // UMD (for browsers) - Fixed version
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'LaravelEchoNATS',
            exports: 'named',
            globals: {
                'nats.ws': 'nats'
            }
        },
        plugins: [
            resolve(),
            commonjs()
        ],
        external: ['nats.ws']
    }
];