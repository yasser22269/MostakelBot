
import { Worker } from 'worker_threads';
import 'dotenv/config';
const blockStartWith = process.env.START_WITH.split(',').filter(Boolean);
const excludeBlocks = process.env.EXCLUDE_BLOCKS.split(',').filter(Boolean);
const excludeParents = process.env.EXCLUDE_PARENTS.split(',').filter(Boolean);
import crypto from 'crypto'
let currentTeam = process.env.FIRST_TEAM_TO_FETCH;
blockStartWith.forEach(element => {
    console.log(element);
});


import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path'
import { HttpsProxyAgent } from 'https-proxy-agent';
import { execSync } from 'child_process';
import { ApiConfig } from '../lib/chunk-LPIRJEMY.js';
import { solveTurnstileLocal } from '../captcha/capsolver.js';
import { fetchAndDeobfuscateObjectStatuses, fetchAndDeobfuscateObjectStatusesV3 } from "../seatsio/seatsio_utils.js";
import { SeatsioDeobfuscator, fetchRenderingInfo as fetchRenderingInfoV1, getOrCreateBrowserId } from '../seatsio/seatsio_classes.js';
import { hold_object, establish_socket_connection, accountSockets, tracingIds } from '../bot/socket_book.js';
import { FILE_PATHS, API_CONFIG, LOG_COLORS, SEATSIO_CONSTANTS, BOT_SETTINGS } from './config.js';
import { addHeldObject } from '../bot/heldObjects.js';
import { warn } from 'console';

// State
let accounts = [];
let holdTokens = {};
let processedAccounts = 0;
let heldSeats = 0;
let url;
let proxies = [];
let isSeason;
let eventDetails;
let eventId;
let chartKey;
let eventKey;
let channelKeys;
let homeTeamKey;
let currentChannelKey;
let awayTeamKey;
let channelKeyForHomeTeam;
let channelKeyForAwayTeam;
let channelKeyCommon;
let channelKeysToCheck;
let publishedJsonParsed = null;
let currentChannelType;
let objectStatusesJsonParsed = [];
export let renderingInfo = null;
let chartToken; //v1 specific
let browserId; //v1 specific
var freeSeats = [];
let isGeneralAdmissionAreas = false;
let activeWorkers = new Set();
let forceChannelType;
let botVersion;

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
const initialEventData = eventDetails?.data || eventDetails;
const DEFAULT_SEATCLOUD_WORKSPACE_KEY = SEATSIO_CONSTANTS.VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY || "66e63c10464382fb1f049832";
const ENV_SEATCLOUD_WORKSPACE_KEY = process.env.VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY || process.env.SEATCLOUD_WORKSPACE_KEY || DEFAULT_SEATCLOUD_WORKSPACE_KEY;
let workspaceKey = initialEventData?.seats_io?.workspace_key || ENV_SEATCLOUD_WORKSPACE_KEY;
const awayTeamId = initialEventData?.away_team?._id;
const homeTeamId = initialEventData?.home_team?._id;
const commonTeamId = 'common';

const keys = {
    away: initialEventData?.channel_keys?.[awayTeamId],
    home: initialEventData?.channel_keys?.[homeTeamId],
    common: initialEventData?.channel_keys?.[commonTeamId]
}

export async function sendToTelegram(message, options = {}) {
// const chatIds = ['-1002922665235']   turki 
          //
// const chatIds = ['-1003112777348'] //abosaid
    const chatIds = [process.env.tgChannelKey]
    const apiKey =process.env.BOT_TOKEN;
    const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;
    if (process.env.sendTG == 'false') return;

    for (const chatId of chatIds) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                    ...options
                }),
            });
            if (response.ok) {
                console.log(`Telegram message sent to ${chatId}`);
            } else {
                const errorData = await response.json();
                console.log(`Failed to send Telegram message to ${chatId}: ${response.status} ${response.statusText}`, errorData);
            }
        } catch (error) {
            console.log(`Error sending Telegram message to ${chatId}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}
// Logger
function log(level, ...args) {
  const options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  };
  const timestamp = new Date().toLocaleString(undefined, options);
  const color = LOG_COLORS[level] || LOG_COLORS.info;
  const message = args.map(arg => (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg).join(' ');
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${LOG_COLORS.reset}`);
}

