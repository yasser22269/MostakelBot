import fs from "fs";
import path from "path";
// import fetch from 'node-fetch';
import { getUnscrambleData } from "./deobfuscator.js";
import { fetchClient } from "../lib/chunk-K342ITN7.js";
import { HttpsProxyAgent } from "https-proxy-agent";

const DATA_DIR = process.env.DATA_DIR || 'data';
const ROOT_DIR = process.cwd();

const Ta = {
  VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY: "66e63c10464382fb1f049832",
};

function log(level, ...args) {
  const colors = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    warning: "\x1b[33m",
    error: "\x1b[31m",
    reset: "\x1b[0m",
  };
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

function generateTraceId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 13)}`;
}

const V3_HEADERS = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9,ar;q=0.8,ar-IQ;q=0.7,de;q=0.6",
  "cache-control": "no-cache",
  "pragma": "no-cache",
  "sec-ch-ua": "\"Google Chrome\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Linux\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "Referer": "https://chart.seatcloud.com/"
};

export async function fetchAndDeobfuscatePublishedDetails(chartKey, workspaceKey, agent) {
  const url = `https://api.seatcloud.com/adapter/sio/system/public/${workspaceKey}/charts/${chartKey}/version/published`;
  log("info", "Fetching and Deobfuscating Published Details from URL:", url);
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
      agent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      workspaceKey,
      true
    );

    try {
      const jsonData = JSON.parse(deobfuscatedContent);
      const publishedFilePath = path.join(ROOT_DIR, DATA_DIR, "sor", "published.json");
      fs.writeFileSync(publishedFilePath, JSON.stringify(jsonData, null, 2));
      log("success", "Published details deobfuscated and saved to", publishedFilePath);
      return jsonData;
    } catch (jsonError) {
      log("error", "Could not parse deobfuscated content as JSON:", jsonError.message);
      throw jsonError;
    }
  } catch (error) {
    log("error", "Failed to fetch or deobfuscate published details:", error.message);
    throw error;
  }
}

export async function fetchAndDeobfuscateObjectStatuses(eventKey, workspaceKey, channelKeys, agent, team) {
  const useChannel = process.env.USE_CHANNELS_IN_OBJECT_STATUS_FETCH === 'true';
  const channelsParam = channelKeys.length > 0 ? `,${channelKeys.join(',')}` : '';
  const url = `https://api.seatcloud.com/adapter/sio/system/public/${workspaceKey}/rendering-info/objects?event_key=${encodeURIComponent(eventKey)}${useChannel ? '&channels=NO_CHANNEL'+ channelsParam:''}`;
  log("info", "Fetching and Deobfuscating Object Statuses from URL:", url);
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
      agent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      eventKey, // Using eventKey as secret key for object statuses
      true
    );

    try {
      const jsonData = JSON.parse(deobfuscatedContent);
      const objectStatusesFilePath = path.join(ROOT_DIR, DATA_DIR, "sor", `objectStatuses_${team}.json`);
      fs.writeFileSync(objectStatusesFilePath, JSON.stringify(jsonData, null, 2));
      log("success", "Object statuses deobfuscated and saved to", objectStatusesFilePath);
      return jsonData;
    } catch (jsonError) {
      log("error", "Could not parse deobfuscated content as JSON:", jsonError.message);
      throw jsonError;
    }
  } catch (error) {
    log("error", "Failed to fetch or deobfuscate object statuses:", error.message);
    //throw error;
  }
}

export async function fetchRenderingInfoData(eventKey, workspaceKey, agent) {
  const renderingInfoURL = `https://api.seatcloud.com/adapter/sio/system/public/${workspaceKey}/rendering-info/?event_key=${encodeURIComponent(eventKey)}`;
  console.log({renderingInfoURL});
  
  log("info", "Fetching Rendering Info from URL:", renderingInfoURL);
  try {
    const response = await fetch(renderingInfoURL, {
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
      agent,
    });

    // const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} text `);
    }
    const jsonData = await response.json();
    const renderingInfoFilePath = path.join(ROOT_DIR, DATA_DIR, "sor", "renderingInfo.json");
    fs.writeFileSync(renderingInfoFilePath, JSON.stringify(jsonData, null, 2));
    log("success", "Rendering info fetched and saved to", renderingInfoFilePath);
    return jsonData;
  } catch (error) {
    log("error", "Failed to fetch rendering info:", error.message);
    throw error;
  }
}

