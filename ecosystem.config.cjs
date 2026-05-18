module.exports = {
  apps: [
    {
      name: 'app',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker',
      script: 'node_modules/.bin/tsx',
      args: 'src/worker.ts',
      watch: false,
      env: { NODE_ENV: 'production' },
    },
  ],
}
