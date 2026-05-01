
// C:\Users\Administrator\Desktop\webook_api_bot_unpack1>node test.js
// [8/24/2025, 03:22 PM] [INFO] Event Key: saudi-pro-league-week-1-damac-vs-al-hazem-spl-685149
// [8/24/2025, 03:22 PM] [INFO] {"eventId":"68a4656e9a331ae3c10b6047","chartKey":"772aad43-3ef7-422d-93c3-1
// 3c9acbc04b2"}
// hold token f5bbee68-48b0-44ea-80e3-67f927e93a8b
import { hold_object } from "../src/bot/socket_book.js";
import { createCookie } from "../src/lib/chunk-UFCTKZW2.js";
import { main } from "../src/utils/utils.js";
import { createTurnstileTask, getCapsolverTaskResult } from "../src/captcha/capsolver.js";
import {
  seatsioFetch,
  SeatsioDeobfuscator,
  getRequiredHeaders,
  fetchRenderingInfo,
  getOrCreateBrowserId,
} from "./seatsioclasses.js";
import {
  getKeyAsInt,
  getHashValue,
  getUnscrambleData,
  getUnscrambleDataOld,
} from "./deobfuscator.js";
import fs from "fs";
import { get } from "http";

import jwt from 'jsonwebtoken';





// botindex imports 
import { Worker } from "worker_threads";
import readline from "readline";
import path, { join } from "path";
import { fileURLToPath } from "url";
import { fetchClient } from "./chunk-K342ITN7.js";
import { generateRecaptchaToken } from "./chunk-W4XMZLKW.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ApiConfig } from "./chunk-LPIRJEMY.js";
async function init(){

  let __filename = '' //fileURLToPath(import.meta.url);
  let  __dirname = '' //path.dirname(__filename);
// import ended

  const colors = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    warning: "\x1b[33m",
    error: "\x1b[31m",
    reset: "\x1b[0m",
  };
