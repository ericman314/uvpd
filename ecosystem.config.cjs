module.exports = {
  apps: [
    {
      name: 'uvpd-cloud-api',
      script: 'cloud-api/uvpd.js',
      cwd: '/home/eric/uvpd/current',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],

  deploy: {
    production: {
      user: 'eric',
      host: '45.56.94.188',
      ref: 'origin/main',
      repo: 'https://github.com/ericman314/uvpd.git',
      path: '/home/eric/uvpd',
      'post-deploy': [
        'cd cloud-api && npm install --omit=dev && cd ..',
        'pm2 startOrReload ecosystem.config.cjs --only uvpd-cloud-api',
      ].join(' && '),
    },
  },
}
