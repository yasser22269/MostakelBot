# Ahlan Browser Service

This service helps bypass Vercel bot detection on `ahlan.sa` by using Puppeteer to handle requests within a real browser context. It utilizes the existing dependencies in the `solvev3_cap` folder.

## Setup

1. Start the service:
   ```bash
   node solvev3_cap/ahlan_browser_service.js
   ```

## Configuration

Configure environment variables in `.env`:
```env
USE_BROWSER_FOR_AHLAN=true
AHLAN_BROWSER_PORT=5002
AHLAN_BROWSER_HEADLESS=false
```

## How it works

- The service launches a Puppeteer instance and navigates to `https://www.ahlan.sa/ar-sa`.
- It stays on the page to maintain cookies and bypass initial bot checks (Vercel Security Checkpoint).
- It exposes an API at `http://localhost:5002/fetch` which the bot uses to route Ahlan-specific requests (like getting event details or holding tokens).
- Requests are executed using `page.evaluate()` inside the browser context, ensuring they use the valid browser session.
