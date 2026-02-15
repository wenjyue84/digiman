module.exports = {
  apps: [
    {
      name: 'pelangi-api',
      script: 'dist/index.js',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/pelangi-api-error.log',
      out_file: 'logs/pelangi-api-out.log',
      merge_logs: true,
    },
    {
      name: 'rainbow-ai',
      script: 'dist/index.js',
      cwd: './RainbowAI',
      env: {
        NODE_ENV: 'production',
        MCP_SERVER_PORT: 3002,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '768M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/rainbow-ai-error.log',
      out_file: 'logs/rainbow-ai-out.log',
      merge_logs: true,
      // Rainbow depends on pelangi-api — start after a delay
      wait_ready: true,
      listen_timeout: 15000,
    },
  ],
};
