// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
    // CommonJS
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.cjs',
            format: 'cjs',
            exports: 'default'
        },
        plugins: [
            resolve(),
            commonjs()
        ],
        external: ['nats.ws']
    },
    // ES Module
    {
        input: 'src/index.js',
        output: {
            file: 'dist/index.esm.js',
            format: 'es'
        },
        plugins: [
            resolve(),
            commonjs()
        ],
        external: ['nats.ws']
    }
];