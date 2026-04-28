# WeBook Bot WebUI

This WebUI allows you to manage multiple instances of the WeBook booking bot.

## Features
- **Multi-instance**: Run multiple bots with different accounts and configurations.
- **Dynamic Data Folders**: Each instance has its own `data_suffix/` folder.
- **Live Logs**: Watch terminal output in real-time via WebSockets.
- **File Manager**: Edit account lists, proxies, and other data files directly from the browser.
- **ENV Configuration**: Easily modify bot environment variables for each instance.
- **Secure Access**: Login via email and password (managed in `email_pass.txt`).

## Getting Started

### 1. Install Dependencies
```bash
npm install
cd webui/frontend
npm install
```

### 2. Configure Access
Add your WebUI login credentials to `email_pass.txt` in the root directory:
```text
admin:admin123
```

### 3. Start the WebUI
Run the start script:
```bash
./start_webui.sh
```
The backend will run on `http://localhost:3001` and the frontend on `http://localhost:5173` (or similar Vite port).

## How it works
- **Authentication**: Uses JWT for secure API access.
- **Instances**: Metadata is stored in `instances.json`.
- **Process Management**: Bot processes are spawned as child processes with custom environment variables (including `DATA_DIR`).
- **Data Isolation**: Each bot instance uses a separate directory for its state, preventing conflicts.
