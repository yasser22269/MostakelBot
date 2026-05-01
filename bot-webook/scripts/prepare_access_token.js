import fs from 'fs';
import { loginWithPassword } from '../src/lib/chunk-BFAWQTPE.js';
import { browserFetch } from '../src/utils/browser_fetch.js';
import { ApiConfig } from '../src/lib/chunk-LPIRJEMY.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

let __filename = '' //fileURLToPath(import.meta.url);
let  __dirname = '' //path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || 'data';
const ACCOUNTS_FILE = path.join(DATA_DIR, 'sor', 'acc.txt');
const ACCOUNTS_FILE2 = path.join(DATA_DIR, 'sor', 'acc_shift2.txt');
const PROXIES_FILE = path.join(DATA_DIR, 'sor', 'proxy.txt');

const colors = {
  info: "\x1b[36m",
  success: "\x1b[32m",
  warning: "\x1b[33m",
  error: "\x1b[31m",
  reset: "\x1b[0m",
};

let currentAccountsFile = '';
let currentUpdatedAccounts = [];

function log(level, ...args) {
  const options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  };
  const timestamp = new Date().toLocaleString(undefined, options);
  const color = colors[level] || colors.info;
  const message = args.map(arg => (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg).join(' ');
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

// Setup keypress listening
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key.name === 's') {
    if (currentAccountsFile && currentUpdatedAccounts.length > 0) {
      fs.writeFileSync(currentAccountsFile, currentUpdatedAccounts.join('\n'));
      log('success', `Manual save triggered: ${currentUpdatedAccounts.length} accounts saved to ${currentAccountsFile}`);
    } else {
      log('warning', 'Nothing to save yet.');
    }
  } else if (key.ctrl && key.name === 'c') {
    log('info', 'Exiting...');
    process.exit();
  }
});

function getAccounts(file) {
  try {
    return fs.readFileSync(file, 'utf-8').split('\n').filter(Boolean);
  } catch (error) {
    log('error', `Could not read accounts file: ${file}`);
    return [];
  }
}

function getProxies() {
    try {
        return fs.readFileSync(PROXIES_FILE, 'utf-8').split('\n').filter(Boolean);
    } catch (error) {
        log('error', `Could not read proxies file: ${PROXIES_FILE}`);
        return [];
    }
}

function hasEventQueryParam(rawUrl) {
  try {
    if (!rawUrl) return false;
    const parsed = new URL(rawUrl);
    return Boolean(parsed.searchParams.get('event'));
  } catch (error) {
    return false;
  }
}

function extractAccessTokenFromResponse(payload) {
  return payload?.user?.access_token
    || payload?.data?.access_token
    || payload?.access_token
    || payload?.data?.token
    || payload?.token
    || '';
}

