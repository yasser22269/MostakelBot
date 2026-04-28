/**
 * Full real hold test:
 * 1. Get fresh hold token
 * 2. Establish WebSocket socket connection
 * 3. Listen for REAL free seats on the event
 * 4. Hold the first free seat found
 * 5. Wait for Telegram to fully send before exiting
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { holdObject, main as utilsMain } from '../src/utils/utils.js';
import { establish_socket_connection, accountSockets } from '../src/bot/socket_book.js';
import { ApiConfig } from '../src/lib/chunk-LPIRJEMY.js';
import { fetchClient } from '../src/lib/chunk-K342ITN7.js';
import { createCookie } from '../src/lib/chunk-UFCTKZW2.js';
import { HttpsProxyAgent } from 'https-proxy-agent';

process.env.sendTG = 'true';
process.env.SKIP_PAYMENT = 'true';

const TEST_ACCOUNT = 'yasser.m22291@gmail.com:Yasser@22291:eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI2NzhmYmQ3MDRiMTk1NTg5MTEwYzczZDIiLCJqdGkiOiJhZGNjN2EzOTgzMjMyOTZhOWQyM2FmODQxN2JmMGFhNTZmYjcyMDliMjk4NTYzYjExYjk2Mzg0NjA5MmExYjIyYWIwYzBjMDc5NzI0NWE3ZSIsImlhdCI6MTc3NzM3MjM5MS4xOTEzNTEsIm5iZiI6MTc3NzM3MjM5MS4xOTEzNTIsImV4cCI6MTc3Nzk3NzE5MS4xODc5MjQsInN1YiI6IjY5ZjA4NDFlZTY4MjFkZmVjNzAxYmZlMCIsInNjb3BlcyI6W119.WSZGr_t0iKgSgCqZ2b5AtlX4F7JnCLXiWaD0-TjU3dkCt1ialq47AxOUmDrThE0glQrvRwgOZAwD61aAJ3OTUqXTBPRWprMd3oY0MctWB9tjih9nt4bujsiPmFE2JNyQVsGY1JnWErNP7vmPm6YqSvAY9qfXKjECpc9ANMz_YWvl2wcyOiWrUKPLu8zPHoXIo4E-Jf2KFP-7_t1ycy0WzJQkfBBdd4wj78xTHHnyfn8QpKMY9_okvCR2qF5Njy9zz54WR7xqRNFeq_sfL6JkBLOV_JAFWncN_eEBlBGdz2_-AS-zsD4VXs7z2gbpFDIddiDq-WFJaiwUXl3mLvvmk8rlgzH2DANrPaYewuO3G9TUqwPEITWWIrp0ck3HP6syIoclrsbG5bkWgzERSmXVxdEMUcWBmPEmiwbb4AWdsOBupuDysTAjzqybpovXEAZIJcfzdM4eG-rScJ-t5dYKgyBMFvv-2NfHi-t0vMKRgFMhTe5eRs4id37jjCEmYim4GD1hck00lLZFBM9iK2_5bHdzhHMt-vldMlfuFmpxLTi_x-ou8Qvu3k_PpblOvGWzCEGuN17IY9q75qLS8vlQjkOYZlm0NOWkNNID7ehYJQHKGjRd7pDsk5HPiAFcwH3Uzxj2Lekpb7zpxlFeX3LK_GHb486fAV53qGVw1oRl8kA';

const HOLD_TOKENS_FILE = path.resolve('data/sor/hold-tokens.json');
const [email, , accessToken] = TEST_ACCOUNT.split(':');
const TIMEOUT_MS = 120_000; // wait up to 2 min for a free seat

// ── Init ApiConfig ────────────────────────────────────────────────────────────
ApiConfig.init({
  wbk: {
    api: 'https://api.webook.com/api/v2',
    authApi: 'https://api.webook.com/api/v2',
    apiToken: 'e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2',
    appSource: 'rs',
    paymentApi: 'https://payments.webook.com/api/v2',
    ticketingDomain: 'https://webook.com',
    socketApi: 'https://realtime.webook.com',
    geoApi: 'https://geolocation.webook.com'
  },
  hy: { api: 'https://app.halayalla.com/api', apiToken: 'vQZe4VNDqYraFI815Us0ZTtmHC9AKRdtMhEkJi2DXfeHhn1P3550jUBFqX7GFbJO' },
  blog: { api: 'https://webook.com' },
  grecaptcha: { v3Key: '6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL' },
  cloudflarecaptcha: { VITE_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAAw0ci3Vi2Xv3txt' },
  cookie: { domain: 'webook.com' }
});
createCookie({ name: 'token', value: accessToken, domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' });
console.log('✓ Access token injected for', email);

const proxy = (() => {
  try {
    const lines = fs.readFileSync('data/sor/proxy.txt', 'utf-8').split('\n').filter(Boolean);
    return lines.length > 0 ? lines[0] : null;
  } catch { return null; }
})();
const agent = proxy ? new HttpsProxyAgent(proxy) : null;

// ── Get fresh hold token ──────────────────────────────────────────────────────
console.log('\n⏳ Getting fresh hold token...');
const eventDetails = JSON.parse(fs.readFileSync('data/sor/eventDetails.json'));
const eventData = eventDetails?.data || eventDetails;
const isSeason = process.env.IS_SEASON === 'true';
const body = { lang: 'ar' };
isSeason ? (body.season_id = eventData._id) : (body.event_id = eventData._id);

const holdRes = await fetchClient({
  url: `/event-detail/${eventData.slug}/hold-token?lang=en`,
  includeAuth: true, includeToken: true, raw: true,
  options: {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { cookie: process.env.PREPARE_TOKEN_COOKIE || '' },
    agent
  }
});
const holdJson = JSON.parse(await holdRes.text());
const holdToken = holdJson?.data?.token || holdJson?.token;
if (!holdToken) { console.error('❌ No hold token:', holdJson); process.exit(1); }
console.log('✓ Hold token:', holdToken);

const ht = JSON.parse(fs.readFileSync(HOLD_TOKENS_FILE, 'utf-8'));
ht[email] = [holdToken];
fs.writeFileSync(HOLD_TOKENS_FILE, JSON.stringify(ht, null, 2));

// ── Init utils ────────────────────────────────────────────────────────────────
await utilsMain({ ...process.env, SKIP_ESTABLISH_SOCKET_CONNECTIONS: 'true' });

// ── Establish socket connection ───────────────────────────────────────────────
console.log('\n⏳ Establishing socket connection...');
await establish_socket_connection(TEST_ACCOUNT, { holdToken });

let waited = 0;
while (!accountSockets.has(email) && waited < 10000) {
  await new Promise(r => setTimeout(r, 500));
  waited += 500;
}
if (!accountSockets.has(email)) { console.error('❌ Socket did not open'); process.exit(1); }
console.log('✓ Socket connected');

// ── Listen for real free seats + hold first one ───────────────────────────────
const socket = accountSockets.get(email);
let held = false;

console.log(`\n👀 Listening for free seats on the event (timeout: ${TIMEOUT_MS / 1000}s)...`);

const startWith = (process.env.START_WITH || '').split(',').filter(Boolean).map(s => s.toLowerCase());
const excludeBlocks = (process.env.EXCLUDE_BLOCKS || '').split(',').filter(Boolean).map(s => s.toLowerCase());
const excludeParents = (process.env.EXCLUDE_PARENTS || '').split(',').filter(Boolean).map(s => s.toLowerCase());

await new Promise((resolve) => {
  const timeoutId = setTimeout(() => {
    if (!held) {
      console.log('⏱️  Timeout — no free seat found within', TIMEOUT_MS / 1000, 'seconds.');
      resolve();
    }
  }, TIMEOUT_MS);

  socket.on('message', async (data) => {
    if (held) return;

    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (!msg.data) return;

    const seatLabel = msg.data.objects?.[0];
    const status = msg.data.status;
    if (!seatLabel || status !== 'free') return;

    // Apply filters from .env
    const [section, parent] = seatLabel.split('-');
    if (excludeBlocks.length > 0 && excludeBlocks.some(b => section?.toLowerCase().startsWith(b))) return;
    if (excludeParents.length > 0 && excludeParents.some(b => parent?.toLowerCase() === b)) return;
    if (startWith.length > 0 && !startWith.some(b => seatLabel.toLowerCase().startsWith(b))) return;

    held = true;
    clearTimeout(timeoutId);
    console.log(`\n🎯 Free seat found: ${seatLabel} — attempting hold...`);

    const item = { label: seatLabel, objectLabelOrUuid: seatLabel, quantity: 1, capacity: 0 };
    const [success, channelType] = await holdObject(TEST_ACCOUNT, proxy, item, null, false, 'hold-object', holdToken);

    if (success) {
      console.log(`✅ Held ${seatLabel} (channel: ${channelType})`);
      // sendToTelegram is called inside holdObject but NOT awaited — wait here
      console.log('⏳ Waiting 4s for Telegram to send...');
      await new Promise(r => setTimeout(r, 4000));
      console.log('✅ Telegram should be delivered.');
    } else {
      console.log(`⚠️  Hold failed for ${seatLabel}`);
    }
    resolve();
  });
});

console.log('\nDone.');
