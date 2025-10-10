import iobrokerConfig from '@iobroker/eslint-config';

export default [
    {
        ignores: ['eslint.config.mjs']
    },
    ...iobrokerConfig,
    {
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'commonjs'
        },
        rules: {
            'no-var': 'warn',
            'prefer-const': 'warn'
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                it: 'readonly',
                describe: 'readonly',
                suite: 'readonly'
            }
        }
    }
];