async function processAccount(account, proxies, proxyIndex) {
  let [email, password, token] = account.split(':');

  if (!email || !password) {

    log('warning', `Skipping invalid account line: ${account}`);
    return { result: 'skip', account };
  }
  //remove the spaces
  password = password.trim();
  email = email.trim();
  // if (token) {
  //   return { result: 'has_token', account };
  // }
  const proxy = proxies.length > 0 ? proxies[proxyIndex % proxies.length] : null;
  const agent = proxy ? new HttpsProxyAgent(proxy) : null;
  const isAhlanByEnv = process.env.IS_AHLAN === 'true' || process.env.isAhlan === 'true';
  const isAhlanByPromptUrl = hasEventQueryParam(process.env.PROMPT_URL || '');
  const isAhlan = isAhlanByEnv || isAhlanByPromptUrl;
  try {
    log('info', 'Attempting to get token for', email, (proxy ? `with proxy: ${proxy}` : ''));
    let accessToken = '';
    if (isAhlan) {
      const loginUrl = 'https://www.ahlan.sa/api/auth/login';
      const loginHeaders = {
        'content-type': 'application/json',
        ...(process.env.USER_AGENT ? { 'user-agent': process.env.USER_AGENT } : {})
      };
      const loginBody = { email, password };

      let response;
      if (process.env.USE_BROWSER_FOR_AHLAN === 'true') {
        log('info', 'Attempting Ahlan login via browser service for', email);
        response = await browserFetch(loginUrl, {
          method: 'POST',
          headers: loginHeaders,
          body: loginBody
        });
      } else {
        response = await fetch(loginUrl, {
          method: 'POST',
          headers: loginHeaders,
          body: JSON.stringify(loginBody),
          agent
        });
      }

      const responseText = await response.text();
      let loginResponse;
      try {
        loginResponse = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Ahlan login returned non-JSON response (status ${response.status})`);
      }
      if (!response.ok) {
        throw new Error(`Ahlan login failed with status ${response.status}: ${responseText.slice(0, 300)}`);
      }
      accessToken = extractAccessTokenFromResponse(loginResponse);
    } else {
      const loginResponse = await loginWithPassword({ email, password, locale: 'en', agent });
      accessToken = extractAccessTokenFromResponse(loginResponse);
    }
    if (accessToken) {
      log('success', 'Successfully retrieved token for', email);
      return { result: 'success', account: `${email}:${password}:${accessToken}` };
    } else {
      log('warning', 'Failed to retrieve token for', email, '. Keeping original format. and the accouunt added to failedPrepare.txt');
      fs.appendFileSync(path.join(DATA_DIR, 'sor', 'failedPrepare.txt'), `${account}\n`);
      return { result: 'fail', account };
    }
  } catch (error) {
    log('error', 'Error logging in for', email, ':', error.message, 'and the account added to failedPrepare.txt');
    fs.appendFileSync(path.join(DATA_DIR, 'sor', 'failedPrepare.txt'), `${account}\n`);
    return { result: 'fail', account };
  }
}

async function processFile(accountsFile) {
  currentAccountsFile = accountsFile;
  const accounts = getAccounts(accountsFile);
  const proxies = getProxies();
  const updatedAccounts = [];
  currentUpdatedAccounts = updatedAccounts;
  let proxyIndex = 0;
  const concurrency = 300;
  let i = 0;
  while (i < accounts.length) {
    const batch = accounts.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((account, idx) => processAccount(account, proxies, proxyIndex + idx))
    );
    for (const res of results) {
      if (res.result === 'success' || res.result === 'has_token') {
        updatedAccounts.push(res.account);
      }
      // skip and fail are not added to updatedAccounts
    }
    proxyIndex += batch.length;
    i += concurrency;
  }
  fs.writeFileSync(accountsFile, updatedAccounts.join('\n'));
  log('info', `Finished preparing access tokens for ${accountsFile}. The file has been updated.`);
}

async function prepareTokens() {
  ApiConfig.init({
    wbk: {
        api: "https://api.webook.com/api/v2",
        authApi: "https://api.webook.com/api/v2",
        apiToken: "e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2",
        appSource: "rs",
        paymentApi: "https://payments.webook.com/api/v2",
        ticketingDomain: "https://webook.com",
        socketApi: "https://realtime.webook.com",
        geoApi: "https://geolocation.webook.com"
    },
    hy: {
        api: "https://app.halayalla.com/api",
        apiToken: "vQZe4VNDqYraFI815Us0ZTtmHC9AKRdtMhEkJi2DXfeHhn1P3550jUBFqX7GFbJO"
    },
    blog: {
        api: "https://webook.com"
    },
    grecaptcha: {
        v3Key: "6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL"
    },
    cookie: {
        domain: "webook.com"
    }
  });

  if (process.argv[2] === '--use-all') {
    await processFile(ACCOUNTS_FILE);
    await processFile(ACCOUNTS_FILE2);
  } else {
    await processFile(ACCOUNTS_FILE);
  }
}

prepareTokens().then(() => {
    process.exit(0);
});