export async function fetchAndDeobfuscatePublishedDetailsV3(chartKey, workspaceKey, agent) {
  const traceId = generateTraceId();
  const url = `https://api.seatcloud.com/api/v2/${workspaceKey}/map/${chartKey}/data?trace_id=${traceId}&plain=true`;
  log("info", "Fetching and Deobfuscating Published Details V3 from URL:", url);
  try {
    const response = await fetch(url, {
      headers: V3_HEADERS,
      method: "GET",
      agent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      workspaceKey,
      false
    );

    const jsonData = JSON.parse(deobfuscatedContent);
    const publishedFilePath = path.join(ROOT_DIR, DATA_DIR, "sor", "published.json");
    fs.writeFileSync(publishedFilePath, JSON.stringify(jsonData, null, 2));
    log("success", "Published details V3 deobfuscated and saved to", publishedFilePath);
    return jsonData;
  } catch (error) {
    log("error", "Failed to fetch or deobfuscate published details V3:", error.message);
    throw error;
  }
}

export async function fetchAndDeobfuscateObjectStatusesV3(eventKey, workspaceKey, channelKeys, agent, team) {
  const traceId = generateTraceId();
  const channelsParam = channelKeys.join(',');
  const url = `https://api.seatcloud.com/api/v2/${workspaceKey}/event/${eventKey}/items?allocations=${channelsParam}&trace_id=${traceId}&plain=true`;
  log("info", "Fetching and Deobfuscating Object Statuses V3 from URL:", url);
  try {
    const response = await fetch(url, {
      headers: V3_HEADERS,
      method: "GET",
      agent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      eventKey, // Using eventKey as secret key for object statuses
      false
    );

    const jsonData = JSON.parse(deobfuscatedContent);
    const objectStatusesFilePath = path.join(ROOT_DIR, DATA_DIR, "sor", `objectStatuses_${team}.json`);
    fs.writeFileSync(objectStatusesFilePath, JSON.stringify(jsonData, null, 2));
    log("success", "Object statuses V3 deobfuscated and saved to", objectStatusesFilePath);
    return jsonData;
  } catch (error) {
    log("error", "Failed to fetch or deobfuscate object statuses V3:", error.message);
  }
}

export async function fetchRenderingInfoDataV3(eventKey, workspaceKey, channelKeys, agent) {
  const traceId = generateTraceId();
  const channelsParam = channelKeys.join(',');
  const url = `https://api.seatcloud.com/api/v2/${workspaceKey}/event/${eventKey}?allocations=${channelsParam}&trace_id=${traceId}&plain=true`;
  log("info", "Fetching and Deobfuscating Rendering Info V3 from URL:", url);
  try {
    const response = await fetch(url, {
      headers: V3_HEADERS,
      method: "GET",
      agent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const scrambledDataUint8Array = new Uint8Array(arrayBuffer);

    const deobfuscatedContent = await getUnscrambleData(
      scrambledDataUint8Array,
      eventKey, // Using eventKey as secret key for rendering info (matches bundle line 9797)
      false
    );

    const jsonData = JSON.parse(deobfuscatedContent);
    const renderingInfoFilePath = path.join(ROOT_DIR, DATA_DIR, "sor", "renderingInfo.json");
    fs.writeFileSync(renderingInfoFilePath, JSON.stringify(jsonData, null, 2));
    log("success", "Rendering info V3 deobfuscated and saved to", renderingInfoFilePath);
    return jsonData;
  } catch (error) {
    log("error", "Failed to fetch or deobfuscate rendering info V3:", error.message);
    throw error;
  }
}
