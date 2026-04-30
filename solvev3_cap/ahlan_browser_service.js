import puppeteer from 'puppeteer';
import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json());
const port = process.env.AHLAN_BROWSER_PORT || 5002;

let browser;
let page;

const fetchQueue = [];
let isProcessingQueue = false;

async function launchBrowser() {
  console.log('Launching Puppeteer browser...');
  browser = await puppeteer.launch({
    headless: process.env.AHLAN_BROWSER_HEADLESS === 'true' ? 'new' : false,
    args: [
      '--no-sandbox',
      '--headless',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  page = await browser.newPage();

  // Set a realistic user agent
  await page.setUserAgent(process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating to Ahlan to pass bot checks...');
  await page.goto('https://www.ahlan.sa/ar-sa/events/details?event=final-afc-5458782', { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('Waiting for verification...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const title = await page.title();
  console.log('Current page title:', title);

  browser.on('disconnected', () => {
    console.log('Browser disconnected, relaunching...');
    launchBrowser();
  });
}

async function processQueue() {
  if (isProcessingQueue || fetchQueue.length === 0) return;
  isProcessingQueue = true;

  const { req, res } = fetchQueue.shift();
  const { url, method, headers, body } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    isProcessingQueue = false;
    processQueue();
    return;
  }

  try {
    console.log(`[Puppeteer Fetch] ${method || 'GET'} ${url}`);

    const response = await page.evaluate(async ({ url, method, headers, body }) => {
      const options = {
        method: method || 'GET',
        headers: headers || {},
        credentials: 'include'
      };

      if (body) {
        options.body = typeof body === 'object' ? JSON.stringify(body) : body;
      }

      const incomingCookie = headers?.cookie || headers?.Cookie;
      if (incomingCookie) {
        incomingCookie.split(';').forEach(c => {
          document.cookie = c.trim() + '; path=/';
        });
      }

      if (options.headers.cookie) delete options.headers.cookie;
      if (options.headers.Cookie) delete options.headers.Cookie;

      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      // clear document.cookie to prevent leakage
      const cookieHeader = headers?.cookie || headers?.Cookie;
      if (cookieHeader) {
        cookieHeader.split(';').forEach(c => {
          const cookieName = c.trim().split('=')[0];
          document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        });
      }

      return {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data
      };
    }, { url, method, headers, body });

    res.status(200).json(response);
  } catch (error) {
    console.error('[Puppeteer Fetch Error]', error);
    res.status(500).json({ error: error.message });
  }

  isProcessingQueue = false;
  processQueue();
}

app.post('/fetch', (req, res) => {
  fetchQueue.push({ req, res });
  processQueue();
});

app.get('/status', async (req, res) => {
  try {
    const url = page.url();
    const title = await page.title();
    res.json({ url, title, status: 'active', engine: 'puppeteer' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.listen(port, async () => {
  console.log(`Ahlan Puppeteer Browser Service listening at http://localhost:${port}`);
  await launchBrowser();
});