// File System Functions
function getAccounts(accountsFile = FILE_PATHS.ACCOUNTS_FILE, secondAccountFile = null) {
    let accounts = [];
    let secondAccounts = [];

    try {
        if (fs.existsSync(accountsFile)) {
            accounts = fs.readFileSync(accountsFile, 'utf-8').split('\n').filter(Boolean);
        } else {
            log('warning', `Accounts file not found: ${accountsFile}`);
        }
    } catch (error) {
        log('error', `Could not read accounts file: ${accountsFile}`);
    }

    try {
        if (secondAccountFile && fs.existsSync(secondAccountFile)) {
            secondAccounts = fs.readFileSync(secondAccountFile, 'utf-8').split('\n').filter(Boolean);
        }
    } catch (error) {
        log('error', `Could not read second accounts file: ${secondAccountFile}`);
    }

    return accounts.concat(secondAccounts);
}

function getProxies() {
    try {
        return fs.readFileSync(FILE_PATHS.PROXIES_FILE, 'utf-8').split('\n').filter(Boolean);
    } catch (error) {
        log('error', `Could not read proxies file: ${FILE_PATHS.PROXIES_FILE}`);
        return [];
    }
}

function addAccountToProcessed(account) {
    fs.appendFileSync(FILE_PATHS.PROCESSED_ACCOUNTS_FILE, `${account}\n`);
}

function addAccountToSuccess(account) {
    fs.appendFileSync(FILE_PATHS.SUCCESS_ACCOUNTS_FILE, `${account}\n`);
}

function addSuccessfulBookingToUrls(account, paymentUrl) {
    const options = {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    };
    const timestamp = new Date().toLocaleString(undefined, options);
    fs.appendFileSync(FILE_PATHS.URLS_FILE, `[${timestamp}] ${account} Payment URL: ${paymentUrl}\n`);
}

function addAccountToFailed(account) {
    fs.appendFileSync(FILE_PATHS.FAILED_ACCOUNTS_FILE, `${account}\n`);
}

function getProxyIndex() {
    if (fs.existsSync(FILE_PATHS.PROXY_INDEX_FILE)) {
        return parseInt(fs.readFileSync(FILE_PATHS.PROXY_INDEX_FILE, 'utf-8')) || 0;
    }
    return 0;
}

function saveProxyIndex(index) {
    fs.writeFileSync(FILE_PATHS.PROXY_INDEX_FILE, index.toString());
}

