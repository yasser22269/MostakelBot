import 'dotenv/config';
const PROMPT_URL = process.env.PROMPT_URL;
const forceChannelType = process.env.FORCE_CHANNEL_TYPE || ''; // 'home' or 'away'
let botVersion = process.env.BOT_VERSION;

import fs from 'fs';
import path from 'path';
import { fetchClient } from '../src/lib/chunk-K342ITN7.js';
import { seatsioFetch, SeatsioDeobfuscator, getRequiredHeaders, fetchRenderingInfo, getOrCreateBrowserId } from '../src/seatsio/seatsio_classes.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { ApiConfig } from '../src/lib/chunk-LPIRJEMY.js';
import { fetchAndDeobfuscatePublishedDetails,
  fetchRenderingInfoData,
  fetchAndDeobfuscateObjectStatuses,
  fetchAndDeobfuscatePublishedDetailsV3,
  fetchAndDeobfuscateObjectStatusesV3,
  fetchRenderingInfoDataV3
} from "../src/seatsio/seatsio_utils.js";

import { browserFetch } from '../src/utils/browser_fetch.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = process.env.DATA_DIR || 'data';

const DEFAULT_SEATCLOUD_WORKSPACE_KEY = "66e63c10464382fb1f049832";
const workspace_key = process.env.VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY || process.env.SEATCLOUD_WORKSPACE_KEY || DEFAULT_SEATCLOUD_WORKSPACE_KEY;
function log(level, ...args) {
  const colors = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    warning: "\x1b[33m",
    error: "\x1b[31m", reset: "\x1b[0m",
  };
  const options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  };
  const timestamp = new Date().toLocaleString(undefined, options);
  const color = colors[level] || colors.info;
  const message = args.map(arg => (typeof arg === 'object' && arg !== null) ? JSON.stringify(arg) : arg).join(' ');
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

function extractEventSlugFromPromptUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const queryEvent = parsed.searchParams.get('event');
    if (queryEvent) {
      return queryEvent;
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    const knownMarkers = ['events', 'event-detail', 'season-detail'];
    const markerIndex = parts.findIndex((part) => knownMarkers.includes(part));
    if (markerIndex !== -1 && parts[markerIndex + 1]) {
      return parts[markerIndex + 1];
    }
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];
      if (lastPart === 'book' && secondLastPart) {
        return secondLastPart;
      }
    }
    return parts[1] || parts[0] || '';
  } catch (error) {
    return '';
  }
}

function hasEventQueryParam(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return Boolean(parsed.searchParams.get('event'));
  } catch (error) {
    return false;
  }
}

function maskValue(value, visible = 8) {
  if (!value) return '';
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function parseCookieForLog(cookieHeader) {
  if (!cookieHeader) {
    return { rawLength: 0, tokenPresent: false, tokenLength: 0, tokenPreview: '' };
  }
  const tokenPart = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith('token='));
  const tokenValue = tokenPart ? tokenPart.slice('token='.length) : '';
  return {
    rawLength: cookieHeader.length,
    tokenPresent: Boolean(tokenValue),
    tokenLength: tokenValue.length,
    tokenPreview: maskValue(tokenValue)
  };
}

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

