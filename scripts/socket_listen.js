import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { startWorker,sendToTelegram, getAccounts, getProxies, holdObject, log, main as utilsMain, getObjectStatusesFromFS, update, freeSeats as getFreeSeats ,refreshHeldObjects} from '../src/utils/utils.js';
import { listenToSeats , establish_socket_connection,accountSockets} from '../src/bot/socket_book.js';
import { exec } from 'child_process';
import { FILE_PATHS,solveV3Wrapper} from '../src/utils/config.js';
import WebSocket ,{WebSocketServer} from 'ws';
import { getAllHeldObjects, removeHeldObject } from '../src/bot/heldObjects.js';
import { main } from '../src/utils/FirstLaunch.js';
import readline from 'readline';
import fetch from 'node-fetch';

const shift1AccountsFile = FILE_PATHS.ACCOUNTS_FILE;
const shift2AccountsFile = FILE_PATHS.SHIFT2_ACCOUNTS_FILE;
const tokenStatusesPath = FILE_PATHS.TOKEN_STATUSES_FILE;
const inFlightTransfers = new Set();
let shift1AccountIndex = 0;
let shift2AccountIndex = 0;

function getNextTargetAccount(currentEmail) {
  const shift1Accounts = getAccounts(shift1AccountsFile);
  const shift2Accounts = getAccounts(shift2AccountsFile);

  const isInShift1 = shift1Accounts.some(a => a.split(':')[0] === currentEmail);
  const targetAccounts = isInShift1 ? shift2Accounts : shift1Accounts;

  if (targetAccounts.length === 0) return null;

  const currentHeldObjects = getAllHeldObjects();
  const activeCandidates = [];

  // Find all target accounts with active sockets and calculate their held object counts
  for (const account of targetAccounts) {
    const email = account.split(':')[0];
    if (accountSockets.has(email)) {
      const tokens = holdTokens[email] || [];
      let heldCount = 0;
      for (const tokenItem of tokens) {
        const token = typeof tokenItem === 'object' ? tokenItem.token : tokenItem;
        if (currentHeldObjects[token]) {
          heldCount += currentHeldObjects[token].length;
        }
      }
      activeCandidates.push({ account, email, heldCount });
    }
  }

  if (activeCandidates.length === 0) return null;

  // Find the minimum held count among active accounts
  const minHeld = Math.min(...activeCandidates.map(c => c.heldCount));
  const bestCandidates = activeCandidates.filter(c => c.heldCount === minHeld);

  // From the best candidates, pick one using rotation to avoid always picking the same one
  if (isInShift1) {
    const selected = bestCandidates[shift2AccountIndex % bestCandidates.length].account;
    shift2AccountIndex++;
    return selected;
  } else {
    const selected = bestCandidates[shift1AccountIndex % bestCandidates.length].account;
    shift1AccountIndex++;
    return selected;
  }
}

async function disconnectAllExcept(allowedEmails) {
  for (const [email, socket] of accountSockets.entries()) {
    if (!allowedEmails.includes(email)) {
      log('info', `Closing inactive socket for ${email} during transfer`);
      // remove all listeners
      socket.removeAllListeners('open');
      socket.removeAllListeners('message');
      socket.removeAllListeners('close');
      socket.removeAllListeners('error');
      socket.terminate();
      accountSockets.delete(email);
    }
  }
}

async function reconnectAll() {
  log('info', 'Reconnecting all sockets after transfers...');
  const shift1 = getAccounts(shift1AccountsFile);
  await establishHoldingConnections(shift1, eventKey);
  if (isDualHolding) {
    const shift2 = getAccounts(shift2AccountsFile);
    await establishHoldingConnections(shift2, eventKey);
  }
}

