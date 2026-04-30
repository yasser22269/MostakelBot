import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 5001;
const __dirname = path.dirname(new URL(import.meta.url).pathname);

let browser;
const tasks = new Map();

const TEMPLATE_KEY = '6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL';
const TEMPLATE_PATH = 'recaptcha_template.js';

async function ensureTemplate() {
    try {
        await fs.access(TEMPLATE_PATH);
        console.log('Template already exists.');
    } catch {
        console.log('Template not found. Fetching initial template...');
        const url = `https://www.google.com/recaptcha/api.js?render=${TEMPLATE_KEY}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (response.ok) {
            let content = await response.text();
            // Replace the specific key with a placeholder for easier replacement later
            content = content.replace(TEMPLATE_KEY, 'RECAPTCHA_SITE_KEY_PLACEHOLDER');
            await fs.writeFile(TEMPLATE_PATH, content);
            console.log('Template saved successfully.');
        } else {
            console.error('Failed to fetch template:', response.statusText);
        }
    }
}

async function getRecaptchaScript(sitekey) {
    try {
        let content = await fs.readFile(TEMPLATE_PATH, 'utf8');
        console.log(`Generating script for sitekey: ${sitekey} from template`);
        // Replace the placeholder with the actual sitekey requested
        return content.replace('RECAPTCHA_SITE_KEY_PLACEHOLDER', sitekey);
    } catch (error) {
        console.error(`Error reading template, falling back to network for ${sitekey}`);
        const url = `https://www.google.com/recaptcha/api.js?render=${sitekey}`;
        const response = await fetch(url);
        return response.ok ? await response.text() : null;
    }
}

async function getBrowser() {
    if (!browser) {
        console.log('Launching browser instance...');
        let execPath;
        if (process.platform === 'win32') {
            execPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        } else {
            const linuxPaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/google-chrome'];
            for (const p of linuxPaths) {
                if (existsSync(p)) {
                    execPath = p;
                    break;
                }
            }
            if (!execPath) execPath = '/usr/bin/google-chrome';
        }
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: execPath,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-position=0,0',
                '--window-size=1920,1080'
            ]
        });
        browser.on('disconnected', () => {
            console.log('Browser disconnected, resetting instance variable.');
            browser = null;
        });
    }
    return browser;
}

const b = await getBrowser();
const pageCache = new Map();
const pendingTasks = new Map(); // Track pending results from browser
const MAX_PAGES_PER_KEY = 10;
const MAX_CONCURRENT_PER_PAGE = 12;

async function getPage(url, sitekey) {
    const cacheKey = `${url}|${sitekey}`;
    if (!pageCache.has(cacheKey)) {
        pageCache.set(cacheKey, []);
    }
    
    const pages = pageCache.get(cacheKey);
    
    // Cleanup closed pages
    for (let i = pages.length - 1; i >= 0; i--) {
        if (pages[i].isClosed()) {
            pages.splice(i, 1);
        }
    }

    // Find the best page: ready and with the least amount of tasks
    let bestPage = null;
    let minTasks = Infinity;
    for (const p of pages) {
        if (p._ready && p._activeTasks < minTasks) {
            minTasks = p._activeTasks;
            bestPage = p;
        }
    }

    // Use existing page if it has capacity
    if (bestPage && minTasks < MAX_CONCURRENT_PER_PAGE) {
        bestPage._activeTasks++;
        return bestPage;
    }

    // Create new page if limit not reached
    if (pages.length < MAX_PAGES_PER_KEY) {
        const page = await b.newPage();
        
        // Anti-bot: Randomize mouse movements occasionally to simulate activity
        const simulateActivity = async (p) => {
          try {
            if (!p.isClosed()) {
              const x = Math.floor(Math.random() * 800);
              const y = Math.floor(Math.random() * 600);
              await p.mouse.move(x, y);
            }
          } catch (e) {}
        };
        setInterval(() => simulateActivity(page), 15000);

        page._activeTasks = 1;
        page._ready = false;
        pages.push(page);
        
        try {
            // Set a realistic viewport and common browser features
            await page.setViewport({ width: 1920, height: 1080 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
            
            // Masking common bot signals
            await page.evaluateOnNewDocument(() => {
              // Overwrite the `plugins` property to use a realistic value
              Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
              });
              // Overwrite the `languages` property
              Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
              });
              // Overwrite the `webdriver` property
              Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
              });
            });

            // Expose function to handle reCAPTCHA results asynchronously
            await page.exposeFunction('onRecaptchaCompleted', (taskId, token, error) => {
                const pending = pendingTasks.get(taskId);
                if (pending) {
                    if (error) pending.reject(new Error(error));
                    else pending.resolve(token);
                    pendingTasks.delete(taskId);
                }
            });

            console.log(`Navigating to target URL: ${url}`);
            // Using 'load' instead of 'networkidle2' for speed
            await page.goto(url, { waitUntil: 'load', timeout: 60000 });

            console.log(`Injecting reCAPTCHA script for sitekey: ${sitekey}`);
            const localScript = await getRecaptchaScript(sitekey);
            
            await page.evaluate((key, scriptContent) => {
                if (!window.grecaptcha) {
                    const script = document.createElement('script');
                    if (scriptContent) {
                        script.textContent = scriptContent;
                    } else {
                        script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
                    }
                    document.head.appendChild(script);
                }
            }, sitekey, localScript);

            await page.waitForFunction(() => typeof window.grecaptcha !== 'undefined' && typeof window.grecaptcha.execute === 'function', { timeout: 50000 });
            page._ready = true;
            return page;
        } catch (error) {
            const index = pages.indexOf(page);
            if (index > -1) pages.splice(index, 1);
            await page.close().catch(() => {});
            throw error;
        }
    }

    // If all pages are busy and limit reached, fallback to bestPage anyway or wait
    if (bestPage) {
        bestPage._activeTasks++;
        return bestPage;
    }

    // Wait a bit if no pages are available at all (still initializing)
    await new Promise(r => setTimeout(r, 500));
    return getPage(url, sitekey);
}

