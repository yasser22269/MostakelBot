# Agent Development Guidelines - WeBook Bot & WebUI

This repository contains the WeBook Bot core logic and its associated Web Management Interface.

## 1. Build, Lint, and Test Commands

### Installation
The project has two main areas for dependencies:
- **Root:** Main bot logic and WebUI backend.
  ```bash
  npm install
  ```
- **WebUI Frontend:** React-based dashboard.
  ```bash
  cd webui/frontend && npm install
  ```

### Build Commands
- **Full Project Build:**
  ```bash
  npm run build
  ```
- **Frontend Only:**
  ```bash
  cd webui/frontend && npm run build
  ```

### Development/Running
- **Start Backend & Socket Listener:**
  ```bash
  npm run dev
  ```
- **Start WebUI Frontend (Dev Mode):**
  ```bash
  cd webui/frontend && npm run dev
  ```
- **Start WebUI Backend directly:**
  ```bash
  node webui/backend/server.js
  ```

### Linting
- **Frontend Lint:**
  ```bash
  cd webui/frontend && npm run lint
  ```

### Testing
There is no formal test runner (like Jest). Tests are standalone Node.js scripts.
- **Run all tests:** (Manual)
- **Run a single test:**
  ```bash
  node tests/<filename>.js
  # Example: node tests/test.js
  ```

---

## 2. Code Style & Conventions

### General
- **Language:** JavaScript (ES Modules).
- **Indentation:** 2 spaces.
- **Naming Conventions:**
  - Variables/Functions: `camelCase`
  - React Components: `PascalCase`
  - Constants: `SCREAMING_SNAKE_CASE`
  - Files: `kebab-case.js` or `PascalCase.jsx` for components.

### Imports
- Use ES Modules (`import/export`) throughout the project.
- Group imports:
  1. React/Framework built-ins
  2. External libraries
  3. Internal components/modules
  4. Styles/Assets

### Frontend (React)
- **Framework:** React 19 with Vite.
- **Styling:** Tailwind CSS 4.
- **Components:** Functional components with Hooks.
- **State:** Use `useState` and `useEffect` for local state; `localStorage` for persistent tokens.
- **Icons:** Use `lucide-react`.

### Backend (Node.js/Express)
- **Framework:** Express 5.
- **Real-time:** Socket.io for log streaming.
- **Security:** JWT for authentication.
- **Persistence:** Simple JSON file storage (`instances.json`, `limits.json`) and text files (`email_pass.txt`).
- **Process Management:** Use `child_process.spawn` to manage bot instances.

### Error Handling
- **Backend:** Wrap async operations in `try...catch`. Return meaningful HTTP status codes and JSON errors:
  ```javascript
  try {
    // operation
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
  ```
- **Frontend:** Use Axios interceptors for global error handling (e.g., redirecting on 401). Use local try-catch in components for user feedback.

### Project Structure
- `/src`: Core bot logic and libraries.
- `/webui/backend`: Express server and instance management.
- `/webui/frontend`: React dashboard source.
- `/tests`: Standalone test scripts.
- `/data`: Default directory for instance-specific data.

### Configuration
- Secret keys (like `JWT_SECRET`) are currently hardcoded in `server.js` but should be moved to `.env` using `dotenv`.
- Authentication files (`email_pass.txt`, `email_pass_admins.txt`) are expected in the project root.
