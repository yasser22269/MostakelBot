import puppeteer from 'puppeteer';
import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json());
const port = process.env.AHLAN_BROWSER_PORT || 5002;

let browser;
let page;

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

app.post('/fetch', async (req, res) => {
  const { url, method, headers, body } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[Puppeteer Fetch] ${method || 'GET'} ${url}`);

    const response = await page.evaluate(async ({ url, method, headers, body }) => {
      const options = {
        method: method || 'GET',
        headers: headers || {}
      };

      if (body) {
        options.body = typeof body === 'object' ? JSON.stringify(body) : body;
      }

      const cookieHeader = headers?.cookie || headers?.Cookie;
      if (cookieHeader) {
        cookieHeader.split(';').forEach(c => {
          document.cookie = c.trim() + '; path=/';
        });
      }

      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
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