const proxy = fs.readFileSync("sor/proxy.txt", "utf-8").split("\n")[300];
const agent = new HttpsProxyAgent(proxy);
  // this script based on the event : https://webook.com/ar/events/saudi-pro-league-week-1-damac-vs-al-hazem-spl-685149
  function log(level, ...args) {
    const options = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    const timestamp = new Date().toLocaleString(undefined, options);
    const color = colors[level] || colors.info;
    const message = args
      .map((arg) =>
        typeof arg === "object" && arg !== null ? JSON.stringify(arg) : arg
      )
      .join(" ");
    console.log(
      `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${
        colors.reset
      }`
    );
  }
  //note this could be different for different events this should be fetched from the event later.
  var Ta = {
    VITE_PUBLIC_RESELL_DOMAIN: "https://resell.webook.com",
    VITE_PUBLIC_APP_SOURCE: "rs",
    VITE_PUBLIC_SOCKET_URL: "https://realtime.webook.com:8443",
    VITE_PUBLIC_SOCKET_HTTP_URL: "https://realtime.webook.com",
    VITE_PUBLIC_SEATIO_WORKSPACE_KEY: "3d443a0c-83b8-4a11-8c57-3db9d116ef76",
    VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY: "66e63c10464382fb1f049832",
  };

  const CCOUNTS_FILE = path.join(__dirname, "sor", "acc.txt");
  const PROCESSED_ACCOUNTS_FILE = path.join(
    __dirname,
    "sor",
    "processed_acc.txt"
  );
  const SUCCESS_ACCOUNTS_FILE = path.join(__dirname, "sor", "succ_acc.txt");
  const FAILED_ACCOUNTS_FILE = path.join(__dirname, "sor", "fail_acc.txt");
  const PROXIES_FILE = path.join(__dirname, "sor", "proxy.txt");
  const URLS_FILE = path.join(__dirname, "sor", "urls.txt");
  const PROMPT_URL =
    process.env.PROMPT_URL ||
    "https://webook.com/ar/events/saudi-pro-league-week-1-damac-vs-al-hazem-spl-685149";
  const USE_PREPARED_ACCESS_TOKENS = true;
  const BLOCK_STARTING_NAMES = (process.env.BLOCK_NAME || "")
    .split(",")
    .map((name) => name.trim().toLowerCase());
  const tokenPerAccount = parseInt(process.env.TICKET_PER_ACCOUNT) || 1; // Default to 1 if not set
  const THREADS = process.env.THREADS || 5;

  let processedAccounts = 0;
  let heldSeats = 0;
  let statusInterval = null;
  ApiConfig.init({
    wbk: {
      api: "https://api.webook.com/api/v2",
      authApi: "https://api.webook.com/api/v2",
      apiToken:
        "e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2",
      appSource: "rs",
      paymentApi: "https://payments.webook.com/api/v2",
      ticketingDomain: "https://webook.com",
      socketApi: "https://realtime.webook.com",
      geoApi: "https://geolocation.webook.com",
    },
    hy: {
      api: "https://app.halayalla.com/api",
      apiToken:
        "vQZe4VNDqYraFI815Us0ZTtmHC9AKRdtMhEkJi2DXfeHhn1P3550jUBFqX7GFbJO",
    },
    blog: {
      api: "https://webook.com",
    },
    grecaptcha: {
      v3Key: "6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL",
    },
    cookie: {
      domain: "webook.com",
    },
  });

  const url = PROMPT_URL;
  const firstProxy = fs
    .readFileSync(PROXIES_FILE, "utf-8")
    .split("\n")[201]
    .trim();
  // const agent = null;

  const eventKeyFromPrompt = url.split("/")[5];
  log("info", "Event Key:", eventKeyFromPrompt);

    const isSeason = process.env.IS_SEASON === 'true' ;
  let eventDetailsUrl = isSeason
    ? `season-detail/${eventKeyFromPrompt}?lang=ar&visible_in=rs`
    : `event-detail/${eventKeyFromPrompt}?lang=ar&visible_in=rs`;

  let eventDetails = await fetchClient({
    url: eventDetailsUrl,
    includeAuth: false,
    agent,
  });
  //save to file system
  const eventDetailsFilePath = path.join(__dirname, "sor", "eventDetails.json");
  fs.writeFileSync(eventDetailsFilePath, JSON.stringify(eventDetails, null, 2));

  let eventId = eventDetails.data._id;
  let chartKey = eventDetails.data.seats_io.chart_key;
    log("info", { eventId, chartKey });
  let eventKey = isSeason
    ? eventDetails.data.seats_io.season_key
    : eventDetails.data.seats_io.event_key;
  let channelKeys = eventDetails.data.channel_keys.common || [];

//read the firest line from proxy.txt