async function transferAllHeldObjectsManually() {
    try {
        const tokensFile = FILE_PATHS.HOLD_TOKENS_FILE;
        if (!fs.existsSync(tokensFile)) return;
        const tokensData = JSON.parse(fs.readFileSync(tokensFile, 'utf-8'));

        const heldObjectsFile = FILE_PATHS.HELD_OBJECTS_FILE;
        const heldObjects = fs.existsSync(heldObjectsFile) ? JSON.parse(fs.readFileSync(heldObjectsFile, 'utf-8')) : {};

        log('info', 'Starting manual transfer of all held objects...');

        const transferQueue = [];
        for (const email in tokensData) {
            const tokenList = tokensData[email];
            if (!Array.isArray(tokenList)) continue;

            for (const tokenItem of tokenList) {
                const token = typeof tokenItem === 'object' ? tokenItem.token : tokenItem;
                const objectsToTransfer = heldObjects[token] || [];
                for (const obj of objectsToTransfer) {
                  transferQueue.push({ email, token, obj });
                }
            }
        }

        for (const { email, token, obj } of transferQueue) {
            if (inFlightTransfers.has(obj.objectId)) continue;

            // Step by step: Disconnect others
            //await disconnectAllExcept([email]);

            // Source account must have an active socket (will be established by disconnectAllExcept if it was already there, but we ensure it here)
            if (!accountSockets.has(email)) {
                log('warning', `Re-establishing source socket for ${email}`);
                const fullAccount = getAccounts(shift1AccountsFile, shift2AccountsFile).find(a => a.split(':')[0] === email);
                if (fullAccount) {
                  await establishHoldingConnections([fullAccount], eventKey);
                }
            }

            if (!accountSockets.has(email)) {
                log('error', `Manual transfer failed: Missing socket connection for source ${email}. skipping.`);
                continue;
            }

            const targetAccount = getNextTargetAccount(email);
            if (!targetAccount) {
                log('error', 'No target accounts with active sockets available for manual transfer');
                continue;
            }

            const targetEmail = targetAccount.split(':')[0];
            const targetTokenList = holdTokens[targetEmail];
            if (!targetTokenList || targetTokenList.length === 0) {
                log('error', `No hold token for target account ${targetEmail}`);
                continue;
            }
            const tokenItemTarget = targetTokenList[targetTokenList.length - 1];
            const newToken = typeof tokenItemTarget === 'object' ? tokenItemTarget.token : tokenItemTarget;

            inFlightTransfers.add(obj.objectId);
            log('info', `Manually transferring object ${obj.objectId} from ${email} to ${targetEmail}`);

            const allAccounts = getAccounts(shift1AccountsFile, shift2AccountsFile);
            const oldAccount = allAccounts.find(a => a.split(':')[0] === email) || `${token}:synthetic:synthetic`;

            try {
              transferObject(obj.objectId, token, newToken, oldAccount, targetAccount);
            } finally {
              inFlightTransfers.delete(obj.objectId);
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await reconnectAll();
    } catch (err) {
        log('error', `Error in manual transfer: ${err.message}`);
    }
}

async function fetchAllTokenStatuses() {
  try {
    const tokensFile = FILE_PATHS.HOLD_TOKENS_FILE;
    if (!fs.existsSync(tokensFile)) return;

    const tokensData = JSON.parse(fs.readFileSync(tokensFile, 'utf-8'));
    const statuses = {};
    const proxyDetails = proxies.length > 0 ? proxies[Math.floor(Math.random() * proxies.length)] : null;
    const agent = process.env.USE_PROXY_FOR_HOLD === 'true' && proxyDetails ? new HttpsProxyAgent(proxyDetails) : null;

    const fetchPromises = [];

    for (const email in tokensData) {
      const tokenList = tokensData[email];
      if (!Array.isArray(tokenList)) continue;

      for (const tokenItem of tokenList) {
        const token = typeof tokenItem === 'object' ? tokenItem.token : tokenItem;
        const tracingId = `${Date.now()}-${generateTracingSuffix()}`;
        const url = `https://api.seatcloud.com/api/v2/token/${token}?trace_id=${tracingId}`;

        fetchPromises.push(
          fetch(url, { agent })
            .then(res => res.json())
            .then(data => {
              statuses[token] = data;
            })
            .catch(err => {
              log('error', `Failed to fetch status for token ${token}: ${err.message}`);
            })
        );
      }
    }

    await Promise.allSettled(fetchPromises);
    fs.writeFileSync(tokenStatusesPath, JSON.stringify(statuses, null, 2));
  } catch (err) {
    log('error', `Error in fetchAllTokenStatuses: ${err.message}`);
  }
}

async function checkTokenStatus() {
  try {
    if (!fs.existsSync(tokenStatusesPath)) return;
    const statuses = JSON.parse(fs.readFileSync(tokenStatusesPath, 'utf-8'));

    const tokensFile = FILE_PATHS.HOLD_TOKENS_FILE;
    if (!fs.existsSync(tokensFile)) return;
    const tokensData = JSON.parse(fs.readFileSync(tokensFile, 'utf-8'));

    const heldObjectsFile = FILE_PATHS.HELD_OBJECTS_FILE;
    const heldObjects = fs.existsSync(heldObjectsFile) ? JSON.parse(fs.readFileSync(heldObjectsFile, 'utf-8')) : {};

    const transferQueue = [];
    for (const email in tokensData) {
      const tokenList = tokensData[email];
      if (!Array.isArray(tokenList)) continue;

      for (const tokenItem of tokenList) {
        const token = typeof tokenItem === 'object' ? tokenItem.token : tokenItem;
        const data = statuses[token];

        if (data && data.ttl && data.ttl <= 120) {
          log('warning', `Token ${token} (TTL: ${data.ttl}) is expiring soon (<= 2 min). Queueing transfer.`);
          const objectsToTransfer = heldObjects[token] || [];
          for (const obj of objectsToTransfer) {
            transferQueue.push({ email, token, obj });
          }
        }
      }
    }

    if (transferQueue.length === 0) return;

    for (const { email, token, obj } of transferQueue) {
      if (inFlightTransfers.has(obj.objectId)) continue;

      // Disconnect others
      //await disconnectAllExcept([email]);

      // Ensure source socket
      if (!accountSockets.has(email)) {
        log('warning', `Re-establishing source socket for ${email} during TTL transfer`);
        const fullAccount = getAccounts(shift1AccountsFile, shift2AccountsFile).find(a => a.split(':')[0] === email);
        if (fullAccount) {
          await establishHoldingConnections([fullAccount], eventKey);
        }
      }

      if (!accountSockets.has(email)) {
        log('error', `Transfer failed: Missing socket connection for source ${email}. skipping.`);
        continue;
      }

      const targetAccount = getNextTargetAccount(email);
      if (!targetAccount) {
        log('error', 'No target accounts with active sockets available for transfer');
        continue;
      }

      const targetEmail = targetAccount.split(':')[0];
      const targetTokenList = holdTokens[targetEmail];
      if (!targetTokenList || targetTokenList.length === 0) {
        log('error', `No hold token for target account ${targetEmail}`);
        continue;
      }
      const tokenItemTarget = targetTokenList[targetTokenList.length - 1];
      const newToken = typeof tokenItemTarget === 'object' ? tokenItemTarget.token : tokenItemTarget;

      inFlightTransfers.add(obj.objectId);
      log('info', `Transferring expiring object ${obj.objectId} from ${email} to ${targetEmail}`);

      const allAccounts = getAccounts(shift1AccountsFile, shift2AccountsFile);
      const oldAccount = allAccounts.find(a => a.split(':')[0] === email) || `${token}:synthetic:synthetic`;

      try {
         transferObject(obj.objectId, token, newToken, oldAccount, targetAccount);
      } finally {
        inFlightTransfers.delete(obj.objectId);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await reconnectAll();
  } catch (err) {
    log('error', `Error in checkTokenStatus loop: ${err.message}`);
  }
}


const isDualHolding = process.env.DUAL_HOLDING_FOR_LISTENER === 'true';
function generateTracingSuffix() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    // First character must be a letter (like 'h' in the example)
    result += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    // Remaining 10 characters can be alphanumeric
    for (let i = 0; i < 10; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

function buildHoldUrl(eventKey, holdToken, reCaptchaToken) {

  const teamId = publishedDetails?.teamId || publishedDetails?.team_id;
  const tracing_id = `${Date.now()}-${generateTracingSuffix()}`;
  return `wss://api.seatcloud.com:8443/?event=${eventKey}&token=${holdToken}&teamID=${teamId}&reCaptchaToken=${reCaptchaToken}&tracingId=${tracing_id}`;
}

const startWith = process.env.START_WITH.split(',').filter(Boolean).map((x) => x.toLowerCase());
let exclude_blocks = process.env.EXCLUDE_BLOCKS.split(',').filter(Boolean);
exclude_blocks = exclude_blocks.map((x) => x.toLowerCase());
let exclude_parents = process.env.EXCLUDE_PARENTS.split(',').filter(Boolean);
exclude_parents = exclude_parents.map((x) => x.toLowerCase());
//sendToTelegram('hello');

export let accountsShiftedForBooking = {status:false};
let accounts;
let proxies;
let eventDetails;
let renderingInfo = null;
let currentAccountFile =shift1AccountsFile; // Start with the first account file
let publishedDetails;
let accountIndex = 0;
let proxyIndex = 0;
let holdTokens = {};
let fetchHoldTokens = true;
let botVersion;
const releasedObjects = [];
let seatListener = null; // Declare seatListener here
const ensureJSONFile = (filePath, defaultValue) => {
  if (!fs.existsSync(filePath)) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(filePath));
  } catch (e) {
    return defaultValue;
  }
};

const defaultEventDetails = { 
  data: { 
    _id: "", 
    slug: "", 
    away_team: { _id: "" }, 
    home_team: { _id: "" }, 
    channel_keys: {}, 
    seats_io: { chart_key: "", event_key: "", season_key: "" }, 
    event_tickets: [] 
  } 
};

eventDetails = ensureJSONFile(FILE_PATHS.EVENT_DETAILS_FILE, defaultEventDetails);
const eventData = eventDetails?.data || eventDetails;
renderingInfo = ensureJSONFile(FILE_PATHS.RENDERING_INFO_FILE, { channels: [], allocations: [] });
publishedDetails = ensureJSONFile(FILE_PATHS.PUBLISHED_DETAILS_FILE, {});
//log('warning','publishedDetails is:',publishedDetails);

botVersion = process.env.BOT_VERSION;
const eventKeyFromPrompt = process.env.PROMPT_URL.split('/')[5];
const isSeason = process.env.IS_SEASON === 'true' ;
const eventKeyv2 = isSeason ? eventData.seats_io.season_key : eventData.seats_io.event_key;
const eventKey = botVersion == 'v2' || botVersion == 'v3' ? eventKeyv2 : renderingInfo?.seasonStructure?.topLevelSeasonKey;
log('warning','eventKey is:',eventKey);
// Function to dynamically get the preferred account for the listener
const getListenerPreferredAccount = () => {
  // this should return  an current accounts that is exist in accountSockets
  const accountsForListener = getAccounts(currentAccountFile);
  if (accountsForListener.length > 0) {
    for (const account of accountsForListener) {
      if (accountSockets.has(account.split(':')[0])) {
        return account;
      }
    }

  }
  return null;
};


async function runFirstLaunchInTheListener(){
//    setTimeout(async() => {
//    setInterval(async () => {
//      if(process.env.RUN_FIRST_LAUNCH_IN_THE_LISTENER === 'true'){
//
//        try{
//          await main(false,currentAccountFile);
//        }catch(e){
//          console.log('error in main',e);
//        }
//
//      }
//    },5 * 1000);
//  }, 60 * 1000);

  while(true){
      try{
        if(process.env.RUN_FIRST_LAUNCH_IN_THE_LISTENER === 'true') {
            await main(false,currentAccountFile);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }catch(e){
        console.log('error in main',e);
      }
      //await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
async function askTheUser(){
    if (true) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        } else if (key.name === 't') {
            log('warning', 'Manual transfer triggered by user ("t" key)');
            transferAllHeldObjectsManually();
        }
    });

   // const answer = await new Promise(resolve => {
   //   rl.question('Do you want to empty previous hold data? (yes/no): ', resolve);
   // });
   // rl.close();
      const answer = 'yes';
    if (answer.toLowerCase() === 'yes') {
      try {
        fs.writeFileSync(FILE_PATHS.HOLD_TOKENS_FILE, '{}');
        console.log(`Emptied ${FILE_PATHS.HOLD_TOKENS_FILE}`);
      } catch (e) {
        console.log(`Error emptying ${FILE_PATHS.HOLD_TOKENS_FILE}`);
      }
      try {
        fs.writeFileSync(FILE_PATHS.HELD_OBJECTS_FILE, '{}');
        console.log(`Emptied ${FILE_PATHS.HELD_OBJECTS_FILE}`);
      } catch (e) {
        console.log(`Error emptying ${FILE_PATHS.HELD_OBJECTS_FILE}`);
      }
    }else{
      fetchHoldTokens = false;
    }
  }
}
function readHoldTokens() {
  holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));
}
function wouldCreateOrphan(seatLabel, heldObjects) {
  const parts = seatLabel.split('-');
  if (parts.length < 3) return false;
  const seatNum = parseInt(parts[parts.length - 1]);
  if (isNaN(seatNum)) return false;
  const prefix = parts.slice(0, parts.length - 1).join('-'); // e.g. "68-H"

  const allHeldIds = new Set();
  for (const token in heldObjects) {
    for (const obj of heldObjects[token]) {
      allHeldIds.add(obj.objectId || obj);
    }
  }

  const lbl = (n) => `${prefix}-${n}`;
  // holding seatNum would orphan seatNum-1 if seatNum-2 is held and seatNum-1 is free
  if (seatNum >= 3 && allHeldIds.has(lbl(seatNum - 2)) && !allHeldIds.has(lbl(seatNum - 1))) return true;
  // holding seatNum would orphan seatNum+1 if seatNum+2 is held and seatNum+1 is free
  if (allHeldIds.has(lbl(seatNum + 2)) && !allHeldIds.has(lbl(seatNum + 1))) return true;
  return false;
}

