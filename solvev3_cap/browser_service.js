import puppeteer from 'puppeteer';
import express from 'express';
import 'dotenv/config';

const app = express();
app.use(express.json({ limit: '10mb' }));

const port = process.env.BROWSER_SERVICE_PORT || 5002;

let browser;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        console.log('Launching browser for fetch service...');
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--window-size=1920,1080'
            ]
        });
        browser.on('disconnected', () => {
            console.log('Browser disconnected.');
            browser = null;
        });
    }
    return browser;
}

const pagePool = [];
const MAX_POOL_SIZE = 5;

async function getPage() {
    const available = pagePool.find(p => !p._busy && !p.isClosed());
    if (available) {
        available._busy = true;
        return available;
    }
    if (pagePool.filter(p => !p.isClosed()).length < MAX_POOL_SIZE) {
        const b = await getBrowser();
        const page = await b.newPage();
        page._busy = true;
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        });
        pagePool.push(page);
        return page;
    }
    // wait and retry
    await new Promise(r => setTimeout(r, 300));
    return getPage();
}

function releasePage(page) {
    page._busy = false;
}

app.post('/fetch', async (req, res) => {
    const { url, method = 'GET', headers = {}, body } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'Missing url' });
    }

    let page;
    try {
        page = await getPage();

        // Navigate to a neutral page first if needed (to set cookies from the right domain)
        const targetUrl = new URL(url);
        const pageUrl = page.url();
        const pageOrigin = pageUrl === 'about:blank' ? null : (() => { try { return new URL(pageUrl).origin; } catch { return null; } })();

        if (pageOrigin !== targetUrl.origin) {
            await page.goto(`${targetUrl.origin}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        }

        // Extract cookies from header and set them on the page
        const cookieHeader = headers['cookie'] || headers['Cookie'] || '';
        if (cookieHeader) {
            const cookiePairs = cookieHeader.split(';').map(s => s.trim()).filter(Boolean);
            const cookiesToSet = cookiePairs.map(pair => {
                const eqIdx = pair.indexOf('=');
                const name = pair.slice(0, eqIdx).trim();
                const value = pair.slice(eqIdx + 1).trim();
                return { name, value, domain: targetUrl.hostname, path: '/' };
            }).filter(c => c.name && c.value);
            if (cookiesToSet.length) {
                await page.setCookie(...cookiesToSet);
            }
        }

        const result = await page.evaluate(async (fetchUrl, fetchMethod, fetchHeaders, fetchBody) => {
            // Remove cookie header — browser will use its own cookie jar
            const hdrs = { ...fetchHeaders };
            delete hdrs['cookie'];
            delete hdrs['Cookie'];

            try {
                const response = await fetch(fetchUrl, {
                    method: fetchMethod,
                    headers: hdrs,
                    body: fetchBody ? JSON.stringify(fetchBody) : undefined,
                    credentials: 'include'
                });

                const responseText = await response.text();
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch {
                    data = responseText;
                }

                const respHeaders = {};
                response.headers.forEach((val, key) => { respHeaders[key] = val; });

                return {
                    status: response.status,
                    statusText: response.statusText,
                    headers: respHeaders,
                    data
                };
            } catch (err) {
                return { error: err.message };
            }
        }, url, method, headers, body);

        if (result.error) {
            return res.status(502).json({ error: result.error });
        }

        res.json(result);
    } catch (err) {
        console.error('browser_service /fetch error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        if (page) releasePage(page);
    }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Pre-warm browser on start
getBrowser().then(() => {
    app.listen(port, () => {
        console.log(`Browser fetch service running on http://localhost:${port}`);
        console.log(`POST /fetch  {url, method, headers, body}`);
    });
}).catch(err => {
    console.error('Failed to launch browser:', err.message);
    process.exit(1);
});
