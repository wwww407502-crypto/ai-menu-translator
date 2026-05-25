module.exports = {
  apps: [
    {
      name: 'ai-menu-backend',
      script: 'index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '512M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 5000,
      listen_timeout: 3000
    }
  ]
};
