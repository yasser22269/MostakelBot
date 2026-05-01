
// Install with: npm install ws

import {solveTurnstileLocal,solveV3AntiCaptcha} from '../captcha/capsolver.js'
import WebSocket from "ws";
import crypto from "crypto";
import { Worker } from 'worker_threads';
import 'dotenv/config';
import fs from 'fs';
import { FILE_PATHS ,solveV3Wrapper} from '../utils/config.js';
import { log } from '../utils/utils.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getAccounts } from '../utils/utils.js';
import UserAgent from 'user-agents';
import { establishPlaywrightSocket } from '../../solvev3_cap/playwright_socket_manager.js';

//const ENABLE_BROWSER = String(process.env.ENABLE_BROWSER_FOR_SOCKET_CONNECTION).trim().toLowerCase().replace(/['"]/g, '') === 'true';
const ENABLE_BROWSER = false;
console.log(`[DEBUG] ENABLE_BROWSER check: Raw='${process.env.ENABLE_BROWSER_FOR_SOCKET_CONNECTION}', Final=${ENABLE_BROWSER}`);

const workerName =  './src/bot/hold_token_worker.js' ;
const accountSockets = new Map();
const tracingIds = new Map();
const pendingHolds = new Map(); 
import { renderingInfo } from '../utils/utils.js';
// key.split(':')[0]: `${objectId}:${token}`
// value: { resolve, reject, timeout }
export { accountSockets, tracingIds };
function getRandomProxy(){
  const proxies = fs.readFileSync(FILE_PATHS.PROXIES_FILE, 'utf-8').split('\n');
  const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
  return randomProxy;
}

function saveHoldToken(account, holdToken) {
    try {
        const email = account.split(':')[0];
        const holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
        const hex = crypto.randomBytes(16).toString("hex");
        const tracing_id = `${Date.now()}-${hex}`;
        tracingIds.set(email, tracing_id);
        if (accountSockets.has(email)) {
            const socket = accountSockets.get(email);
            socket.tracing_id = tracing_id;
        }
        //holdTokens[account.split(':')[0]].push(holdToken);
        holdTokens[email] = [{
            token: holdToken,
            tracing_id: tracing_id
        }];
        fs.writeFileSync(FILE_PATHS.HOLD_TOKENS_FILE, JSON.stringify(holdTokens, null, 2));
        console.log(`✅ Saved new hold token and tracing_id for ${email}`);
    } catch (error) {
        console.error(`⚠️ Error saving hold token: ${error.message}`);
    }
}
async function tryConnect(account, agent, isSeason) {
  const email = account.split(':')[0];
  accountSockets.delete(email);

  const randomProxy = getRandomProxy();
  const worker = new Worker(workerName, {
    workerData: {
      account,
      proxy: randomProxy,
      isSeason
    }
  });

  worker.on('message', async (message) => {
    if (message.status === 'success') {
      saveHoldToken(account, message.holdToken);
      await establish_socket_connection(account, { holdToken: message.holdToken });
    } else {
      tryConnect(account, agent, isSeason);
    }
  });
  //on error
  worker.on("error", (error) => {
    log("error", "Worker error for account", account, ":", error);
    tryConnect(account, agent, isSeason);
  });
}
function attachHoldListener(socket) {
  if (socket.__holdListenerAttached) return;
  socket.__holdListenerAttached = true;

  socket.on('message', (data) => {
    const rawMessage = data.toString();
    console.log(`[RAW SOCKET MESSAGE]: ${rawMessage}`);
    //console.log('got message' ,JSON.parse(data?.toString()||''));
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    const objects =
      msg?.objects || msg?.payload?.objects;

    if (!Array.isArray(objects)) return;

    for (const objectId of objects) {
    //  const token =
    //    msg?.data?.token ??
    //    msg?.payload?.token;

//      if (!token) continue;

      const key = `${objectId.objectId || objectId}`;
      //const key = `${objectId}`;
      const pending = pendingHolds.get(key);
      if (!pending) continue;

      clearTimeout(pending.timeout);
      pendingHolds.delete(key);

      if (msg.error) {
        pending.reject(msg.error.message);
      } else {
        pending.resolve(true);
      }
    }
  });
}