// Core Logic
let heldObjectsState = {};
export async function refreshHeldObjects() {
    try {
        const { updateHeldObjectsFromAPI } = await import('../../scripts/release.js');
        await updateHeldObjectsFromAPI();
        if (fs.existsSync(FILE_PATHS.HELD_OBJECTS_FILE)) {
            heldObjectsState = JSON.parse(fs.readFileSync(FILE_PATHS.HELD_OBJECTS_FILE, 'utf-8'));
        }
    } catch (error) {
        console.error('Error refreshing held objects:', error);
    }
}
//the isTransferHold is for the action 'hold-object' for transfer object
async function holdObject(account, proxy, freeSeat, teamID, notfirstTry,action =  "hold-object",holdToken=null,quantity=1,isTransferHold=false,isT=false) {
    try {
      const seatNameOrLabel = freeSeat.name || freeSeat.label || freeSeat.objectLabelOrUuid;
      const accountEmail = account.split(':')[0];
      const maxTickets = parseInt(process.env.MAX_TICKET_PER_ACCOUNT) || 10;
      let holdTokensLocal = {};
      if (fs.existsSync(FILE_PATHS.HOLD_TOKENS_FILE)) {
          holdTokensLocal = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
      }
      const tokens = holdTokensLocal[accountEmail] || [];
      let currentHeld = 0;
      for (const token of tokens) {
          if (heldObjectsState[token]) {
              currentHeld += heldObjectsState[token].length;
          }
      }

      if (currentHeld >= maxTickets && action === "hold-object") {
          log('warning', `Account ${accountEmail} has reached max tickets (${currentHeld}/${maxTickets}). Skipping hold.`);
          return [];
      }

      //wait 4 miliseconds if isTransferHold is true
      if (isTransferHold) {
        await new Promise(resolve => setTimeout(resolve, 0.00));
      }
        
    const botVersion = process.env.BOT_VERSION;
    

    const agent = process.env.USE_PROXY_FOR_HOLD === 'true' && proxy && !isT ? new HttpsProxyAgent(proxy) : null;
    if (agent) console.log('holding object using proxy', proxy);
    if (teamID) {
        setupChannelKeys(teamID);
    }
      if (!freeSeat.channel && process.env.BOT_VERSION == 'v1'){
        freeSeat.channel = whichChannelObjectIsIn(seatNameOrLabel);
      }


      //console.log('which channel is:',freeSeat.channel);
      //console.log('channel keys are ',keys);

      let secondChannelKey;
        if (process.env.FORCE_TEAM !== ''){
        secondChannelKey=   keys[process.env.FORCE_TEAM][0] 
        }else{
          if(process.env.DISABLE_SECOND_CHANNEL == 'true'){
            secondChannelKey = null;
          }else{
            secondChannelKey = freeSeat.channel?.channelKey[0];
          }
        }

      let ChannelKeysManual  =  process.env.BOT_VERSION == 'v1' ?   ['NO_CHANNEL',keys.common[0],secondChannelKey]: '';
      //console.log('channel keys manual',ChannelKeysManual);
      //console.log('channel keys manual',ChannelKeysManual);

    // get the last hold token for that account
    //let holdToken = null;
    let tracing_id = null;

    if (tracingIds.has(accountEmail)) {
        tracing_id = tracingIds.get(accountEmail);
    }
    
    if(!holdToken){

        try {
            holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
            const holdData = holdTokens[accountEmail][holdTokens[accountEmail]?.length - 1];
            if (typeof holdData === 'object' && holdData !== null) {
                holdToken = holdData.token;
                if (!tracing_id) tracing_id = holdData.tracing_id;
            } else {
                holdToken = holdData;
            }
        } catch (error) {
            console.log('did not find hold token',error);
            return [false];
        }
    } else if (!tracing_id) {
        try {
            const holdTokensFile = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
            const tokens = holdTokensFile[accountEmail] || [];
            const holdData = tokens.find(t => (typeof t === 'object' ? t.token : t) === holdToken);
            if (holdData && typeof holdData === 'object') {
                tracing_id = holdData.tracing_id;
            }
        } catch (error) {
            console.log('Error looking up tracing_id for provided holdToken', error);
        }
    }

    if (tracing_id) {
        tracingIds.set(accountEmail, tracing_id);
    }

    if (!holdToken) {
        log("error", `No hold token found for ${account}. Skipping.`);
        return [false];
    }

    log("info", `Holding seat current channel type ${currentChannelType} firing hold_object ${freeSeat.objectLabelOrUuid || seatNameOrLabel} for account ${account.split(':')[0]} hold token ${holdToken} tracing_id ${tracing_id}`);

    try {
        if (botVersion === 'v2' || botVersion === 'v3') {
            const holdUrl = `wss://api.seatcloud.com:8443/?event=${eventKey}&token=${holdToken}&teamID=${publishedJsonParsed.team_id}`;
            const holdRequestBody = {
                action,
                objects: [{ objectId: seatNameOrLabel}],
                token: holdToken,
                tracing_id: tracing_id
            };
            console.log(`Sending hold request for ${seatNameOrLabel} with tracing_id: ${tracing_id}`);
            const holdRes = await hold_object(
                holdUrl,
                holdRequestBody,
                agent,
                account,
                isSeason,
            );

            if (holdRes !== true) {
                log('error', 'Hold object error for', seatNameOrLabel, ':', holdRes);
                return [false];
            }
        } else {
            let requestBody, endpointUrl;
            
            if (action === 'free-object') {
                // Use release endpoint for freeing objects
                endpointUrl = SEATSIO_CONSTANTS.RELEASE_OBJECTS_URL;
                requestBody = {
                    "events": [freeSeat.eventKey ? freeSeat.eventKey : eventKey],
                    "holdToken": holdToken,
                    "objects": [{ "objectId": freeSeat.objectLabelOrUuid || seatNameOrLabel }],
                    "validateEventsLinkedToSameChart": true
                };
              console.log('release seat request body is ',requestBody, 'and the endpoint url is',endpointUrl);
            } else {
                // Use hold endpoint for holding objects
                endpointUrl = SEATSIO_CONSTANTS.HOLD_OBJECTS_URL;
                requestBody = {
                    "events": [eventKey],
                    "holdToken": holdToken,
                    "objects": [{ "objectId": freeSeat.objectLabelOrUuid || seatNameOrLabel }],
                    "channelKeys": ChannelKeysManual || [],
                    "validateEventsLinkedToSameChart": true
                };
            }

          
            const holdObjectsRes = await fetchRenderingInfoV1(endpointUrl, chartToken, browserId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            }, true, agent,action);

            if (holdObjectsRes.status !== 204) {
                const jsonRes = await holdObjectsRes.json();
                log('error', `${action === 'free-object' ? 'Release' : 'Hold'} object error for`, freeSeat.objectLabelOrUuid, ':', holdObjectsRes.status, holdObjectsRes.statusText, jsonRes);
                if (action !== 'free-object') { // Only retry for hold operations
                    if (jsonRes.errors && jsonRes.errors.length > 0 && jsonRes.errors[0].code == "OBJECT_NOT_IN_CHANNEL") {
                        if (!notfirstTry) {
                            if( process.env.USE_OPPOSITE_KEY_FOR_HOLD !== 'true' ) {
                                return [false];
                            }
                            console.log('trying with opposite channel key');
                            const oppositeChannelKey = currentChannelType === 'home' ? 'away' : 'home';
                            setupChannelKeys(oppositeChannelKey);
                            return await holdObject(account, proxy, freeSeat, null, true);
                        } else {
                            return [false];
                        }
                    } else if (jsonRes.errors && jsonRes.errors.length > 0 && jsonRes.errors[0].code == "HOLDTOKEN_NOT_FOUND") {

                        console.log('no hold token for that account please run the bot again');
                         return [false]
                        // 
                    } else return [false];
                } else {
                    return [false]; // Return false for release operations on error
                }
            }
        }

        if (action !== 'free-object') {
            addHeldObject(holdToken, freeSeat.objectLabelOrUuid || seatNameOrLabel);
          if (isTransferHold){
            log('success', 'Successfully hold for the transer of', freeSeat.objectLabelOrUuid || seatNameOrLabel, 'for', account.split(':')[0]);

          }else{
            log('success', 'Successfully hold', freeSeat.objectLabelOrUuid || seatNameOrLabel, 'for', account.split(':')[0]);
            await sendToTelegram(`${account.split(':')[0]} ${account.split(':')[1]} \nHeld: ${seatNameOrLabel || freeSeat.objectLabelOrUuid} \nEvent URL: ${process.env.PROMPT_URL}`);
          }
        }else{
          log('warning', 'successfully released', freeSeat.objectLabelOrUuid || seatNameOrLabel, 'for', account.split(':')[0]);
        }
        return [true, currentChannelType || forceChannelType];
    } catch (error) {
        console.error('failed to hold object',freeSeat.objectLabelOrUuid || seatNameOrLabel,'for',account.split(':')[0],'with token',holdToken,error);
        return [false];
    }
    } catch (error) {
      console.error('error when processing  hold object',freeSeat.objectLabelOrUuid || seatNameOrLabel,'for',account.split(':')[0],'with token',holdToken,error);
      return [false];
        
    }
}

