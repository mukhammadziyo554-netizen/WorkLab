/**
 * PM2 Ecosystem Configuration for WorkLab Backend
 * 
 * Usage:
 *   pm2 start ecosystem.config.js              # Start all apps
 *   pm2 start ecosystem.config.js --name backend  # Start specific app
 *   pm2 reload ecosystem.config.js             # Zero-downtime reload
 *   pm2 stop ecosystem.config.js               # Stop all apps
 *   pm2 delete ecosystem.config.js             # Delete all apps from PM2
 *   pm2 logs                                   # View all logs
 *   pm2 save                                   # Save PM2 process state
 *   pm2 startup                                # Enable auto-start on boot
 */

module.exports = {
  apps: [
    {
      // ========================================
      // Main Backend Server (Uvicorn/FastAPI)
      // ========================================
      name: "worklab-backend",
      script: "python",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4",
      cwd: "./backend",
      
      // Process Management
      instances: 1,              // Single instance for stateful app
      watch: false,              // Disable auto-reload in production
      max_memory_restart: "500M", // Restart if memory exceeds 500MB
      
      // Logging
      error_file: "/var/log/worklab/backend-error.log",
      out_file: "/var/log/worklab/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Startup/Shutdown
      listen_timeout: 10000,     // Wait 10s for app to listen
      kill_timeout: 5000,        // Give app 5s to graceful shutdown
      wait_ready: true,          // Wait for 'ready' event
      
      // Environment
      env: {
        NODE_ENV: "production",
        PYTHONUNBUFFERED: "1",    // Python logs in real-time
      },
      
      // Restart Policy
      max_restarts: 10,          // Max 10 restarts per 1-hour window
      min_uptime: "10s",         // Must run 10s to be counted as successful start
      autorestart: true,         // Auto-restart on crash
      
      // Advanced
      ignore_watch: ["node_modules", ".git", "logs", "__pycache__"],
    },
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: "deploy",            // SSH user for deployment
      host: "your-vps-domain.com",  // Your VPS domain/IP
      ref: "origin/main",        // Git branch to deploy
      repo: "https://github.com/your-repo.git",  // Git repository
      path: "/home/deploy/worklab",  // Deployment path on VPS
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
    },
  },
};
