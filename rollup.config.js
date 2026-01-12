import resolve from '@rollup/plugin-node-resolve';

export default [
    // CommonJS (for Node.js)
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.cjs',
            format: 'cjs',
            exports: 'default'
        },
        plugins: [resolve()],
        external: ['nats.ws']
    },
    // ES Module (for modern bundlers)
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.esm.js',
            format: 'es'
        },
        plugins: [resolve()],
        external: ['nats.ws']
    },
    // UMD (for browsers)
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'LaravelEchoNATS',
            exports: 'default',
            globals: {
                'nats.ws': 'nats'
            }
        },
        plugins: [resolve()],
        external: ['nats.ws']
    }
];