const startWorker = (account, proxy,freeSeatsBatch) => {
    return new Promise((resolve) => {
        let proxyIndex = getProxyIndex();
        const proxy = proxies.length > 0 ? proxies[proxyIndex % proxies.length] : null;
        saveProxyIndex(proxyIndex + 1);

        log("info", "Starting worker for account:", account.slice(0, 60), "...", proxy ? `with proxy: ${proxy}` : "");
        addAccountToProcessed(account);
        processedAccounts++;

        holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));

        const holdToken = holdTokens[account.split(':')[0]][holdTokens[account.split(':')[0]].length - 1];
        if (!holdToken) {
            log("error", `No hold token found for ${account}. Skipping.`);
            return resolve();
        }

        const workerData = {
            account,
            proxy,
            url,
            usePreparedAccessTokens: BOT_SETTINGS.USE_PREPARED_ACCESS_TOKENS,
            blockName: blockStartWith,
            freeSeatsBatch: [{ ...freeSeatsBatch[0], teamKey: currentChannelKey }],
            isSeason,
            chartKey,
            eventId: eventId,
            browserId: getOrCreateBrowserId(),
            isGeneralAdmissionAreas,
            channelKeysToCheck,
            eventKey,
            renderingInfo,
            publishedDetails: publishedJsonParsed,
            objectStatuses: objectStatusesJsonParsed,
            eventDetails,
            holdToken,
            botVersion,
            chartToken, // v1
        };

        const workerFile = './src/bot/worker.js';
        const worker = new Worker(workerFile, { workerData });
        activeWorkers.add(worker);

        let resolved = false;
        const done = () => {
            if (!resolved) {
                resolved = true;
                activeWorkers.delete(worker);
                resolve();
            }
        };

        worker.on("message", (message) => {
            if (message.type === "seatHeld") {
                heldSeats++;
            } else if (message.status === "success") {
                log("success", "Booking successful for", message.account.slice(0, 60), "...");
                addAccountToSuccess(message.account);
                addSuccessfulBookingToUrls(message.account, message.paymentUrl);
                done();
            } else {
                log("error", "Booking failed for", message.account.split(':')[0], ":", message.error);
                addAccountToFailed(message.account);
                done();
            }
        });

        worker.on("error", (error) => {
            log("error", "Worker error for account", account, ":", error);
            addAccountToFailed(account);
            done();
        });

        worker.on("exit", (code) => {
            if (code !== 0) {
                log("error", "Worker for account", account, "stopped with exit code", code);
                addAccountToFailed(account);
            }
            done();
        });
    });
};

