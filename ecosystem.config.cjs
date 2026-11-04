// Configuración PM2 para producción en un servidor propio.
// Antes: `cd frontend && npm run build` (Express sirve frontend/dist).
// Uso: pm2 start ecosystem.config.cjs | pm2 list | pm2 logs | pm2 stop all
module.exports = {
  apps: [
    {
      name: 'app',
      cwd: __dirname,
      script: 'server.js',
      env: { NODE_ENV: 'production' },
      max_restarts: 5,
      restart_delay: 2000,
      out_file: 'logs/app.out.log',
      error_file: 'logs/app.err.log',
      merge_logs: true,
    },
  ],
};
