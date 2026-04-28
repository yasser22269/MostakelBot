import { chromium } from 'playwright';
import crypto from "crypto";
import fs from 'fs';
import { FILE_PATHS } from '../src/utils/config.js';
import { log } from '../src/utils/utils.js';

/**
 * Playwright-based Socket Manager
 * Opens a blank page and establishes WebSocket connections using the browser's engine.
 */
export async function establishPlaywrightSocket(account, options = {}) {
  const email = account.split(':')[0];
  const {
    holdToken,
    teamId,
    eventKey,
    reCaptchaToken,
    proxy,
    origin = 'https://chart.seatcloud.com'
  } = options;

  if (!holdToken || !teamId || !eventKey) {
    throw new Error(`Missing required parameters for ${email}`);
  }

  // 1. Generate the Secure Tracing ID (Identical to bundle logic)
  const generateSecureTraceId = () => {
    const hex = crypto.randomBytes(16).toString("hex");
    return `${Date.now()}-${hex}`;
  };
  const finalTracingId = generateSecureTraceId();

  // 2. Build the URL
  const url = `wss://api.seatcloud.com:8443/?event=${eventKey}&token=${holdToken}&teamID=${teamId}&reCaptchaToken=${reCaptchaToken || ''}&tracingId=${finalTracingId}`;

  log('info', `Launching Playwright browser for ${email}`);

  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });

  const context = await browser.newContext({
    proxy: proxyConfig,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Origin': 'https://chart.seatcloud.com'
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  
  // Navigate to the actual site
  await page.goto('https://chart.seatcloud.com/v1.0/index.html');

  // 2.5. Send RUM (Real User Monitoring) request
  try {
    const pageloadId = crypto.randomUUID();
    const startTime = Date.now();
    const siteToken = "123f293d6f36402fa0f137c1924d6d8b";
    
    const rumPayload = {
      memory: {},
      resources: [],
      referrer: "",
      eventType: 1,
      firstPaint: 0,
      firstContentfulPaint: 1064,
      startTime: startTime,
      versions: { fl: "2024.11.0", js: "2026.2.0", timings: 2 },
      pageloadId: pageloadId,
      location: "https://chart.seatcloud.com/v1.0/index.html",
      nt: "navigate",
      timingsV2: {
        nextHopProtocol: "",
        domainLookupStart: 0,
        domainLookupEnd: 0,
        connectStart: 0,
        connectEnd: 0,
        requestStart: 0,
        responseStart: 0,
        responseEnd: 391,
        domInteractive: 1046,
        domComplete: 1068,
        loadEventStart: 1068,
        loadEventEnd: 1069,
        transferSize: 0,
        decodedBodySize: 0
      },
      siteToken: siteToken,
      st: 2
    };

    await page.evaluate(async (payload) => {
      await fetch('https://chart.seatcloud.com/cdn-cgi/rum', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }, rumPayload);
  } catch (err) {}

  log('info', `Establishing Playwright WebSocket for ${email}...`);

  // 3. Establish the connection
  const socketHandle = await page.evaluate(({ url, finalTracingId }) => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);

        window._ws = ws; // Store on window for access
        window._messages = [];
        window._isReady = false;

        ws.onopen = () => {
          // Anti-bot: 250ms ready delay
          setTimeout(() => {
            window._isReady = true;
            resolve({ status: 'connected', tracingId: finalTracingId });
          }, 250);
        };

        ws.onmessage = (e) => {
          window._messages.push(e.data);
          // Custom event for the parent process to listen to if needed
          window.dispatchEvent(new CustomEvent('ws-message', { detail: e.data }));
        };

        ws.onerror = (err) => reject(new Error('WebSocket Error'));
        ws.onclose = () => { window._isReady = false; };

      } catch (err) {
        reject(err);
      }
    });
  }, { url, finalTracingId });

  log('info', `✅ Playwright Socket ${socketHandle.status} for ${email} with tracingId: ${finalTracingId}`);

  return {
    browser,
    context,
    page,
    email,
    tracingId: finalTracingId,
    /**
     * Helper to send a hold request through the browser-based socket
     */
    sendHold: async (holdRequest) => {
      const enrichedRequest = {
        ...holdRequest,
        tracing_id: finalTracingId
      };
      
      return await page.evaluate((req) => {
        if (!window._ws || !window._isReady) throw new Error('Socket not ready');
        window._ws.send(JSON.stringify(req));
        return true;
      }, enrichedRequest);
    },
    /**
     * Clean up resources
     */
    close: async () => {
      await browser.close();
    }
  };
}