async function processFreeSeat(item) {
  try {

if (releasedObjects.includes(item.objectLabelOrUuid || item.label)) {
    log('info', `Skipping object ${item.objectLabelOrUuid || item.label} because it was released.`);
    return;
  }
    const accountsForHolding = getAccounts(currentAccountFile);
    if (accountsForHolding.length === 0) {
      log('warning', `No accounts found in ${currentAccountFile}, cannot hold seat.`);
      return;
    }

    let originalAccountIndex = accountIndex;
    let accountFound = false;
    let account;

    let holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));
    // Loop to find an account that exists in accountSockets
    // for (let i = originalAccountIndex; i < accountsForHolding.length; i++) {
      account = accountsForHolding[accountIndex];
      //not needed for now

      while(!holdTokens[account.split(':')[0]]) {
        accountIndex = (accountIndex + 1) % accountsForHolding.length;
        account = accountsForHolding[accountIndex];
      }
      const tokenItem = holdTokens[account.split(':')[0]][holdTokens[account.split(':')[0]].length - 1];
      const holdToken = typeof tokenItem === 'object' ? tokenItem.token : tokenItem;
      accountIndex = (originalAccountIndex + 1) % accountsForHolding.length;
      // }


    //to get a static proxy for each account
    //proxyIndex = (proxyIndex + 1) % proxies.length;
    proxyIndex = accountIndex;
    //console.log('got seat',item.objectLabelOrUuid || item.label);
    let quantity = 1;
    if (item.capacity > 0) {
      quantity = item.quantity;
    }

    // log('info', `Found free seat. Using account file: ${currentAccountFile}`, item);

    // The account is guaranteed to be found at this point
    const proxy = proxies.length > 0 ? proxies[proxyIndex] : null;
    const objinfo = `${account.split(':')[0]}:${account.split(':')[1]} ${item.objectLabelOrUuid} ${item.eventKey}\n`;

    const currentHeldObjects = getAllHeldObjects();
    if (wouldCreateOrphan(item.objectLabelOrUuid || item.label, currentHeldObjects)) {
      log('warning', `Skipping ${item.objectLabelOrUuid || item.label} — would leave an orphan seat`);
      return;
    }

    const [holdSuccessful] = await holdObject(account, proxy, item, null,false,'hold-object',holdToken);

    if (holdSuccessful) {
      //fs.appendFileSync(path.join(DATA_DIR, 'hold_successful.txt'), objinfo);
      // sendToTelegram is already called inside holdObject in utils.js

      const [home, away] = await getObjectStatusesFromFS();
      let objectStatuses = process.env.FORCE_CHANNEL_TYPE == 'home' ? home : away;
      if (objectStatuses && process.env.SKIP_PAYMENT !== 'true') {
        await startWorker(account, proxy, [{ ...item }], objectStatuses);
      }
    } else {
      console.log('the holding failed');
    }
  } catch (error) {
    console.log('an error while trying to hold the object from the processFreeSeat function',error);


  }
}

