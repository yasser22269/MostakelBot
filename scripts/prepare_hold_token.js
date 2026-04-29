import 'dotenv/config';
import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';


const DATA_DIR = process.env.DATA_DIR || 'data';
const PROXIES_FILE = path.join( DATA_DIR, 'sor', 'proxy.txt');
const PROXY_INDEX_FILE = path.join( DATA_DIR, "sor", "proxy_index.txt");
const HOLD_TOKENS_FILE = path.join( DATA_DIR, "sor", "hold-tokens.json");

const colors = {
  info: "\x1b[36m",
  success: "\x1b[32m",
  warning: "\x1b[33m",
  error: "\x1b[31m",
  reset: "\x1b[0m",
};

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

function getAccounts(accountsFile) {
  try {
    return fs.readFileSync(accountsFile, 'utf-8').split('\n').filter(Boolean);
  } catch (error) {
    log('error', `Could not read accounts file: ${accountsFile}`);
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

function getProxyIndex() {
  try {
    if (fs.existsSync(PROXY_INDEX_FILE)) {
      const index = parseInt(fs.readFileSync(PROXY_INDEX_FILE, "utf-8"));
      return isNaN(index) ? 0 : index;
    }
  } catch (error) {
    log("error", "Could not read proxy index file, starting from 0.");
  }
  return 0;
}

async function fetchHoldTokens() {
    const accountsFile = process.argv[2] || path.join(DATA_DIR, 'sor', 'acc.txt');
  console.log('fetching hold tokens for', accountsFile);
    const accounts = getAccounts(accountsFile);
  
    const proxies = getProxies();
    let holdTokens = {};
    holdTokens = JSON.parse(fs.readFileSync(HOLD_TOKENS_FILE));
    log("info", "Fetching hold tokens for all accounts...");
    let proxyIndex = getProxyIndex();

    const eventDetailsFilePath = path.join( DATA_DIR, 'sor', 'eventDetails.json');
    const eventDetails = JSON.parse(fs.readFileSync(eventDetailsFilePath));
    const eventData = eventDetails?.data || eventDetails;
    const eventId = eventData._id;
    const isSeason = process.env.IS_SEASON === 'true' ;


    const ticketsPerAccount = parseInt(process.env.TICKET_PER_ACCOUNT, 10) || 1;
    const maxThreads = 700;
    
    const tasks = [];
    for (const account of accounts) {
        // for (let i = 0; i < ticketsPerAccount; i++) {
            tasks.push(account);
        // }
    }

    log("info", `Processing ${tasks.length} tasks with ${maxThreads} threads...`);

    const queue = [...tasks];
    let startedCount = 0;

    async function runWorker(account, index) {
        return new Promise((resolve) => {
            const currentProxyIndex = (proxyIndex + index) % proxies.length;
            const proxy = proxies.length > 0 ? proxies[currentProxyIndex] : null;
            let worker;
            const timeout = setTimeout(() => {
                log('error', `Timeout getting hold token for ${account}`);
                if (worker) {
                    worker.terminate();
                }
                resolve();
            }, 45000);

            worker = new Worker('./src/bot/hold_token_worker.js', {
                workerData: {
                    account,
                    proxy,
                    eventId,
                    isSeason,
                },
            });

            worker.on("message", (message) => {
                clearTimeout(timeout);
                if (message.status === "success") {
                    const accountId = message.account.split(':')[0];
                    if (!holdTokens[accountId]) {
                        holdTokens[accountId] = [];
                    }
                    holdTokens[accountId] = [message.holdToken];
                } else {
                    const stacktrace = message.stacktrace ? `\n${message.stacktrace}` : '';
                    log("error", `Failed to get hold token for ${message.account.split(':')[0]}: ${message.error}${stacktrace}`);
                }
                resolve();
            });
            worker.on("error", (error) => {
                clearTimeout(timeout);
                const errMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                log("error", `Hold token worker error for account ${account.split(':')[0]}: ${errMsg}`);
                delete holdTokens[account.split(':')[0]];
                resolve();
            });
            worker.on("exit", (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    log("error", `Hold token worker for ${account.split(':')[0]} stopped with exit code ${code}`);
                }
                resolve();
            });
        });
    }

    const workerPromises = [];
    for (let i = 0; i < Math.min(maxThreads, tasks.length); i++) {
        workerPromises.push((async () => {
            while (queue.length > 0) {
                const account = queue.shift();
                const currentIndex = startedCount++;
                await runWorker(account, currentIndex);
                // Delay to prevent race conditions
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        })());
    }

    await Promise.all(workerPromises);
    fs.writeFileSync(HOLD_TOKENS_FILE, JSON.stringify(holdTokens, null, 2));
    
    // Save the next proxy index
    const newProxyIndex = (proxyIndex + tasks.length) % proxies.length;
    fs.writeFileSync(PROXY_INDEX_FILE, newProxyIndex.toString());

    log("success", "All hold tokens fetched and saved.");
}

fetchHoldTokens();