async function updateObjects() {
    setupChannelKeys(currentTeam);
    if (currentTeam === 'home') {
        channelKeysToCheck = ["NO_CHANNEL", channelKeyCommon, channelKeyForHomeTeam].filter(Boolean);
        currentChannelKey = homeTeamKey;
        currentTeam = 'away';
        console.log('using home team');
    } else {
        channelKeysToCheck = ["NO_CHANNEL", channelKeyCommon, channelKeyForAwayTeam].filter(Boolean);
        currentChannelKey = awayTeamKey;
        currentTeam = 'home';
        console.log('using away team');
    }
            const proxies = getProxies();
            let agentV1 = null;
            const proxy = proxies[0];
           agentV1 = proxy ? new HttpsProxyAgent(proxy) : null;
            //if (proxies.length > 0) {
                //let proxyIndex = getProxyIndex();
                //proxyIndex = (proxyIndex + 1) % proxies.length;
              //use the first proxy
//
//                const proxy = proxies[0];
//                if (process.env.USE_PROXY_FOR_OBJECT_STATUS_FETCH === 'true') {
//                    agentV1 = new HttpsProxyAgent(proxy);
//                    //saveProxyIndex(proxyIndex);
//                }
                //log('info', `Using proxy ${proxy} for object status fetch.`);
            //} else {
                //log('warning', 'No proxies found for object status fetch.');
//            }

    if (botVersion === 'v3') {
        //log('warning', 'start fetching V3', eventKey, workspaceKey, channelKeysToCheck, agentV1, currentTeam === 'home' ? 'away' : 'home')
        objectStatusesJsonParsed = await fetchAndDeobfuscateObjectStatusesV3(eventKey, workspaceKey, channelKeysToCheck, agentV1, currentTeam === 'home' ? 'away' : 'home') || [];
    } else if (botVersion === 'v2') {
        //log('warning', 'start fetching', eventKey, workspaceKey, channelKeysToCheck, agentV1, currentTeam === 'home' ? 'away' : 'home')
        objectStatusesJsonParsed = await fetchAndDeobfuscateObjectStatuses(eventKey, workspaceKey, channelKeysToCheck, agentV1, currentTeam === 'home' ? 'away' : 'home') || [];
    }

    if (!objectStatusesJsonParsed || objectStatusesJsonParsed.length === 0) {
        console.log("No data fetched or empty data, ensuring array...");
        objectStatusesJsonParsed = [];
    }

    if (botVersion === 'v2' || botVersion === 'v3') {
        if (objectStatusesJsonParsed.length === 0) console.log('no object status found');
        objectStatusesJsonParsed.sort((a, b) =>
            (a.name || a.label || '').localeCompare((b.name || b.label || ''), undefined, { numeric: true })
        );
    } else {
        try {
            const objectStatusesURL = `${SEATSIO_CONSTANTS.OBJECT_STATUSES_URL}?event_key=${encodeURIComponent(eventKey)}&channel_key=${channelKeysToCheck.join(',')}`;
            const objectStatusesRes = await fetchRenderingInfoV1(objectStatusesURL, chartToken, browserId, { method: 'GET' }, true, agentV1);
            const objectStatusesBuffer = await objectStatusesRes.arrayBuffer();
            const objectStatusesJson = SeatsioDeobfuscator.deobfuscate(objectStatusesBuffer, chartKey);
            objectStatusesJsonParsed = JSON.parse(objectStatusesJson) || [];
            objectStatusesJsonParsed.sort((a, b) => a.objectLabelOrUuid.localeCompare(b.objectLabelOrUuid, undefined, { numeric: true }));
        } catch (e) {
            console.log("Error fetching v1 statuses:", e);
            objectStatusesJsonParsed = [];
        }
    }
    // const objectStatusesFilePath = path.join(FILE_PATHS.OBJECT_STATUSES_AWAY_FILE, `objectStatuses_${currentTeam === 'home' ? 'away' : 'home'}.json`);
    fs.writeFileSync(FILE_PATHS.OBJECT_STATUSES_AWAY_FILE, JSON.stringify(objectStatusesJsonParsed, null, 2));
}

