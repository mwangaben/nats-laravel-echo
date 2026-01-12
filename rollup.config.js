import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
    // Main JavaScript bundle
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/index.cjs',
                format: 'cjs',
                sourcemap: true,
                exports: 'named'
            },
            {
                file: 'dist/index.esm.js',
                format: 'es',
                sourcemap: true
            }
        ],
        plugins: [
            resolve({
                browser: true
            }),
            commonjs(),
            typescript({
                tsconfig: './tsconfig.json',
                exclude: ['**/*.test.ts', '**/*.spec.ts']
            })
        ],
        external: ['nats.ws', 'laravel-echo']
    },
    // TypeScript declarations
    {
        input: 'src/index.ts',
        output: [{
            file: 'dist/index.d.ts',
            format: 'es'
        }],
        plugins: [dts()],
        external: ['nats.ws', 'laravel-echo']
    }
];