module.exports = {
  apps: [
    {
      name: 'app',
      script: 'pnpm',
      args: 'start',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'worker',
      script: 'pnpm',
      args: 'exec tsx src/worker.ts',
      watch: false,
      env: { NODE_ENV: 'production' },
    },
  ],
}