app.get('/recaptchav3', async (req, res) => {
    const { sitekey, url, pageAction } = req.query;
    if (!sitekey || !url) {
        return res.status(400).json({ error: 'Missing sitekey or url' });
    }

    const taskId = uuidv4();
    const startTime = Date.now();
    tasks.set(taskId, { status: 'processing', data: null, timestamp: startTime });
    
    // Respond immediately with task_id to match localHostAddress/recaptchav3 behavior
    res.json({ task_id: taskId });

    // Solve in background
    (async () => {
        let page;
        try {
            page = await getPage(url, sitekey);
            
            console.log(`Executing reCAPTCHA for task ${taskId} (action: ${pageAction || 'login'})`);
            
            // Create a promise to wait for the result from the browser with a timeout
            const solvePromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (pendingTasks.has(taskId)) {
                        pendingTasks.delete(taskId);
                        reject(new Error('reCAPTCHA solve timed out (60s)'));
                    }
                }, 60000);

                pendingTasks.set(taskId, { 
                    resolve: (token) => {
                        clearTimeout(timeout);
                        resolve(token);
                    }, 
                    reject: (err) => {
                        clearTimeout(timeout);
                        reject(err);
                    } 
                });
            });

            // Trigger reCAPTCHA execution in browser
            await page.evaluate((key, action, tid) => {
                window.grecaptcha.ready(() => {
                    window.grecaptcha.execute(key, { action: action || 'login' })
                        .then(token => {
                            // Length check: tokens with 0.9 score are usually > 1000 chars. 
                            // Tokens for blocked environments are often very short.
                            console.log(`[RECAPTCHA_DEBUG] Token generated for ${tid}. Length: ${token.length}`);
                            window.onRecaptchaCompleted(tid, token, null);
                        })
                        .catch(err => window.onRecaptchaCompleted(tid, null, err.message || err));
                });
            }, sitekey, pageAction, taskId);

            // Wait for the token via the exposed function
            const token = await solvePromise;

            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
            tasks.set(taskId, { 
                status: 'ready', 
                data: { 
                    value: token, 
                    elapsed_time: parseFloat(elapsedTime) 
                } 
            });
            console.log(`Task ${taskId} completed successfully in ${elapsedTime}s`);
        } catch (error) {
            console.error(`Error solving reCAPTCHA v3 for task ${taskId}:`, error);
            tasks.set(taskId, { status: 'error', error: error.message });
            pendingTasks.delete(taskId);
        } finally {
            if (page) {
                page._activeTasks = Math.max(0, (page._activeTasks || 0) - 1);
            }
        }
    })();
});

app.get('/result', (req, res) => {
    const { id } = req.query;
    const task = tasks.get(id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
});

// Periodic task cleanup to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [id, task] of tasks.entries()) {
        // Remove tasks older than 10 minutes
        if (task.timestamp && (now - task.timestamp > 600000)) {
            tasks.delete(id);
        }
    }
}, 300000);

app.listen(port, async () => {
    await ensureTemplate();
    console.log(`CAPTCHA solver server is running at http://localhost:${port}`);
    console.log(`Ready to handle requests at /recaptchav3 and /result`);
});
