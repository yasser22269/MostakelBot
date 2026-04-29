import { parentPort, workerData } from 'worker_threads';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ApiConfig } from '../lib/chunk-LPIRJEMY.js';
import { fetchClient } from '../lib/chunk-K342ITN7.js';
import { createCookie } from '../lib/chunk-UFCTKZW2.js';
import { useLogin } from '../lib/chunk-7ANTOXLV.js';
import { solveTurnstileAntiCaptcha } from '../captcha/capsolver.js';
import { browserFetch } from '../utils/browser_fetch.js';
import 'dotenv/config';
import fs from "fs";

const { account, proxy,  isSeason } = workerData;
const [email, password, token] = account.split(':');

function hasEventQueryParam(rawUrl) {
  try {
    if (!rawUrl) return false;
    const parsed = new URL(rawUrl);
    return Boolean(parsed.searchParams.get('event'));
  } catch (error) {
    return false;
  }
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
        cloudflarecaptcha:{
            VITE_PUBLIC_TURNSTILE_SITE_KEY:"0x4AAAAAAAw0ci3Vi2Xv3txt"
        },
    cookie: {
        domain: "webook.com"
    }
});

async function fetchHoldToken() {
  try {
    let accountAccessToken = token || '';
     const agent = process.env.USE_PROXY_FOR_GETTING_HOLD_TOKEN == 'true' && proxy ? new HttpsProxyAgent(proxy) : null;
//USE_PROXY_FOR_GETTING_HOLD_TOKEN
  //  let agent = null;
    //process.env.USE_PROXY_FOR_GETTING_HOLD_TOKEN === 'true' ? agent = new HttpsProxyAgent(proxy) : null;
    if (token) {
      createCookie({ name: 'token', value: token, domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' }); // add the additional cookies
    } else {
      const loginData = await new Promise((resolve, reject) => {
        useLogin({
          lang: 'en',
          agent
        }).mutate({ email, password }, {
          onSuccess: (data) => {
            resolve(data);
          },
          onError: (error) => {
            reject(error);
          }
        });
      });
      accountAccessToken = loginData?.user?.access_token || loginData?.access_token || loginData?.data?.access_token || '';
      console.log('DEBUG loginData keys:', JSON.stringify(Object.keys(loginData || {})), '| accountAccessToken SET:', !!accountAccessToken);
      if (!accountAccessToken) {
        throw new Error(`Login succeeded but no access_token found. loginData: ${JSON.stringify(loginData)}`);
      }
      createCookie({ name: 'token', value: accountAccessToken, domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' });
    }
    const DATA_DIR = process.env.DATA_DIR || 'data';
    const eventDetails = JSON.parse(fs.readFileSync(`./${DATA_DIR}/sor/eventDetails.json`));
    const eventData = eventDetails?.data || eventDetails;
    const renderInfo = JSON.parse(fs.readFileSync(`./${DATA_DIR}/sor/renderingInfo.json`));

    const siteKey = ApiConfig.config.cloudflarecaptcha.VITE_PUBLIC_TURNSTILE_SITE_KEY;
    const websiteURL = 'https://api.webook.com/api/v2';

    let isError = true;
    let turnstileTokenResult = null;
    let retryCount = 0;
    const maxRetries = 5;
    // Auto-detect Turnstile requirement from eventDetails, fallback to env var
    const hasCfTurnstile = eventData?.has_cf_turnstile === true;
    const captchaRequired = hasCfTurnstile || process.env.ENABLE_CAPTCHA_FOR_HOLD_TOKENS === 'true';
    if (hasCfTurnstile) console.log('Turnstile required (detected from eventDetails has_cf_turnstile=true)');
    if(captchaRequired){
        while(isError && retryCount < maxRetries){
          try {
            console.log(`Attempting to solve Turnstile CAPTCHA directly (attempt ${retryCount + 1}/${maxRetries})`);
            turnstileTokenResult = await solveTurnstileAntiCaptcha(websiteURL, siteKey);
            if(turnstileTokenResult){
                isError = false;
                console.log('Successfully solved Turnstile token');
            }
          } catch (error) {
            retryCount++;
            console.log(`Failed to solve Turnstile token (attempt ${retryCount}/${maxRetries}):`, error.message);
            if (retryCount < maxRetries) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (isError) {
            throw new Error(`Failed to solve Turnstile CAPTCHA after ${maxRetries} attempts`);
        }
    }


    const eventId = eventData._id;
    const body = {
      lang: 'ar',
     turnstile: turnstileTokenResult,
    }
    isSeason ? body.season_id =  eventId : body.event_id=  eventId
    const eventSlugForce = process.env.FORCE_EVENT_SLUG_VALUE;
    const eventSlug = eventSlugForce || eventData.slug;
    const isAhlanByEnv = process.env.IS_AHLAN === 'true' || process.env.isAhlan === 'true';
    const isAhlanByPromptUrl = hasEventQueryParam(process.env.PROMPT_URL || '');
    const isAhlanByShape = Boolean(eventDetails && !eventDetails.data);
    const isAhlan = isAhlanByEnv || isAhlanByPromptUrl || isAhlanByShape;
    console.log('eventSlug',eventSlug);

    const botVersion = process.env.BOT_VERSION || 'v1';
    const url = `/event-detail/${eventData.slug}/hold-token?lang=en`;
    const fullUrl = `${ApiConfig.config.wbk.api}${url.startsWith("/") ? url : `/${url}`}`;
    console.log('Fetching hold token from:', fullUrl);
    // console.log({url});

    // const body = ;
  let cookieToBeUsed =  '';
  const additionalCookie = process.env.PREPARE_TOKEN_COOKIE || '';
  let userAgentCookie = null;
  const tokenCookiePart = additionalCookie.split(';').map(c => c.trim()).find(c => c.startsWith('token='));
  if (tokenCookiePart) {
    try {
      const cookieValue = tokenCookiePart.split('=')[1];
      const base64Payload = cookieValue.split('.')[1];
      const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf-8');
      const payload = JSON.parse(decodedPayload);
      userAgentCookie = payload?.u;
      if (userAgentCookie) {
        userAgentCookie = userAgentCookie.split('').reverse().join('');
      }
    } catch (error) {
      userAgentCookie = null;
    }
  }
  cookieToBeUsed = additionalCookie;

  // Auto-construct _q_session_ queue cookie if QUEUE_TOKEN is set but cookie is missing
  const queueToken = process.env.QUEUE_TOKEN || '';
  if (queueToken && !cookieToBeUsed.includes('_q_session_')) {
    const queueCookieName = `_q_session_-event-detail-${eventSlug}`;
    const queueCookiePart = `${queueCookieName}=${queueToken}`;
    cookieToBeUsed = cookieToBeUsed ? `${cookieToBeUsed}; ${queueCookiePart}` : queueCookiePart;
    console.log(`Auto-constructed queue session cookie for slug: ${eventSlug}`);
    try {
      const queuePayload = JSON.parse(Buffer.from(queueToken.split('.')[1], 'base64').toString('utf-8'));
      console.log(`Queue position (n): ${queuePayload.n}, expires: ${new Date(queuePayload.e * 1000).toISOString()}`);
    } catch (_) {}
  }

    let holdTokenResponse;
    if (isAhlan) {
      const queueToken = process.env.AHLAN_QUEUE_TOKEN || '';
      const ahlanCookie = [cookieToBeUsed, accountAccessToken ? `token=${accountAccessToken}` : ''].filter(Boolean).join('; ');
      const ahlanBody = {
        slug: eventSlug,
        queueToken,
        eventId,
        language: 'en'
      };
      const ahlanUrl = 'https://www.ahlan.sa/api/ticketing/holdToken';
      const ahlanHeaders = {
        'content-type': 'application/json',
        'cookie': ahlanCookie,
        ...(process.env.USER_AGENT ? { 'user-agent': process.env.USER_AGENT } : {})
      };

      if (process.env.USE_BROWSER_FOR_AHLAN === 'true') {
        console.log('Fetching hold token via browser service for Ahlan');
        holdTokenResponse = await browserFetch(ahlanUrl, {
          method: 'POST',
          headers: ahlanHeaders,
          body: ahlanBody
        });
      } else {
        holdTokenResponse = await fetch(ahlanUrl, {
          method: 'POST',
          headers: ahlanHeaders,
          body: JSON.stringify(ahlanBody),
          agent
        });
      }
    } else {
      holdTokenResponse = await fetchClient({
        // url: '/seats/hold-token?lang=en',
        url,
        includeAuth: true,
        includeToken: true,
        raw:true,
        options: {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            cookie: cookieToBeUsed,
            'user-agent': userAgentCookie || process.env.USER_AGENT,
            'queue-token': process.env.QUEUE_TOKEN,
          },
          agent
        }
      });
    }

    // console.log(holdTokenResponse);
    const text = await holdTokenResponse.text();
    //console.log({text});

    // write the res to sample_hold_token_res.json
    fs.writeFileSync(`./${DATA_DIR}/sample_hold_token_res.json`, text);
    console.log(text);
    
    const json = JSON.parse(text);
    // console.log(json)
    const tokenId = json.data?.token || json.token

    console.log('got hold token id ', tokenId);
    if (!tokenId) {
      const errMsg = `API returned no token. Response: ${text}`;
      console.error(errMsg);
      parentPort.postMessage({ status: 'fail', account, error: errMsg });
      return;
    }
    parentPort.postMessage({ status: 'success', account, holdToken: tokenId });
  } catch (error) {
    const errMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error('Error fetching hold token for account:', account.split(':')[0], errMsg);
    try {
      parentPort.postMessage({ status: 'fail', account, error: errMsg });
    } catch (_) {}
  }
}

fetchHoldToken().catch(err => {
  const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
  console.error('Unhandled error in fetchHoldToken:', errMsg);
  try {
    parentPort.postMessage({ status: 'fail', account, error: errMsg });
  } catch (_) {}
});
