# reCAPTCHA v3 Local Solver

This is an independent CAPTCHA solver project that uses Puppeteer to solve Google reCAPTCHA v3 by launching a real browser instance and executing the Google reCAPTCHA API.

## Features
- **One Browser Instance:** Efficiently manages resources by using a single browser instance for all requests.
- **Parallelism:** Supports multiple concurrent requests using separate pages or shared execution.
- **Persistent Pages:** Caches pages for specific URL/Sitekey combinations to speed up token generation.
- **Simple API:** Provides endpoints for task creation and result polling, matching the expectations of the main project.

## Installation

```bash
cd solvev3_cap
npm install
```

## Usage

Start the server:
```bash
npm start
```

The server will run on `http://localhost:5000`.

### API Endpoints

#### 1. Create Task
`GET /recaptchav3?sitekey=YOUR_SITE_KEY&url=TARGET_URL&pageAction=login`

**Response:**
```json
{
  "task_id": "uuid-string"
}
```

#### 2. Get Result
`GET /result?id=uuid-string`

**Response (while processing):**
```json
{
  "status": "processing",
  "data": null
}
```

**Response (when ready):**
```json
{
  "status": "ready",
  "data": {
    "value": "g-recaptcha-response-token",
    "elapsed_time": 1.25
  }
}
```

## Integration
To use this with the main project, ensure `localHostAddress` in `src/captcha/capsolver.js` points to `http://localhost:5000`.
