#!/bin/bash
echo "Starting WeBook Bot WebUI with PM2..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "PM2 could not be found. Please install it with 'npm install -g pm2'"
    exit 1
fi

# Start with PM2
pm2 restart ecosystem.config.js

echo "WebUI started in background. Use 'pm2 status' to check."
echo "Use 'pm2 logs' to see output."