export async function hold_object(url, holdRequest, agent, account, isSeason) {

  // Find any open socket
//  let socket = null;
//  for (const sock of accountSockets.values()) {
//    if (sock.readyState === WebSocket.OPEN) {
//      socket = sock;
//      break;
//    }
//  }
      const   socket = accountSockets.get(account.split(':')[0]);
      if (!socket) {
        log('warning', `No available socket found for holding. for account ${account.split(':')[0]}`);
        return false;
      }

  // Ensure listener exists
  attachHoldListener(socket);

  const objectId = holdRequest.objects[0].objectId;
  const email = account.split(':')[0];
  const tracing_id = tracingIds.get(email);
  const enrichedHoldRequest = {
    ...holdRequest,
    tracing_id: tracing_id || `${Date.now()}-${crypto.randomBytes(16).toString("hex")}`
  };
  const key = `${objectId}`;
  // const key = `${objectId}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingHolds.delete(key);
      reject(new Error('Timeout: No response within 10 second'));
    }, 10 * 1000);

    pendingHolds.set(key, { resolve, reject, timeout });

    //console.log('Sending hold request body to websocket:', JSON.stringify(holdRequest, null, 2));
    socket.send(JSON.stringify(enrichedHoldRequest));
  });
  //1 the response of the successful hold object is: //1 {"action":"hold-object","eventId":"68fcf8051861403442d02b16","data":{"channel":"","numCheckedIn":0,"section":"103","isChannelPrivate":false,"maxNumberReservedBySubEvent":0,"objects":["103-15-1"],"nu //1 mNotForeSale":0,"currentHeldTypes":{"":1},"numBookedBySeason":0,"numHeld":0,"numFree":0,"numBooked":0,"gate":"","token":"bd1f8f35-3482-423d-ad0b-010ae14a840a","capacity":0,"maxNumBookedBySubEvent":0 //1 ,"status":"reservedByToken","numBookedByCurrentToken":0,"numHeldBySeason":0,"numHeldByCurrentToken":1,"categoryLabel":"CAT 1","maxNumHeldBySubEvent":0,"objectType":"Seat","checkInCount":0,"currentBo //1 okedTypes":{}}}
  // the responsse sometimes is {"error":{"code":"HOLD_OBJECT_ERROR","message":"invalid hold token: maximum number of holds exceeded for o // bject 2a9190ac-4400-4240-8d04-fc86eb5c57e5"},"payload":{"status":"free","numHeldBySeason":0,"maxNumBookedBySubEvent":0 // ,"objectType":"Seat","capacity":0,"numHeld":0,"numNotForeSale":0,"currentBookedTypes":{},"currentHeldTypes":{},"sectio // n":"127","categoryLabel":"Companion","channel":"","maxNumberReservedBySubEvent":0,"token":"2a9190ac-4400-4240-8d04-fc8 // 6eb5c57e5","numFree":0,"numBookedByCurrentToken":0,"numHeldByCurrentToken":0,"maxNumHeldBySubEvent":0,"numBookedBySeas // on":0,"heldByCurrentToken":false,"objects":["127-30-6"],"numBooked":0}
}