async function prepareBookingInfo() {
  try {
    const PROXIES_FILE = path.join(process.cwd(), DATA_DIR, 'sor', 'proxy.txt');
    const PROXY_INDEX_FILE = path.join(process.cwd(), DATA_DIR, 'sor', 'proxy_index.txt');

    const url = PROMPT_URL;
    const proxies = fs.readFileSync(PROXIES_FILE, 'utf-8').split('\n').filter(Boolean);
    let proxyIndex = 0;
    if (fs.existsSync(PROXY_INDEX_FILE)) {
        proxyIndex = parseInt(fs.readFileSync(PROXY_INDEX_FILE, 'utf-8')) || 0;
    }

    const proxy = proxies.length > 0 ? proxies[proxyIndex % proxies.length] : null;
    let agent = proxy ? new HttpsProxyAgent(proxy) : null;

    if (agent) {
        log('info', `Using proxy: ${proxy}`);
    } else {
        log('warning', 'No proxies found, running without proxy.');
    }

    proxyIndex++;
    fs.writeFileSync(PROXY_INDEX_FILE, proxyIndex.toString());

    if (!url) {
        log('error', 'PROMPT_URL environment variable is not set');
        return;
    }

    const isAhlanByEnv = process.env.IS_AHLAN === 'true' || process.env.isAhlan === 'true';
    const isAhlanByPromptUrl = hasEventQueryParam(url);
    const isAhlan = isAhlanByEnv || isAhlanByPromptUrl;
    const eventSlugFromPrompt = extractEventSlugFromPromptUrl(url);
    const eventKeyFromPrompt = eventSlugFromPrompt || url.split('/')[5];
    log('info', 'Event Key/Slug:', eventKeyFromPrompt);

    const isSeason = process.env.IS_SEASON === 'true' ;
    console.log({isSeason});
    
    log('info', 'Fetching event details...');
    let eventDetails;
    if (isAhlan) {
      const queueToken = process.env.AHLAN_QUEUE_TOKEN || '';
      const normalCookie = process.env.PREPARE_TOKEN_COOKIE || '';
      const userAgent = process.env.USER_AGENT || '';
      const ahlanEventUrl = `https://www.ahlan.sa/api/ticketing/eventd?organizationSlug=${encodeURIComponent(eventKeyFromPrompt)}&queue-token=${encodeURIComponent(queueToken)}`;
      const ahlanHeaders = {
        ...(userAgent ? { 'user-agent': userAgent } : {}),
        ...(normalCookie ? { cookie: normalCookie } : {})
      };
      const maxAhlanRetries = Number(process.env.AHLAN_EVENT_RETRIES || 2);
      const ahlanTimeoutMs = Number(process.env.AHLAN_EVENT_TIMEOUT_MS || 30000);
      const cookieInfo = parseCookieForLog(normalCookie);
      log('info', '[Ahlan:eventDetail] Request config', {
        url: ahlanEventUrl,
        timeoutMs: ahlanTimeoutMs,
        retries: maxAhlanRetries,
        queueTokenLength: queueToken.length,
        queueTokenPreview: maskValue(queueToken),
        userAgentLength: userAgent.length,
        userAgentPreview: maskValue(userAgent, 24),
        cookieInfo
      });

      let ahlanEventRes;
      let lastAhlanError;
      const useBrowserForAhlan = process.env.USE_BROWSER_FOR_AHLAN === 'true';

      for (let attempt = 1; attempt <= maxAhlanRetries; attempt++) {
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(`Ahlan eventDetail timeout after ${ahlanTimeoutMs}ms`), ahlanTimeoutMs);
        try {
          log('info', `[Ahlan:eventDetail] Attempt ${attempt}/${maxAhlanRetries} started ${useBrowserForAhlan ? '(via Browser)' : ''}`);

          if (useBrowserForAhlan) {
            ahlanEventRes = await browserFetch(ahlanEventUrl, {
              method: 'GET',
              headers: ahlanHeaders
            });
          } else {
            ahlanEventRes = await fetch(ahlanEventUrl, {
              method: 'GET',
              headers: ahlanHeaders,
              agent,
              signal: controller.signal
            });
          }
          clearTimeout(timeout);
          const elapsedMs = Date.now() - startedAt;
          log('info', `[Ahlan:eventDetail] Attempt ${attempt} completed`, {
            status: ahlanEventRes.status,
            ok: ahlanEventRes.ok,
            elapsedMs
          });
          if (ahlanEventRes.ok) {
            break;
          }
          const responsePreview = (await ahlanEventRes.text());

          //write it to tests/ folder 
          //fs.writeFileSync(path.join(process.cwd(), 'tests', 'bot_fetch_responses', `ahlan_event_detail_response_${attempt}.txt`), responsePreview);

          throw new Error(`Ahlan event detail returned ${ahlanEventRes.status}. Body preview: ${responsePreview.slice(0, 1500)}`);
        } catch (error) {
          clearTimeout(timeout);
          lastAhlanError = error;
          const elapsedMs = Date.now() - startedAt;
          log('error', `[Ahlan:eventDetail] Attempt ${attempt} failed`, {
            elapsedMs,
            name: error?.name,
            message: error?.message,
            causeName: error?.cause?.name,
            causeMessage: error?.cause?.message,
            causeCode: error?.cause?.code,
            nestedErrorsCount: Array.isArray(error?.cause?.errors) ? error.cause.errors.length : 0
          });
          if (attempt < maxAhlanRetries) {
            const backoffMs = attempt * 1500;
            log('warning', `[Ahlan:eventDetail] Retrying after ${backoffMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }
      if (!ahlanEventRes || !ahlanEventRes.ok) {
        throw lastAhlanError || new Error('Ahlan event detail failed without response');
      }
      if (!ahlanEventRes.ok) {
        throw new Error(`Ahlan event detail failed with status ${ahlanEventRes.status}`);
      }
      eventDetails = await ahlanEventRes.json();
    } else {
      const eventDetailsUrl = isSeason ? `season-detail/${eventKeyFromPrompt}?lang=ar&visible_in=rs` : `event-detail/${eventKeyFromPrompt}?lang=ar&visible_in=rs`;
      eventDetails = await fetchClient({
        url: eventDetailsUrl,
        includeAuth: false,
        agent
      });
    }
    const eventDetailsFilePath = path.join(process.cwd(), DATA_DIR, 'sor', 'eventDetails.json');
    fs.writeFileSync(eventDetailsFilePath, JSON.stringify(eventDetails, null, 2));
    log('success', 'Event details fetched and saved.');
    const eventData = eventDetails?.data || eventDetails;

    const workspaceKey = eventData?.seats_io?.workspace_key || workspace_key;

        const scriptData = await fetchRenderingInfo('https://cdn-eu.seatsio.net/chart.js', '', getOrCreateBrowserId(), {}, false, agent);
        const scriptContent = await scriptData.text();
        const chartTokenMatch = scriptContent.match(/seatsio\.chartToken\s*=\s*'([^']+)'/);
        const chartToken = chartTokenMatch ? chartTokenMatch[1] : '';

        let chartKey = eventData.seats_io.chart_key;
        const eventKey = isSeason ? eventData.seats_io.season_key : eventData.seats_io.event_key;
  console.log({chartKey,chartToken})
        const browserId = getOrCreateBrowserId();
      if (!chartToken) {
        console.log('Chart token not found in script content using v2...');
        // use the v2 
        botVersion = 'v2';
      }
        let channelKeys = eventData.channel_keys;
        let homeTeamKey, awayTeamKey;

        let channelKeyForHomeTeam ;
        let channelKeyForAwayTeam ;
        let channelKeyCommon = channelKeys['common']?.[0];

        let channelKeysToCheck ;
    function setupChannelKeys(channelType = '') {
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
        channelKeysToCheck = ["NO_CHANNEL", channelKeyCommon, channelKeyForHomeTeam].filter(Boolean);
        // currentChannelKey = homeTeamKey;
    }

      setupChannelKeys();
      let channelKeysToCheckHome = ["NO_CHANNEL", channelKeyCommon, channelKeyForHomeTeam].filter(Boolean);
      let channelKeysToCheckAway = ["NO_CHANNEL", channelKeyCommon, channelKeyForAwayTeam].filter(Boolean);
    if (botVersion === 'v1') {
      try {

        const renderingInfoURL = `https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/rendering-info?event_key=${encodeURIComponent(eventKey)}`;
        let renderingInfoRes = await fetchRenderingInfo(renderingInfoURL, chartToken, browserId, { method: 'GET' }, true, agent);
        const renderingInfoResJson = await renderingInfoRes.json();
        const drawingVersion = renderingInfoResJson.drawingVersion;
        const renderingInfoFilePath = path.join(process.cwd(), DATA_DIR, 'sor', 'renderingInfo.json');
        fs.writeFileSync(renderingInfoFilePath, JSON.stringify(renderingInfoResJson, null, 2));
        log('success', 'Rendering info fetched and saved.');
        // chartKey = renderingInfoResJson.chartKey;

      try {

        const publishedURL = `https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/charts/${chartKey}/published/${drawingVersion?drawingVersion:''}`;
        console.log({publishedURL})
         const publishedRes = await fetchRenderingInfo(publishedURL, chartToken, browserId, { method: 'GET' }, true, agent);
        
        const publishedBuffer = await publishedRes.arrayBuffer();
        const publishedJson = SeatsioDeobfuscator.deobfuscate(publishedBuffer, chartKey);
        const publishedJsonParsed = JSON.parse(publishedJson);
        const publishedFilePath = path.join(process.cwd(), DATA_DIR, 'sor', 'published.json');
        fs.writeFileSync(publishedFilePath, JSON.stringify(publishedJsonParsed, null, 2));
        log('success', 'Published info fetched and saved.');
      } catch (error) {
        console.log(error)
        
      }
        const objectStatusesURL_home = `https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/events/object-statuses?event_key=${encodeURIComponent(eventKey)}&channel_key=${channelKeysToCheckHome.join(',')}`;

        const objectStatusesURL_away = `https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/events/object-statuses?event_key=${encodeURIComponent(eventKey)}&channel_key=${channelKeysToCheckAway.join(',')}`;

        const objectStatusesResHome = await fetchRenderingInfo(objectStatusesURL_home, chartToken, browserId, { method: 'GET' }, true, agent);
        console.log('fetched objectStatuses for home')
        const objectStatusesBuffer = await objectStatusesResHome.arrayBuffer();
        const objectStatusesJson = SeatsioDeobfuscator.deobfuscate(objectStatusesBuffer, chartKey);
        const objectStatusesJsonParsed = JSON.parse(objectStatusesJson);
        const objectStatusesFilePath = path.join(process.cwd(), DATA_DIR, 'sor', 'objectStatuses_home.json');
        fs.writeFileSync(objectStatusesFilePath, JSON.stringify(objectStatusesJsonParsed, null, 2));
        // log('success', 'Object statuses fetched and saved for v1.');

        const objectStatusesResAway = await fetchRenderingInfo(objectStatusesURL_away , chartToken, browserId, { method: 'GET' }, true, agent);
        console.log('fetched objectStatuses for away')
        const objectStatusesBufferAway = await objectStatusesResAway.arrayBuffer();
        const objectStatusesJsonAway = SeatsioDeobfuscator.deobfuscate(objectStatusesBufferAway, chartKey);
        const objectStatusesJsonParsedAway = JSON.parse(objectStatusesJsonAway);
        const objectStatusesFilePathAway = path.join(process.cwd(), DATA_DIR, 'sor', 'objectStatuses_away.json');
        fs.writeFileSync(objectStatusesFilePathAway, JSON.stringify(objectStatusesJsonParsedAway, null, 2));
        // log('success', 'Object statuses fetched and saved for v1.');

        
      } catch (error) {
        console.error('An error occurred during reCAPTCHA solving process:', error);
        
      }
      
    } else if (botVersion === 'v3') {
        const chartKey = eventData.seats_io.chart_key;
        const eventKey = isSeason ? eventData.seats_io.season_key : eventData.seats_io.event_key;

        console.log({chartKey, workspaceKey, botVersion})
        await fetchAndDeobfuscatePublishedDetailsV3(chartKey, workspaceKey, agent);
        await fetchRenderingInfoDataV3(eventKey, workspaceKey, channelKeysToCheckHome, agent);

        log('warning','start fetching object statuses V3', eventKey, workspaceKey, channelKeysToCheckHome, agent, 'home')
        await fetchAndDeobfuscateObjectStatusesV3(eventKey, workspaceKey, channelKeysToCheckHome, agent, 'home');
        log('success', 'Object statuses home fetched and saved for v3.');

        await fetchAndDeobfuscateObjectStatusesV3(eventKey, workspaceKey, channelKeysToCheckAway, agent, 'away');
        log('success', 'Object statuses away fetched and saved for v3.');
    } else { // v2
        const chartKey = eventData.seats_io.chart_key;
        const eventKey = isSeason ? eventData.seats_io.season_key : eventData.seats_io.event_key;

      console.log({chartKey,workspaceKey})
        await fetchAndDeobfuscatePublishedDetails(chartKey, workspaceKey, agent);
       const renderingInfo = await fetchRenderingInfoData(eventKey, workspaceKey, agent);

      log('warning','start fetching object statuses',eventKey, workspaceKey, channelKeysToCheckHome, agent, 'home')
       await fetchAndDeobfuscateObjectStatuses(eventKey, workspaceKey, channelKeysToCheckHome, agent, 'home');
      log('success', 'Object statuses home fetched and saved for v2.');

       await fetchAndDeobfuscateObjectStatuses(eventKey, workspaceKey, channelKeysToCheckAway, agent, 'away');
      log('success', 'Object statuses away fetched and saved for v2.');
    }
  } catch (error) {
    console.log(error);
    
    
  }
}

prepareBookingInfo().catch(err => log('error', err));