async function handleSeat(message) {
  // console.log('got message',message);

  try {
    const dataReceived = JSON.parse(message.data);
//    console.log('got data',dataReceived);
//    console.log('got message',dataReceived[0].message);
    let data = [];
    if (botVersion == 'v2' || botVersion == 'v3') {
      data = dataReceived;
    }else{
        for (const item of dataReceived) {
          data.push(item.message.body);
      }
    }
    
    for (const item of data) {
      if (item.status === 'free') {
        const [section,parent,own] = item.objectLabelOrUuid.split("-");
        if (exclude_blocks.length > 0 && exclude_blocks.some((block) => section.toLowerCase().startsWith(block.toLowerCase()))) {
          continue;
        }
        if (exclude_parents.length > 0 && exclude_parents.some((block) => parent.toLowerCase() == block.toLowerCase())) {
          continue;
        }
        if (startWith.length > 0 && !startWith.some((block) => item.objectLabelOrUuid.toLowerCase().startsWith(block.toLowerCase()))) {
          continue;
        }
        processFreeSeat(item);
      }
    }
  } catch (e) {
    console.error('Could not decrypt message:', e);
  }
}



async function establishHoldingConnections(accountsToConnect) {
  const establishingPromises = accountsToConnect.filter(Boolean).map(async (account) => {
    try {
      await establish_socket_connection(account);
    } catch (error) {
      log('error', `Failed to establish holding connection for ${account.split(':')[0]}: ${error}`);
    }
  });
  await Promise.allSettled(establishingPromises);
}