createCookie({ name: 'token', value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjMzN2Q0MzRlNzBiZDZkMmE2MWY4MDM1NzhmZGM3ZjZkZjBhNTc5YWE0ZThiZjAyNDZiYWQ2ZDU5Y2E0OGJlNWIzMDhiODM1ZDQ5NmRkNGYyIn0.eyJhdWQiOiI2NzhmYmQ3MDRiMTk1NTg5MTEwYzczZDIiLCJqdGkiOiIzMzdkNDM0ZTcwYmQ2ZDJhNjFmODAzNTc4ZmRjN2Y2ZGYwYTU3OWFhNGU4YmYwMjQ2YmFkNmQ1OWNhNDhiZTViMzA4YjgzNWQ0OTZkZDRmMiIsImlhdCI6MTc1NTk2MTE2NCwibmJmIjoxNzU1OTYxMTY0LCJleHAiOjE3NTY1NjU5NjQsInN1YiI6IjY2NThjYjc0ZTA3YzA0ZTUyMDA4MTdkZiIsInNjb3BlcyI6W119.ScwxkxyD7SiC_CVAzIKj_ZOVbfu0t_Fx8sbbzNH1S8y9mlWV5qct8qKmucL_tnnF2ZXeVF2oEm_rTq7NO9QWn6c76XMhb9Zj9R_YEm7VkdqCh2RjhB7E8aV58lXnRZK3dl_Eq6dt4xMZREfyToLwRByNzKmmnaZ9LdeT4KquWG1UAx6sfT8qx1qr9yxrUHzqBrnXV9gTPjt9IfgCGltxjes1kKCfllzizhCs0F1jA33AsZgJINtJWhH3XKxKrvzhFuxL0JRYnq9EtH2ipNZMfV2i3pvIoSotCdhEwQCjMhzrPhgSO79KI8CtC9puMFSuI0_s_TEykqNd85xb-swltadXBt_zs4QfSWHjLzZWUPU0of9JQbh3U78oukMU_A8CspYbzkrvO9_XqKWFFSQXogLv_bFIN0ZwnWs_hfHevri71ipBzhI0yHvGwF0lIdD_SIXEUJxQrHV_PGLxSLEYylSztTJ6VwU__i6afGbvfJUDwIam0AxX6Tl4hGhmyrKnKm_Cs8IzdNMMwPYT8V_fj61212PUXI0Rar_P6TK2z3s8FqXyziDXMxuiXa3xgvAe9XNJYLEc0iyzvU9fqF-6UVBtf06ji5ZZu8vISCssmzAFglWT3ll5RR6MMaZW2kPjTkbxIMR9Qdk91yvupVH_Bv6_mU-9PP64aQYrmfuY7uQ', domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' });


    let holdTokenResponse = await fetchClient({
      url: '/seats/hold-token?lang=ar',
      includeAuth: true,
      includeToken: true,
      options: {
        method: 'POST',
        body: JSON.stringify(isSeason ? { season_id: eventId, lang: 'ar' } : { event_id: eventId, lang: 'ar' }),
      },
      agent
    });


    let tokenId = holdTokenResponse.data.token;
  console.log("hold token", tokenId);
}
async function published_deobfuscated() {
  const url =
    "https://api.seatcloud.com/adapter/sio/system/public/66e63c10464382fb1f049832/charts/772aad43-3ef7-422d-93c3-13c9acbc04b2/version/published";
  // const secretKey = "123f293d6f36402fa0f137c1924d6d8b"; // IMPORTANT: This key is likely incorrect for the fetched data. You need to find the actual secret key used for obfuscation in the original context. The sample output you provided indicates the data is still obfuscated.
  //workspacekey
  const workspacekey = "66e63c10464382fb1f049832";
  console.log("\n--- Fetching and Deobfuscating Data from URL ---");
  try {
    const response = await fetch(url, {
      headers: {
        "sec-ch-ua-platform": '"Windows"',
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        "sec-ch-ua":
          '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        "sec-ch-ua-mobile": "?0",
        accept: "*/*",
        origin: "https://chart.seatcloud.com",
        "sec-fetch-site": "same-site",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        referer: "https://chart.seatcloud.com/",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9",
        priority: "u=1, i",
      },
      body: null,
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the raw ArrayBuffer and convert to Uint8Array
    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    // Attempt deobfuscation using getUnscrambleData (assuming gzip then obfuscate)
    // You might need to try getUnscrambleDataOld if the order is different
    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      workspacekey,
      true
    );

    // console.log("Deobfuscated Content from URL:", deobfuscatedContent);

    // If the content is JSON, you can parse it
    try {
      const jsonData = JSON.parse(deobfuscatedContent);
      fs.writeFileSync(
        "published_details_decoded_test.json",
        JSON.stringify(jsonData, null, 2)
      );
      // console.log("Parsed JSON Data:", jsonData);
    } catch (jsonError) {
      console.warn(
        "Could not parse deobfuscated content as JSON:",
        jsonError.message
      );
    }
  } catch (error) {
    console.error(
      "Failed to fetch or deobfuscate data from URL:",
      error.message
    );
  }
}
// runExample();
// fetchAndDeobfuscateExample();

async function object_statuses() {
  //for testing  you should use the workspacekey from the event-details request
  //here we use the event-key as the secret key for deobfuscation
  const eventKey = "d8343593-98d3-4e50-b928-e3c46e452665";
  console.log("\n--- Fetching and Deobfuscating Data from URL ---");
  try {
    const response = await fetch(
      "https://api.seatcloud.com/adapter/sio/system/public/66e63c10464382fb1f049832/rendering-info/objects?event_key=d8343593-98d3-4e50-b928-e3c46e452665&channels=NO_CHANNEL,bebbc51a-c0e3-4583-9789-25d8dd25a63e",
      {
        headers: {
          "sec-ch-ua-platform": '"Windows"',
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
          "sec-ch-ua":
            '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          "sec-ch-ua-mobile": "?0",
          accept: "*/*",
          origin: "https://chart.seatcloud.com",
          "sec-fetch-site": "same-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
          referer: "https://chart.seatcloud.com/",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "en-US,en;q=0.9",
          priority: "u=1, i",
        },
        body: null,
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Get the raw ArrayBuffer and convert to Uint8Array
    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    // Attempt deobfuscation using getUnscrambleData (assuming gzip then obfuscate)
    // You might need to try getUnscrambleDataOld if the order is different
    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      eventKey,
      true
    );

    // console.log("Deobfuscated Content from URL:", deobfuscatedContent);

    // If the content is JSON, you can parse it
    try {
      const jsonData = JSON.parse(deobfuscatedContent);
      fs.writeFileSync(
        "object_statuses_decoded_test.json",
        JSON.stringify(jsonData, null, 2)
      );
      // console.log("Parsed JSON Data:", jsonData);
    } catch (jsonError) {
      console.warn(
        "Could not parse deobfuscated content as JSON:",
        jsonError.message
      );
    }
  } catch (error) {
    console.error(
      "Failed to fetch or deobfuscate data from URL:",
      error.message
    );
  }
}

//team id is the same as workspace key
// await object_statuses();
async function holdSeat(){
const url = "wss://api.seatcloud.com:8443/?event=d8343593-98d3-4e50-b928-e3c46e452665&token=e660cfd4-bba3-47bc-9254-64e3ef28d8ea&teamID=66e63c10464382fb1f049832"
  const token = "e660cfd4-bba3-47bc-9254-64e3ef28d8ea";
const holdRequest = {
  action: "hold-object",
  objects: [{ objectId: "E", quantity: 3 }],
  token: token
};  
const isHeld = await hold_object(url, holdRequest);
console.log("isHeld", isHeld);
}
// init();
// getToken();

// holdSeat();

function decodeFile(){
  const eventKey = "4b876bfe-1f73-42bb-9bc8-929f4581f2c2";
  const scrambledData = fs.readFileSync("./objectstatuses.bin");
  const scrambledDataUint8Array = new Uint8Array(scrambledData);
  getUnscrambleData(scrambledDataUint8Array, eventKey, true).then((deobfuscatedContent) => {
      const jsonData = JSON.parse(deobfuscatedContent);
      fs.writeFileSync(
        "./objectstatuses.bin_decoded.json",
        JSON.stringify(jsonData, null, 2)
      );
      console.log("Parsed JSON Data from file:", jsonData);
    })
  
}
// decodeFile();

// fetchRenderingInfo();


function sendTGMessage(){

// const chatIds = ['-1002922665235']   turki 
          //
const chatIds = ['-1003112777348'] //abosaid
        async function sendToTelegram(message, chatIdOverride) {
  const apiKey =process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${apiKey}/sendMessage`;
  const targets = chatIdOverride ? [chatIdOverride] : chatIds;
  for (const chatId of targets) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        }),
      });
      if (response.ok) {
        console.log('success', `✅ تم إرسال رسالة التليجرام بنجاح إلى ${chatId}!`);
      } else {
        const errorData = await response.json();
        console.log('error', `❌ فشل إرسال رسالة التليجرام إلى ${chatId}: ${response.status} ${response.statusText}`, errorData);
      }
    } catch (error) {
      console.log('error', `❌ خطأ في إرسال رسالة التليجرام إلى ${chatId}:`, error);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}
sendToTelegram("testing");
}


//
// sendTGMessage();

// testing callbacks

function runCB(cb){
  cb();
}
function main1(){
  let h = 'hh';
  function i(){
    console.log(h);
  }
  runCB(i);
}
// main();
    // const VITE_PUBLIC_TURNSTILE_SITE_KEY = "0x4AAAAAAAw0ci3Vi2Xv3txt";
    // const websiteURL = 'https://api.webook.com/api/v2'  ;
    // const turnstileTaskId = await createTurnstileTask(websiteURL, VITE_PUBLIC_TURNSTILE_SITE_KEY  );
    // // console.log(turnstileTaskId);
    
    // const turnstileToken = await getCapsolverTaskResult(turnstileTaskId.taskId);  
    // const turnstileTokenResult = turnstileToken.solution.token;

// testing queue
async  function queue(){
  function base64UrlEncode(obj) {
    const str = JSON.stringify(obj);
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

  const body = JSON.stringify({
    // event_id:'68dc2804e2cf51f6b7008bdf',
    event_id:'68b1f589bda8cb1841058465',
    
    lang:'ar',
    turnstile:turnstileTokenResult

    

  })
  try {
const res = await fetch("https://api.webook.com/api/v2/event-detail/rsl-25-26-al-ittihad-vs-al-ahli-384922/hold-token?lang=ar", {
  "headers": {
    "accept": "application/json",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    "accept-language": "en-US,en;q=0.9,ar;q=0.8,ar-IQ;q=0.7,de;q=0.6",
    "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjJhODcyNzQ1YTBmOTA2NTA1NDRmNzQyMmFmNDM2YmVlYmU0MzM4ZWY4MjZlY2JlODA3MzRiMTY3Mjc3ZGI5NDc0MjU1ZmY1YzE3MWRkOTk4In0.eyJhdWQiOiI2NzhmYmQ3MDRiMTk1NTg5MTEwYzczZDIiLCJqdGkiOiIyYTg3Mjc0NWEwZjkwNjUwNTQ0Zjc0MjJhZjQzNmJlZWJlNDMzOGVmODI2ZWNiZTgwNzM0YjE2NzI3N2RiOTQ3NDI1NWZmNWMxNzFkZDk5OCIsImlhdCI6MTc2MTI1MDk0OCwibmJmIjoxNzYxMjUwOTQ4LCJleHAiOjE3NjE4NTU3NDgsInN1YiI6IjY4ZTI2NWIyZGMxYzYzYjdmYzAwODI5NSIsInNjb3BlcyI6W119.F3FHK7L82bxvZgbbJWveJJCciAVUtnfgmv-lmLxxR5Dg8BCI4PLhvVBCZH_KZBujilqf5hxk3Lxd-aeDp_Vv7zQFbDEccUwDk3njfj_11oLFfKoO9GarWTNCUl4k6TJUgfvTTYuNx4ZGkIhCjmwKzvdL42PO54OQpce0GY5sej7yZ8pTp-k41PrjFVPPimTkfoWpNVSqpEURZa1E-8QyN-gkl1AT5CHWv2UXHwac0rycGLlv64yIuHDiSX871MDuU5-N9yWTcxV6_nHkL7B2co1bFoeIMzQV0A67nktLTDZtbNenOpvRocyFR3UHISdZPcUb9sMXRNDIpxsCflN3HONjgfBX3PWDHYzASXi_lanZLwvSWbsWBc8aOQqwnGEASQNo_xuILDYlNs6GdazhRnbrTrXGlL1qMx0FNNaFm_xr-BMarqm43_5-ebE0GLdW9j2aMwhmlZosa-lK-3fyOYK7_day7q2JDHypuWNV51S-E51iOjX_YQGK7_J5UzQELR75BaK5kT3UbRFI1p_bUmswhEu0xColAyWWOiJCR_-MvHR3y9UVF8PbwZUXL-9vFzXt_OuMcycFpM8mZGWH3LS5UumRnbhpHTNOAo5SxNq8z84ZAiTTAFWc2CPP5lECB7C54T3UStL-6G0jzA35vhCZ0kCOh-gmUWqP5CWhkWg",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "host": "api.webook.com",
    "origin": "https://webook.com",
    "sec-fetch-site": "same-site",
    // this is a new token forrsl-25-26-al-ittihad-vs-al-ahli-38492  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlIjoxNzYxNzY0MTk4LCJuIjo5OTcwMSwidSI6IjYzLjczNS9pcmFmYVMgMC4wLjAuMTQxL2Vtb3JoQyApb2tjZUcgZWtpbCAsTE1USEsoIDYzLjczNS90aUtiZVdlbHBwQSApN181MV8wMSBYIFNPIGNhTSBsZXRuSSA7aHNvdG5pY2FNKCAwLjUvYWxsaXpvTSJ9.9fs4XjdChqdeL-4F0cbYpDpTlRmj8uC7UtGpz9BK6zQ	
    "token": "e9aac1f2f0b6c07d6be070ed14829de684264278359148d6a582ca65a50934d2",
    // "cookie": " _q_session_-event-detail-al-nassr-vs-al-ittihad-king-cup-r16-575=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlIjoxNzYxNTc2OTM1LCJuIjo5MTE2MjYsInUiOiI2My43MzUvaXJhZmFTIDAuMC4wLjE0MS9lbW9yaEMgKW9rY2VHIGVraWwgLExNVEhLKCA2My43MzUvdGlLYmVXZWxwcEEgKTdfNTFfMDEgWCBTTyBjYU0gbGV0bkkgO2hzb3RuaWNhTSggMC41L2FsbGl6b00ifQ.2OXgRAfqcm-H-2jT5rBHDlHqsawt050_50sAJx8lzs0"
    "cookie": "_q_session_-event-detail-rsl-25-26-al-ittihad-vs-al-ahli-384922=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlIjoxNzYyMTAyNDg5LCJuIjoxNTM0MSwidSI6IjYzLjczNS9pcmFmYVMgMC4wLjAuMTQxL2Vtb3JoQyApb2tjZUcgZWtpbCAsTE1USEsoIDYzLjczNS90aUtiZVdlbHBwQSApN181MV8wMSBYIFNPIGNhTSBsZXRuSSA7aHNvdG5pY2FNKCAwLjUvYWxsaXpvTSJ9.bHKdOhfKzydDxkpWvV0yrJhHutoJRUZANN8HSvwNJSA"
  },
  "body":body,
  "method": "POST"
});

    const resJson = await res.json();
    // write it to file
    fs.writeFileSync('testing_queue.json', JSON.stringify(resJson, null, 2));
  } catch (error) {
    console.error('Error fetching event details:', error);
    
  }
}
// queue();

// reverse engineering JWT
function decodeJwt(){
    
  // const jwt = require('jsonwebtoken');
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlIjoxNzYyMzQ3MDI2LCJuIjo1NjgzLCJ1IjoiNjMuNzM1L2lyYWZhUyAwLjAuMC4xNDEvZW1vcmhDIClva2NlRyBla2lsICxMTVRISyggNjMuNzM1L3RpS2JlV2VscHBBICk3XzUxXzAxIFggU08gY2FNIGxldG5JIDtoc290bmljYU0oIDAuNS9hbGxpem9NIn0.MmcFmQtIjLW6xtUW4V5rKiPy4A0OA8Vqff8ietKQiiU';
  console.log(atob(token.split('.')[0]));
  // const secret = 'abdulmajeed-abdullah-maestro-waleed-fayed-rs25-tickets';
  // try {
  //     const decoded = jwt.verify(token, secret);
  //     console.log('Valid signature:', decoded);
  // } catch (err) {
  //     console.log('Invalid signature:', err.message);
  // }
}
//decodeJwt();
async function testTimeout(){
console.log('hi before');
const h = await new Promise(resolve => setTimeout(function(){const h = 'hi';  resolve(h)},3000));
console.log('h value is',h);
console.log('hi after');
}