export async function establish_socket_connection(account, options = {}) {
  const email = account.split(':')[0];
  if (accountSockets.has(email)) return;

  const {
    holdToken: providedHoldToken = null,
    isSeason = process.env.IS_SEASON === 'true',
    shouldReconnectIfFails = true,
    agent: providedAgent = null,
    eventKey: providedEventKey = null
  } = options;

  let holdToken = providedHoldToken;
  let tracing_id = null;

  // 1. Get hold token if not provided
  if (!holdToken) {
    try {
      const holdTokens = JSON.parse(fs.readFileSync(FILE_PATHS.HOLD_TOKENS_FILE, 'utf-8'));
      const accountTokens = holdTokens[email];
      if (accountTokens && accountTokens.length > 0) {
        const lastToken = accountTokens[accountTokens.length - 1];
        holdToken = typeof lastToken === 'object' ? lastToken.token : lastToken;
        tracing_id = typeof lastToken === 'object' ? lastToken.tracing_id : null;
      }
    } catch (e) {
      log('error', `Could not read hold token for ${email}: ${e.message}`);
    }
  }

  if (!holdToken) {
    log('error', `No hold token found for ${email}, cannot establish connection.`);
    return;
  }

  // 2. Resolve eventKey
  let eventKey = providedEventKey;
  if (!eventKey) {
    try {
      const eventDetails = JSON.parse(fs.readFileSync(FILE_PATHS.EVENT_DETAILS_FILE, 'utf-8'));
      const eventData = eventDetails?.data || eventDetails;
      eventKey = isSeason ? eventData.seats_io.season_key : eventData.seats_io.event_key;
    } catch (e) {
      log('error', `Could not resolve eventKey for ${email}: ${e.message}`);
    }
  }

  // 3. Resolve teamID
  let teamId = null;
  try {
    const publishedDetails = JSON.parse(fs.readFileSync(FILE_PATHS.PUBLISHED_DETAILS_FILE, 'utf-8'));
    teamId = publishedDetails?.teamId || publishedDetails?.team_id;
  } catch (e) {
    // Ignore
  }

  // 4. Resolve Proxy and Agent
  let agent = providedAgent;
  if (!agent && (process.env.USE_PROXY_FOR_ESTABLISH_SOCKET_CONNECTIONS === 'true' || process.env.USE_PROXY_FOR_HOLD === 'true')) {
    try {
      const proxies = fs.readFileSync(FILE_PATHS.PROXIES_FILE, 'utf-8').split('\n').filter(Boolean);
      if (proxies.length > 0) {
        const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
        agent = new HttpsProxyAgent(randomProxy);
      }
    } catch (e) {
      log('error', `Could not resolve proxy for ${email}: ${e.message}`);
    }
  }

  // 5. Solve reCAPTCHA
//  let reCaptchaToken = '1cAFcWeA7LbR5e4UXjUlowjrJvxL97HEKbqMopMS3_WT2nBm9s1jC0BYcGjd71BbCtxTAuBjurZcnLaUWAdCCJ5YXaev36vanhnBapy5UPOXaagm-LICkH7PJlUDkMDLTKDbkHf5_P4H7A9qtCY2HNC8Vn2ERhZ0lStpUxhyJH57IYDPFto8hMShrvZ6_y0pK2fFJ-mesmQX0VPTRzWKmvlyQ4TBziR6Pf7K0-kBCoKETvArWu9pST6oUycQb25NX6f8shnvPNZelIGhx1Muo3gTy0KK8_JMe522UoyC-5TlXsv8CaXvnR89Im0CHE9lrSumlE9BT_mLYVA1hYFfuiHgPADHZdauOpihYU9H8dZOkniEvuYMg6sDgvFQWHMEOnsdbDdmRUBxcHHFZ6efFLjVWabiCU0gdBqdtgmZweyZJtcWQo6_vc5ieBvrgTvgKWSIl1EASoJTsYsUdxk-iUNh2FdA35RN2PYBLEQaTGlWfj7tVijkjprqM3f5Biz57ostS-inHDkWiMpjQo6XssPptV8OOFDo4JlcBCItPyuMg6fSbpGNbZ2vh_wQwdIon3ePHRhIXfgMlBC0UddD8TWaSbJi3cTW3cmgDY5c8on9nRh0gZChW2TeBY2b8pF8bUAf4zCuQX4zqqu9c80y23oyyDN0nPEEGbL1VWCfBx-rpeEmuOa3txv0ZbEDuUhXebpTymBpZLCRJzGlWs2eDuHAi0Jd02y9Y2hoU2Aujh-3gXJ7Pqmdl2rQDGiko780UIMtl1do4Lyr11xeJMwQ2gKJApqDUwNgLLjT3Pg49RyOeXyzubtoHmouRibxk-0Jg2MgHS_zFx-DX9Di7yeqbZ6081AY_EN7IPuftsjAX1xLH8ctTYY85WYxne6OgxmiTlpeF-reAmuu--rnjjaZ8dD4c9y4exH5okAEVPrNtRX9rpJIM7TTeJTVwBxMTtRYQ0dLyi0rzlblSZWOfM3wlrXk95dq6X14vAtYfoOSlRJbhTX10LYMPJ8NywwhmW_My5EeB8wIHvXPliD-nsPrujLCmOA_SGuYIb2ifh5Y-yBb1luNS7AjP4aKn2r0Ls2JHvQtOA4wToSbCfHe6WPuHfo6QIdOivRIxp2D5gb2wAcg9I9qDiDd-V3MxozTXMNuHr1AXdkCX9qeOX8wrpondydNEy-fjm8S3bABT-FzkTcpBWHt-N-oh-R5ntw_Oxnn7QYQAug46YxhBhO2w98fF8Nz30NN8OGrZJywVQ2BB2NWntyEHw_kfr7hfYUPbzH5ylqRbGv2R4vYadprKUKsqonbtkwHNp8Rmnyf9lQ5ZDktkYyq7q_yFBHU2KzbGLzlm8xsLgIdrH6ZDB3rkOq_YWtChEx-FOy_0ji8fzZ1kRojqVTyFE6n7ijI8jbOIWvXVyYjDBWl99uvn1ogLm_SO37-zPc6HD9YEOLsbzteMpQQwwsQliUcKy3vM8sSk3c4xEHjkAnN_0lZwyIEQ-ysuMQH2shw5oouXlMUljrJwPqFpGukzGqO0TswquJTD6rYzK2_W6i8SQQmBdf5YiQ3pYYBR9ISJrkuZi4_MjBS02aJh8IGLo8XvNpuXLQDRVFRCytELqqc1QGjRuTyiN__airfKNbH2Iz-yqIiB7gvQqT8fP059j3gNWSGxD98VUEm3p9YD2519L6dBzECzl3ljt3jc5JHrmymxjnHcVGmza13aGq3PT4EiZVH1Nv0cqHGNOOPO79dd5TN52uBNfICKemxQ9bWOzxTeH65iJMh00BvK2MZgH39BZd1iNTEPHys779s2gYjmi3Lz3RQlWKs1v8ZLV4KcpZwbmJYwwOtZHG7DrQWAhfN9Fs4oYwudoZ5xB2bibcWyulZ8CF5g-yd_l-4ELeKeu0Dl923E_inJ_lf4K0eP6208yNR8ccdHrPDsu1_aGPXiJXLAvyyGAl0WKD3EMhNqd40htIAq-teaRqpsVAYGkHG9hx3ESLX_nGDNDuErAHAM5WnX7iB4U2vz2dmnyHjDUnI5v3d-NuN9LWUt6wt_cIuYBmp3lpQMQM4MbUn5cOvS6eX0rK9z7Q_1yX3lGE1dola8_dK7Wnr8lzm8yXYmkQesbvkBX492Pa08sUczOISq-wV1ZcJRjQ5nZ44nol93pV2V8Ok154AM7uSP4aA3VENhVpSCcXNmq1h6aoR1XtQUcd4';
  let reCaptchaToken;
  try {
    const websiteURL = 'https://chart.seatcloud.com';
    const websiteKey = '6Lf7x-8qAAAAACTG6gffMEWoXQoQhKS6UWTkG9cD';
    if(renderingInfo.isRecaptchaRequired){
      reCaptchaToken = await solveV3Wrapper(websiteURL, websiteKey, 'submit', 0.9);
    }
  } catch (e) {
    log('warning', `Failed to solve reCAPTCHA for ${email}, using fallback: ${e.message}`);
  }

  // 6. Build URL
  const generateSecureTraceId = () => {
    const hex = crypto.randomBytes(16).toString("hex");
    return `${Date.now()}-${hex}`;
  };

  const finalTracingId = tracing_id || generateSecureTraceId();
  tracingIds.set(email, finalTracingId);

  if (ENABLE_BROWSER) {
    console.log(`[PROCESS] Attempting to launch Playwright for ${email}...`);
    try {
      // Prioritize the resolved agent's proxy if it exists, otherwise get a random one
      let proxyUrl = null;
      if (agent && agent.proxy) {
        proxyUrl = agent.proxy.href;
      } else {
        proxyUrl = getRandomProxy();
      }

      const connection = await establishPlaywrightSocket(account, {
        holdToken,
        teamId,
        eventKey,
        reCaptchaToken,
        proxy: proxyUrl
      });
      
      // Wrap Playwright connection to match WebSocket interface expected by rest of the bot
      const socketWrapper = {
        send: (data) => connection.sendHold(JSON.parse(data)),
        close: () => connection.close(),
        terminate: () => connection.close(),
        on: (event, cb) => {
          if (event === 'message') {
            connection.page.on('websocket', ws => {
              ws.on('framereceived', frame => cb(frame.payload));
            });
          }
          if (event === 'close') connection.page.on('close', cb);
          if (event === 'error') connection.page.on('pageerror', cb);
        },
        readyState: WebSocket.OPEN,
        tracing_id: finalTracingId,
        _playwright: connection // Keep reference for cleanup
      };

      console.log(`✅ Playwright Browser connection established for ${email}`);
      accountSockets.set(email, socketWrapper);
      return socketWrapper;
    } catch (err) {
      log('error', `Playwright connection failed for ${email}: ${err.message}. Falling back to standard WebSocket.`);
    }
  }

  const url = `wss://api.seatcloud.com:8443/?event=${eventKey}&token=${holdToken}&teamID=${teamId}&reCaptchaToken=${reCaptchaToken}&tracingId=${finalTracingId}`;

  console.log(`trying to establish a new connection for account ${email}, url is ${url}`);

  try {
    const userAgent = new UserAgent().toString();
    const headers = {
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Connection': 'Upgrade',
      'Host': 'api.seatcloud.com:8443',
      'Origin': 'https://chart.seatcloud.com',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'websocket',
      'Sec-Fetch-Site': 'same-site',
      'Sec-Fetch-Storage-Access': 'none',
      'Sec-WebSocket-Extensions': 'permessage-deflate',
      'Sec-WebSocket-Version': '13',
      'Upgrade': 'websocket',
      'User-Agent': userAgent
    };

    const socket = new WebSocket(url, [], { agent, headers });
    let lastMessage = null;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.terminate();
          reject(new Error(`Timeout establishing connection for ${email}`));
        }
      }, 30000);

      socket.on('open', () => {
        clearTimeout(timeout);
        console.log(`✅ Socket connection established for ${email}`);
        socket.tracing_id = finalTracingId;
        accountSockets.set(email, socket);
        resolve(socket);
      });

      socket.on('message', (msg) => { lastMessage = msg; });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`⚠️ Socket error for ${email}:`, err.message);
        if (shouldReconnectIfFails) {
          tryConnect(account, agent, isSeason, null);
        } else {
          reject(err);
        }
      });
    });

    socket.on('close', (code, reason) => {
      console.log(`❌ Socket connection closed for ${email} (code: ${code}, reason: ${reason})`);
      accountSockets.delete(email);
      if (shouldReconnectIfFails) {
        tryConnect(account, agent, isSeason, null);
      }
    });

  } catch (e) {
    console.log(`error in socket establishment for ${email}:`, e.message);
  }
}
export function listenToSeats(url, options, agent, cb, preferredAccountSource, event_id) {
    let currentSocket = null;
    let currentEmail = null;
    let retryTimeoutId = null; // To store the timeout ID for retries

    const setupSocketListeners = (socketToUse, emailToUse) => {
        // Remove any existing listeners from this socket before adding new ones
        // This is crucial if we are re-using a socket that might have had previous listeners but we don't need it anymore
      //  socketToUse.removeAllListeners('open');
      //  socketToUse.removeAllListeners('message');
      //  socketToUse.removeAllListeners('close');
      //  socketToUse.removeAllListeners('error');

        socketToUse.on("open", () => {
            console.log(`✅ Connected to server for listening to seats using socket for ${emailToUse}`);
        });

        socketToUse.on("message", (data) => {
            let msg = data;
            try {
                msg = JSON.parse(data.toString());
              if (!msg.data) return;
                const structuredDataSimilarToV1 = {
                    ...msg,
                    data: JSON.stringify([
                        {
                            ...msg.data,
                            eventId: msg.eventId,
                            objectLabelOrUuid: msg.data.objects[0],
                            label: msg.data.objects[0],
                        }
                    ])
                };
                cb(structuredDataSimilarToV1);
            } catch (e) {
                console.log(e);
                return;
            }
        });

        socketToUse.on("close", (code, reason) => {
            console.log(`❌ Seat listener connection closed for ${emailToUse} (code: ${code}, reason: ${reason}). Attempting to find another socket...`);
            currentSocket = null; // Mark the current socket as closed
            currentEmail = null;
            // Clear any pending retry and immediately try to find another socket
            if (retryTimeoutId) clearTimeout(retryTimeoutId);
            retryTimeoutId = setTimeout(findAndUseSocket, 1000); // Retry quickly
        });

        socketToUse.on("error", (err) => {
            console.error(`⚠️ Seat listener error for ${emailToUse}:`, err.message);
            // If an error occurs, close the socket, which will trigger the 'close' event.
            if (socketToUse.readyState === WebSocket.OPEN || socketToUse.readyState === WebSocket.CONNECTING) {
                socketToUse.close();
            } else {
                // If already closing or closed, just trigger a retry
                if (retryTimeoutId) clearTimeout(retryTimeoutId);
                retryTimeoutId = setTimeout(findAndUseSocket, 1000); // Retry quickly
            }
        });
    };

    const findAndUseSocket = () => {
        // Clear any existing retry timeout before attempting to find a socket
        if (retryTimeoutId) {
            clearTimeout(retryTimeoutId);
            retryTimeoutId = null;
        }

        let foundSocket = null;
        let foundEmail = null;
        let initialEmail = null;
        let preferredAccount = null;

        if (typeof preferredAccountSource === 'function') {
            preferredAccount = preferredAccountSource();
            if (preferredAccount) {
                initialEmail = preferredAccount.split(':')[0];
            }
        } else if (typeof preferredAccountSource === 'string') {
            preferredAccount = preferredAccountSource;
            initialEmail = preferredAccount.split(':')[0];
        }

        // 1. Try to use the socket for the provided account (initialEmail)
        if (initialEmail && accountSockets.has(initialEmail)) {
            const potentialSocket = accountSockets.get(initialEmail);
            if (potentialSocket.readyState === WebSocket.OPEN) {
                foundSocket = potentialSocket;
                foundEmail = initialEmail;
                console.log(`✅ Using existing socket connection for preferred account ${initialEmail} to listen to seats`);
            } else {
                console.log(`⚠️ Preferred socket for ${initialEmail} is not open (${potentialSocket.readyState}). Looking for another.`);
            }
        } else if (initialEmail) {
            console.log(`_ No existing socket for preferred account ${initialEmail}. Looking for any available socket.`);
        } else {
            console.log(`_ No preferred account specified or found. Looking for any available socket.`);
        }

        // 2. If the initial socket isn't available, try to find any other open socket
        if (!foundSocket) {
            for (const [email, s] of accountSockets.entries()) {
                if (s.readyState === WebSocket.OPEN) {
                    foundSocket = s;
                    foundEmail = email;
                    console.log(`✅ Using another available socket connection for ${email} to listen to seats`);
                    break; // Found an open socket, use it
                }
            }
        }

        if (foundSocket) {
            // If we found a new socket, or the current one is still valid, set it up
            if (foundSocket !== currentSocket) { // Only re-setup listeners if it's a different socket
                currentSocket = foundSocket;
                currentEmail = foundEmail;
                setupSocketListeners(currentSocket, currentEmail);
            }
        } else {
            console.log(`_ No open socket found in accountSockets. Retrying in 5 seconds...`);
            // If no socket is found, retry after a delay
            retryTimeoutId = setTimeout(findAndUseSocket, 5000);
        }
    };

    // Initial connection attempt
    findAndUseSocket();

    return {
        refreshConnection: () => {
            console.log('Refreshing listener connection...');
            findAndUseSocket();
        }
    };
}