function fetchHoldTokensFor(accountFile, eventKey) {
  console.log('starting fetching tokens for', accountFile);

  return new Promise((resolve, reject) => {
    const command = fetchHoldTokens? `node scripts/prepare_hold_token.js ${accountFile}`:'echo "skipping prepare_hold_token.js"';
    fetchHoldTokens = true;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing prepare_hold_token.js for ${accountFile}: ${error}`);
        return reject(error);
      }
      console.log(`stdout for ${accountFile}: ${stdout}`);
      console.error(`stderr for ${accountFile}: ${stderr}`);
      const newAccounts = getAccounts(accountFile);
      if (botVersion === 'v2' ||  botVersion === 'v3') {
        establishHoldingConnections(newAccounts);
        setTimeout(() => {
          if (seatListener) seatListener.refreshConnection();
          // make it 40 seconds
        }, 40 * 1000);
      }
      resolve();

      readHoldTokens();
    });
  });
}
  async function transferObject(objectId, oldToken, newToken,oldAccount,newAccount) {
    try {
      // if the old token provided but the old account is not provided get it from the holdTokens

      readHoldTokens();
      if (oldToken && !oldAccount) {
        const oldEmail = Object.keys(holdTokens).find(e => holdTokens[e] && holdTokens[e].includes(oldToken));
        if (!oldEmail) {
          log('warning', `No email found for token ${oldToken} in hold-tokens.json. Using synthetic account.`);
          oldAccount = `${oldToken}:anything:accessTokenanything`;
        } else {
          const fullAccount = getAccounts(shift1AccountsFile, shift2AccountsFile).find(a => a.split(':')[0] === oldEmail);
          if (!fullAccount) {
            log('warning', `Full account not found for email ${oldEmail}. Using synthetic account.`);
            oldAccount = `${oldEmail}:anything:accessTokenanything`;
          } else {
            oldAccount = fullAccount;
          }
        }
      }
      // if the new token provided but the new account is not provided make a socket connection and pass it
      if (newToken && !newAccount ) {
        log('warning', 'new token provided but new account not provided');
        newAccount = newToken + ':anything' + ':accessTokenanything';
        if(botVersion == 'v2' || botVersion == 'v3') {
            if(!accountSockets.has(newAccount.split(':')[0])) {
                await establish_socket_connection(newAccount, { holdToken: newToken });
                log('info', ' 🚀 Established socket connection for new account:',newAccount);
            }
        }
      }
      log('info', 'now releasing object',objectId,'from',oldAccount.split(':')[0],'to',newAccount.split(':')[0]);
      // if the new
        const proxy = process.env.USE_PROXY_FOR_HOLD === 'true' ? proxies[Math.floor(Math.random() * proxies.length)] : null;
      // const oldAccount = null;
      // const newAccount = null;

      // Run both hold operations and wait for completion
      const results = await Promise.allSettled([
         holdObject(oldAccount, proxy, {
          label: objectId,
          objectLabelOrUuid: objectId
        }, null, false, 'free-object', oldToken),

        //wait 4 miliseconds (the original code comment said wait 0.005ms, but it didn't actually wait in the code, I will use a small delay if needed but sequential wait is safer)
        new Promise(resolve => setTimeout(resolve, 5)).then(() =>
           holdObject(newAccount, proxy, {
          label: objectId,
          objectLabelOrUuid: objectId
        }, null, false, "hold-object", newToken,1,true)
        )
      ]);

      const [releaseResult, holdResult] = results;
      if (releaseResult.status === 'fulfilled' && holdResult.status === 'fulfilled') {
        const holdSuccessful = holdResult.value[0];
        if (holdSuccessful) {
          log('info', `Successfully transferred ${objectId}`);
          return true;
        }
      }
      log('error', `Transfer of ${objectId} failed or partially failed`);
      return false;
    } catch (error) {
      console.error('Error transferring object:', error);
      return false;
    }
  }

  async function transferHeldObjects(oldAccountFile =null, newAccountFile) {
    try {
      const newAccounts = getAccounts(newAccountFile);
      if (newAccounts.length === 0) {
        log('warning', `No new accounts in ${newAccountFile}, skipping transfer`);
        return;
      }

      const heldObjects = JSON.parse(fs.readFileSync(FILE_PATHS.HELD_OBJECTS_FILE));

      // Collect all held objects
      const allHeldObjs = [];
      for (const token in heldObjects) {
        if (heldObjects[token]) {
          allHeldObjs.push(...heldObjects[token]);
        }
      }

      const uniqueObjs = [...new Set(allHeldObjs.map(o => o.objectId))];
      if (uniqueObjs.length === 0) {
        log('info', 'No held objects to transfer');
        return;
      }

      log('info', `Transferring ${uniqueObjs.length} held objects to ${newAccountFile}`);
      const numNew = newAccounts.length;

      // Release from current holders
      let i = 0;
      const transferPromises = [];
        // Get all accounts to find the full account string
        const allAccounts = getAccounts(currentAccountFile);
      for (const obj of uniqueObjs) {

        // Find token holding this obj
        let holdingToken = null;
        for (const token in heldObjects) {
          if (heldObjects[token] && heldObjects[token].some(o => o.objectId === obj)) {
            holdingToken = token;
            break;
          }
        }
        if (!holdingToken) continue;

        // Find account
        const email = Object.keys(holdTokens).find(e => holdTokens[e] && holdTokens[e].includes(holdingToken));
        if (!email) continue;

        const fullAccount = allAccounts.find(a => a.split(':')[0] === email);
        if (!fullAccount) continue;

        log('info', `Releasing ${obj} from ${fullAccount.split(':')[0]}`);
        const account = newAccounts[i % numNew];
        i++;
        const holdTokenForNewAccount = holdTokens[account.split(':')[0]][holdTokens[account.split(':')[0]].length - 1];
        //transferPromises.push(transferObject(obj,holdingToken,holdTokenForNewAccount,fullAccount,account));
        transferObject(obj,holdingToken,holdTokenForNewAccount,fullAccount,account);
      }

      // Wait for all transfers to complete in parallel
      //await Promise.allSettled(transferPromises);
    } catch (error) {
      log('error', 'Error transferring held objects:', error);
    }
  }

  async function switchAccountFile() {
    const oldAccountFile = currentAccountFile;
    if (currentAccountFile === shift1AccountsFile) {
      if (isDualHolding) {
        //warning
        log('warning', 'Switching to shift2');
        currentAccountFile = shift2AccountsFile;
      } else {
      }
    } else {
      currentAccountFile = shift1AccountsFile;
    }

    // Transfer held objects
    if (isDualHolding && process.env.TRANSFER_HELD_OBJECTS === 'true') {
      await transferHeldObjects(oldAccountFile, currentAccountFile);
    }

    log('warning', `Switching to ${currentAccountFile}`);
  }
(async () => {

  await askTheUser()

  setInterval(refreshHeldObjects, 6000);
  refreshHeldObjects();

  await utilsMain({...process.env,SKIP_ESTABLISH_SOCKET_CONNECTIONS: 'true'});
  proxies = getProxies();

  readHoldTokens();
  await fetchHoldTokensFor(shift1AccountsFile, eventKey);
  readHoldTokens();

  // Start token monitoring loop
  setInterval(async () => {
    await fetchAllTokenStatuses();
    checkTokenStatus();
  }, 10000);

  // Initial fetch for shift1 only
  fetchAllTokenStatuses().then(() => checkTokenStatus());



  // Establish socket connections for shift2 accounts after 1 minute (for testing)
  setTimeout(async () => {
    if (isDualHolding) {
      log('info', 'Establishing socket connections for shift2 accounts (1st minute)...');
      await fetchHoldTokensFor(shift2AccountsFile, eventKey);
      readHoldTokens();
    }
  //}, 5 * 60 * 1000);
  }, 0 * 60 * 1000);


  if(process.env.RUN_FIRST_LAUNCH_IN_THE_LISTENER === 'true'){
    if(process.env.BOT_VERSION == 'v2'){
      //wait 30 seconds
      setTimeout( () => {
       runFirstLaunchInTheListener();
      }, 30 * 1000);
    }else{
    runFirstLaunchInTheListener();
    }
  }
  // Initial hold token fetch and connection establishment

  if (isDualHolding){
    // Removed old fetchHoldTokensFor shift2 timeout
  }
  if (botVersion == 'v1') {
    log('warning','establishing socket connection using messaging-eu.seatsio.net for v1 bot');
    try{
          // Connect to messaging-eu.seatsio.net WebSocket
          const ws = new WebSocket('wss://messaging-eu.seatsio.net/ws');
      //wss://messaging-eu.seatsio.net/ws
          
          ws.on('open', () => {
            log('info','WebSocket connection established to messaging-eu.seatsio.net');
            
            // Send subscription message
            const subscribeMessage = {
              type: 'SUBSCRIBE',
              data: {
                channel: `3d443a0c-83b8-4a11-8c57-3db9d116ef76-${eventKey}`
              }
            };
            
            ws.send(JSON.stringify(subscribeMessage));
            log('info','Subscription message sent for channel:', subscribeMessage.data.channel);
          });
          
          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            
            // Handle PING messages by responding with PONG
            if (message[0].type === 'PING') {
              ws.send(JSON.stringify({ type: 'PONG' }));
              return;
            }
            
            // Handle incoming messages using the existing handleSeat function
            handleSeat({ data: data.toString() });
          });
          
          ws.on('error', (error) => {
            log('error','WebSocket error:', error);
          });
          
          ws.on('close', () => {
            log('warning','WebSocket connection closed, attempting to reconnect...');
            // Reconnect logic could be added here if needed
          });
          
    }catch(e){
        console.log('error establishing WebSocket connection',e);
      }
  } else {
    const allAccounts = getAccounts(shift1AccountsFile); // Use only the first file for the listener
    holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));
    const websiteURL = 'https://chart.seatcloud.com';
    const websiteKey = '6Lf7x-8qAAAAACTG6gffMEWoXQoQhKS6UWTkG9cD';

    // Establish the primary listener connection
    // wait 50 seconds 
    let listenerAccount = null;
    while (listenerAccount == null) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('current accountSockets keys are ',accountSockets.keys());
      // log the current emails and account file 

      listenerAccount = getListenerPreferredAccount(); // Use the dynamic function
    }
    if (listenerAccount) {
      const listenerHoldToken = holdTokens[listenerAccount.split(':')[0]]?.[holdTokens[listenerAccount.split(':')[0]].length - 1];
      if (listenerHoldToken) {
        const proxyDetails = proxies.length > 0 ? proxies[0] : null;
        const agent = proxyDetails ? new HttpsProxyAgent(proxyDetails) : null;
        const proxyForCaptcha = proxyDetails
          ? {
            user: proxyDetails.split(":")[1].split("/")[2],
            pass: proxyDetails.split(":")[2].split("@")[0],
            host: proxyDetails.split(":")[2].split("@")[1],
            port: proxyDetails.split(":")[3],
          }
          : null;
        // const reCaptchaToken = await solveV3AntiCaptcha(websiteURL, websiteKey, 'submit', 0.9, proxyForCaptcha);
        // we won't use this because we will have an alraedy established socket connection
        const reCaptchaToken = 'anythihng';
        const holdUrl = buildHoldUrl(eventKey, listenerHoldToken, reCaptchaToken);
        const options = { headers: { 'Origin': websiteURL } };
        seatListener = listenToSeats(holdUrl, options, agent, handleSeat, getListenerPreferredAccount, eventData._id); // Assign to the globally declared variable
      } else {
        log('error', `Could not establish listener connection: no hold token for the preferred account (${listenerAccount}).`);
      }
    } else {
      log('error', 'Could not establish listener connection: no preferred account found.');
    }
  }

  console.log('Listening for messages...');

    //if (process.env.DUAL_HOLDING_FOR_LISTENER !== 'true') return; 
    const SOCKET_PORT = parseInt(process.env.SOCKET_PORT) || 8082;
    const wss = new WebSocketServer({ port: SOCKET_PORT });
    wss.on('connection', ws => {
      ws.on('message', async message => {
        try {
          const data = JSON.parse(message);
          if (data.action === 'connect') {
            const { token } = data;
            log('info', `Received connect request for token: ${token}`);
            const account = token + ':anything' + ':accessTokenanything';
            if(botVersion == 'v2' || botVersion == 'v3') {
                await establish_socket_connection(account, { holdToken: token });
            }
            log('info', '🚀 Established socket connection for token:', token);
            ws.send(JSON.stringify({ success: true, token }));
          } else if (data.action === 'free-object' || data.action === 'transfer-object') {
            const { objects, token } = data;
            console.log('data recieved is',data)

            // The token is the hold-token
            objects.forEach(async obj => {
              if (data.newToken) {
                // Transfer to new account
                await transferObject(obj.objectId, token, data.newToken);
              } else {
                // response with failure 
              //ws.send('pleaser provide the new token');

                // Release
                releasedObjects.push(obj.objectId);
                removeHeldObject(token, obj.objectId);
                log('info', `Released object ${obj.objectId} for token ${token}`);

                // Get account email from token
                const accountEmail = Object.keys(holdTokens).find(accKey =>
                  holdTokens[accKey] && holdTokens[accKey].includes(token)
                );

                if (accountEmail) {
                  // Find the full account string (email:password) from accounts
                  const accountsForHolding = getAccounts(shift1AccountsFile,shift2AccountsFile);
                  const fullAccount = accountsForHolding.find(acc => acc.split(':')[0] === accountEmail);

                  if (fullAccount) {
                    const proxyIndex = Math.floor(Math.random() * proxies.length);
                    const proxy = proxies[proxyIndex];

                    // Call holdObject function to free the object
                    await holdObject(fullAccount, proxy, {
                      label: obj.objectId,
                      objectLabelOrUuid: obj.objectId
                    }, null, false,  'free-object',null,1,false,true );
                    log('info', `Called holdObject to free object ${obj.objectId} for account ${fullAccount.split(':')[0]}`);
                  } else {
                    log('warning', `Full account not found for email ${accountEmail.split(':')[0]}`);
                  }
                } else {
                  log('warning', `No account found for token ${token}`);
                }
              }
            });
            ws.send(JSON.stringify({ objects: objects.map(o => ({ objectId: o.objectId })), userLocation: {} }));
          }
        } catch (error) {
          log('error', 'Error processing message:', error);
        }
      });
    console.log(`WebSocket server started on port ${SOCKET_PORT}`);
    });

})();