async function getObjectStatusesFromFS() {
    const home = fs.readFileSync(FILE_PATHS.OBJECT_STATUSES_HOME_FILE, 'utf-8');
    const away = fs.readFileSync(FILE_PATHS.OBJECT_STATUSES_AWAY_FILE, 'utf-8');
    return [...JSON.parse(home), ...JSON.parse(away)];
}

function updateSeats(objectStatuses) {
   freeSeats = []; 
    let tokenPerAccount = BOT_SETTINGS.TICKET_PER_ACCOUNT;

    const accounts = getAccounts();
    const categories_needed = [];
    const categories_not_needed = [];

    if (botVersion === 'v2' || botVersion === 'v3') {
        freeSeats = [];
        isGeneralAdmissionAreas = false;
    }
    for (const objectStatus of objectStatuses) {
        const label = botVersion === 'v2' || botVersion === 'v3' ? (objectStatus.name || objectStatus.label) : objectStatus.objectLabelOrUuid;
        const [section, parent, own] = label.split("-");
        
//        const mainObjectInPublishedJson = publishedJsonParsed.subChart.sections.find(
//            (_section) => _section.label === section
//
//        );
//        if (!mainObjectInPublishedJson) continue;
//
//        const subObjectInPublishedJson = mainObjectInPublishedJson.subChart.rows.find(
//            (row) => row.label === parent
//        );
//        if (!subObjectInPublishedJson) continue;
//        const objectInPublishedJson = subObjectInPublishedJson.seats.find(
//            (seat) => seat.label === own
//        ) || {};
//        if (!objectInPublishedJson) continue;

        const isFreeV2 = objectStatus.status === "free" &&  objectStatus.isAvailable && objectStatus.isAvailableForSale ;
        //const isFreeV1 = objectStatus.status === 'free' && objectStatus.version >= 0;
        const isFreeV1 = objectStatus.status === 'free' &&  objectStatus.seasonObjectStatus?.numBooked < 1 ;

      //measure the time from this line 
       // const startTime = performance.now();
      let objChannel;
      if (process.env.BOT_VERSION == 'v1'){

         objChannel = whichChannelObjectIsIn(label);
        if (objChannel.channel === 'none') continue;
      }
       // const endTime = performance.now();
       // console.log('time taken to check if the object is free is ',endTime - startTime);
      //That equals 0.019 ms (rounded to 3 decimal places) or 19 microseconds.
        

        if (botVersion === 'v2' || botVersion === 'v3' ? isFreeV2 : isFreeV1) {
      if (objectStatus.objectType === 'GeneralAdmissionArea'){
        if (objectStatus.numFree < 1) continue;
      }
        if (blockStartWith.length > 0 && !blockStartWith.some((block) => label.toLowerCase().startsWith(block.toLowerCase()))) continue;  
        if (excludeBlocks.length > 0 && excludeBlocks.some((block) => section.toLowerCase().startsWith(block.toLowerCase()))) continue;
          if (excludeParents.length > 0 && excludeParents.some((block) => parent.toLowerCase() == block.toLowerCase())) continue;
          //  const categoryKey = objectInPublishedJson.categoryKey || subObjectInPublishedJson.categoryKey || mainObjectInPublishedJson.categoryKey || "";
          //  const categoryObject = publishedJsonParsed.categories.list.find(
          //      (category) => category.key === categoryKey
          //  );

//            if (categories_needed.length > 0 && !categories_needed.includes(categoryObject.label.toLowerCase())) continue;
//            if (categories_not_needed.length > 0 && categories_not_needed.includes(categoryObject.label.toLowerCase())) continue;
//
            const seatInfo = { ...objectStatus };
            if (botVersion === 'v1') {
                seatInfo.section = section;
                seatInfo.parent = parent;
                seatInfo.own = own;
                seatInfo.channelKeysToCheck = channelKeysToCheck;
            }
            seatInfo.teamKey = currentChannelKey;
            seatInfo.channel = objChannel;
            freeSeats.push(seatInfo);

            if (tokenPerAccount != -1){
            if ((freeSeats.length) >= tokenPerAccount * (accounts.length)) {
                break;
            };

            } //else unlimited
        }
    }
}

async function update() {
    log('warning', 'updating seats no seats');
    await updateObjects();
    updateSeats(objectStatusesJsonParsed);
    // if (freeSeats.length > 0) return;
}

