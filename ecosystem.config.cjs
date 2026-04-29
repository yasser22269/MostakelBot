module.exports = {
  apps : [{
    name: 'webook-backend',
    script: 'webui/backend/server.js',
    watch: ['webui/backend'],
    ignore_watch: ['node_modules', 'logs'],
    env: {
      NODE_ENV: 'development'
    }
  }, {
    name: 'webook-frontend',
      script: "serve",
          env: {
            PM2_SERVE_PATH: './webui/frontend/dist', // Directory containing your static HTML files
            PM2_SERVE_PORT: 8080,      // The port you want to serve on
            PM2_SERVE_SPA: 'true'      // Optional: use 'true' for Single Page Applications (redirects all routes to index.html)
          }
  },
    {
    name: 'webook-telegram',
    script: 'scripts/listen_tg.js',
    watch: ['scripts/listen_tg.js', 'scripts/release.js'],
    env: {
      NODE_ENV: 'development',
      DATA_DIR: 'data_a_1772892664307',
    },
  },
    {
    name: 'webook-telegram-ah',
    script: 'scripts/listen_tg.js',
    watch: ['scripts/listen_tg.js', 'scripts/release.js'],
    env: {
      NODE_ENV: 'development',
      DATA_DIR: 'data_a_1773902774742',
      tgChannelKey: "-5108260501",
    },
    {
    name: 'ahlan-browser',
    script: 'solvev3_cap/ahlan_browser_service.js',
    env: {
      NODE_ENV: 'development',
      AHLAN_BROWSER_PORT: 5002,
      AHLAN_BROWSER_HEADLESS: 'true'
    }
    }

  ],

  deploy : {
    production : {
      user : 'root',
      host : '130.94.57.61',
      ref  : 'origin/master',
      repo : 'https://github.com/hsain9357/abd-alrahman-palestinian-bot-webook.git',
      path : '/root/bot',
      'pre-deploy-local': '',
      'post-deploy' : 'bash post-deploy.sh',
      'pre-setup': '',
      
    }
  }
};
