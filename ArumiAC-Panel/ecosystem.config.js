// pm2-Konfiguration:  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "arumiac-shop",
      script: "server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: { NODE_ENV: "production" },
    },
  ],
};