// Returns all unique non-null allocation_channel_keys from event tickets (v3 support)
function getAllocationChannelKeys(eventData) {
    const tickets = eventData?.event_tickets || [];
    const keys = new Set();
    for (const ticket of tickets) {
        if (Array.isArray(ticket.allocation_channel_keys)) {
            for (const key of ticket.allocation_channel_keys) {
                if (key) keys.add(key);
            }
        }
    }
    return [...keys];
}

function setupChannelKeys(channelType = '') {
    const eventData = eventDetails?.data || eventDetails;
    channelKeys = eventData.channel_keys;
    if (channelType == 'home') {
        homeTeamKey = eventData.home_team?._id;
        awayTeamKey = eventData.home_team?._id;
    } else if (channelType == 'away') {
        homeTeamKey = eventData.away_team?._id;
        awayTeamKey = eventData.away_team?._id;
    } else {
        homeTeamKey = eventData.home_team?._id;
        awayTeamKey = eventData.away_team?._id;
    }

    channelKeyForHomeTeam = homeTeamKey ? channelKeys[homeTeamKey]?.[0] : undefined;
    channelKeyForAwayTeam = awayTeamKey ? channelKeys[awayTeamKey]?.[0] : undefined;
    channelKeyCommon = channelKeys['common']?.[0];

    // For v3: supplement channelKeysToCheck with allocation-based channel keys from tickets
    const allocationKeys = botVersion === 'v3' ? getAllocationChannelKeys(eventData) : [];

    channelKeysToCheck = ["NO_CHANNEL", channelKeyCommon, channelKeyForHomeTeam, ...allocationKeys].filter(Boolean);
    currentChannelKey = homeTeamKey;
    currentChannelType = channelType;
}

async function main(config = {}) {

    botVersion = config.BOT_VERSION;
    forceChannelType = config.FORCE_CHANNEL_TYPE;
    log('info', `Running bot version: ${botVersion}`);

    accounts = getAccounts();
    holdTokens = {};
    processedAccounts = 0;
    heldSeats = 0;

    ApiConfig.init(API_CONFIG);

    url = config.PROMPT_URL;
    proxies = getProxies();
    const eventKeyFromPrompt = process.env.FORCE_EVENT_SLUG_VALUE || (() => {      
          try {
            const parts = new URL(url).pathname.split('/').filter(Boolean);
            const markers = ['events', 'event-detail', 'season-detail'];
            for (const marker of markers) {
                const idx = parts.indexOf(marker);
                if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
            }
            return parts[5] || '';
        } catch (_) {
            return url.split('/')[5] || '';
        }
    })();
     isSeason = process.env.IS_SEASON === 'true' ;
    log('info', 'Event Key:', eventKeyFromPrompt);

    log("info", "Loading initial data from local files...");
    eventDetails = JSON.parse(fs.readFileSync(FILE_PATHS.EVENT_DETAILS_FILE));
    setupChannelKeys(currentTeam);

    async function fetchInitialData() {
        browserId = getOrCreateBrowserId();
        log("info", { eventId, chartKey, eventKey, channelKeysToCheck, botVersion });
        renderingInfo = JSON.parse(fs.readFileSync(FILE_PATHS.RENDERING_INFO_FILE));
        publishedJsonParsed = JSON.parse(fs.readFileSync(FILE_PATHS.PUBLISHED_DETAILS_FILE));
        const homeStatuses = JSON.parse(fs.readFileSync(FILE_PATHS.OBJECT_STATUSES_HOME_FILE));
        const awayStatuses = JSON.parse(fs.readFileSync(FILE_PATHS.OBJECT_STATUSES_AWAY_FILE));
        objectStatusesJsonParsed = [...homeStatuses, ...awayStatuses];

        if (botVersion == 'v1') {
            const firstProxy_v1 = proxies.length > 100 ? proxies[90].trim() : null;
            const agent = firstProxy_v1 ? new HttpsProxyAgent(firstProxy_v1) : null;
            const scriptData = await fetchRenderingInfoV1(SEATSIO_CONSTANTS.CHART_JS_URL, '', getOrCreateBrowserId(), {}, false, agent);
            const scriptContent = await scriptData.text();
            const chartTokenMatch = scriptContent.match(/seatsio\.chartToken\s*=\s*'([^']+)'/);
            chartToken = chartTokenMatch ? chartTokenMatch[1] : '';
            if (!chartToken) {
                log('error', 'Chart token not found in script content');
                return;
            }
        }
    }

    eventDetails = JSON.parse(fs.readFileSync(FILE_PATHS.EVENT_DETAILS_FILE));
    const eventData = eventDetails?.data || eventDetails;
    workspaceKey = eventData?.seats_io?.workspace_key || ENV_SEATCLOUD_WORKSPACE_KEY;
    eventId = eventData?._id || '';
    chartKey = eventData?.seats_io?.chart_key || null;
    eventKey = process.env.FORCE_EVENT_SLUG_VALUE || (
    isSeason
        ? eventData?.seats_io?.season_key
        : eventData?.seats_io?.event_key
    ) || eventKeyFromPrompt;
    
    try {
        holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));
    } catch (error) {
        log('error', 'Could not read hold-tokens.json. Please prepare the hold tokens first.');
        //return;
    }
    //log("success", "Initial data and hold tokens fetched.");

    await fetchInitialData();
    if ((config.BOT_VERSION === 'v2' || config.BOT_VERSION === 'v3') && !config.SKIP_ESTABLISH_SOCKET_CONNECTIONS == 'true') {
        await establishInitialSocketConnections();
    }

    // setInterval(() => {
    //     try {
    //         log('info', 'Preparing hold tokens...');
    //         execSync('node prepare_hold_token.js', { stdio: 'inherit' });
    //         holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE));
    //         log('info', 'Reloaded hold tokens.');
    //     } catch (error) {
    //         log('error', 'Could not reload hold-tokens.json.');
    //     }
    // }, 5 * 60 * 1000);
}

async function establishInitialSocketConnections() {
    log('info', 'Establishing initial socket connections for all accounts...');

    const connectionPromises = [accounts[0]].map(async (account) => {
        try {
            await establish_socket_connection(account);
        } catch (error) {
            log('error', `Failed to establish initial socket connection for ${account}: ${error}`);
        }
    });

    await Promise.all(connectionPromises);
}
async function getHash(key){
  try{

      const computedHash = await crypto.subtle.digest('SHA-1', 
        new TextEncoder().encode(key)
    ).then(buf => {
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    });
    return computedHash;
  }catch(e){
    console.log(e)}

}
export async function getHashes(){
  try{
    const awayHash = await getHash(keys.away);
    const homeHash = await getHash(keys.home);
    const commonHash = await getHash(keys.common);
    const hashes = {
      away:awayHash,
      home:homeHash,
      common:commonHash,
    }
    console.log('hashes are ',hashes);
    return hashes;

  }catch(e){console.log(e)}
}
async function getObjectsWithChannels(){
  try{
    renderingInfo = ensureJSONFile(FILE_PATHS.RENDERING_INFO_FILE, { channels: [], allocations: [] });
      const hashes = await getHashes();
    console.log('hashes are ',hashes);
      const channelOrAllocation = process.env.BOT_VERSION === 'v3' ? 'allocations' : 'channels';
      const allocationList = renderingInfo[channelOrAllocation] || [];
      const homeObjects = allocationList.find(o => o.hashedKey === hashes.home);
      const awayObjects = allocationList.find(o => o.hashedKey === hashes.away);
      const commonObjects = allocationList.find(o => o.hashedKey === hashes.common);
    //console.log('homeObjects are ',homeObjects);

      let result = process.env.BOT_VERSION == 'v1' ? {
        home:homeObjects?.objects,
        away:awayObjects?.objects,
        common:commonObjects?.objects,

      }:'';
    //console.log('obj are ',result);
    return result;

  }catch(e){
    console.log(e);
  }
}
const obj = await getObjectsWithChannels();
//console.log('obj are ',obj);
//console.log('obj are ',obj);
export const homeObjects = process.env.BOT_VERSION == 'v1' ?  obj.home: {};
export const awayObjects = process.env.BOT_VERSION == 'v1' ?  obj.away: {};
export const commonObjects = process.env.BOT_VERSION == 'v1' ?  obj.common: {};
export function whichChannelObjectIsIn(obj){
  const isHome = homeObjects.includes(obj);
  const isAway = awayObjects.includes(obj);
  //console.log('away objects are:',awayObjects);
  const isCommon = commonObjects?.includes(obj);
  if(isHome){
    return {channel:'home',channelKey:keys.home}
  }else if(isAway){
    return {channel:'away',channelKey:keys.away}
  }else if(isCommon){
    return {channel:'common',channelKey:keys.common}

  }else {
    return {channel:'none',channelKey:null}
  }

}

export { main, getAccounts, getProxies, log, updateObjects, freeSeats, update, updateSeats, startWorker, getObjectStatusesFromFS, holdObject };
