import path from 'path';

const ROOT_DIR = process.cwd();
export const DATA_DIR = process.env.DATA_DIR || 'data';
import { solveV3AntiCaptcha,solveTurnstileAntiCaptcha ,solveTurnstileLocal,solveV3Local} from '../captcha/capsolver.js';

export const a = 1;
export const FILE_PATHS = {
    ACCOUNTS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'acc.txt'),
    PROCESSED_ACCOUNTS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'processed_acc.txt'),
    SUCCESS_ACCOUNTS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'succ_acc.txt'),
    FAILED_ACCOUNTS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'fail_acc.txt'),
    PROXIES_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'proxy.txt'),
    URLS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'urls.txt'),
    PROXY_INDEX_FILE: path.join(ROOT_DIR, DATA_DIR, "sor", "proxy_index.txt"),
    HOLD_TOKENS_FILE: path.join(ROOT_DIR, DATA_DIR, "sor", "hold-tokens.json"),
    EVENT_DETAILS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'eventDetails.json'),
    RENDERING_INFO_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'renderingInfo.json'),
    PUBLISHED_DETAILS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'published.json'),
    OBJECT_STATUSES_HOME_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'objectStatuses_home.json'),
    OBJECT_STATUSES_AWAY_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'objectStatuses_away.json'),
    HELD_OBJECTS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'held_objects.json'),
    TOKEN_STATUSES_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'token_statuses.json'),
    SHIFT2_ACCOUNTS_FILE: path.join(ROOT_DIR, DATA_DIR, 'sor', 'acc_shift2.txt'),
};

//  VITE_PUBLIC_RESELL_DOMAIN:"https://resell.webook.com",VITE_PUBLIC_APP_SOURCE:"rs",VITE_PUBLIC_SOCKET_URL:"https://realtime.webook.com:8443",VITE_PUBLIC_SOCKET_HTTP_URL:"https://realtime.webook.com",
  //  VITE_PUBLIC_SEATIO_WORKSPACE_KEY:"3d443a0c-83b8-4a11-8c57-3db9d116ef76",VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY:"66e63c10464382fb1f049832",VITE_PUBLIC_TURNSTILE_SITE_KEY:"0x4AAAAAAAw0ci3Vi2Xv3txt"

// if(!window.seats)throw new Error("SeatsCloudChart is not initiated");
//       window.seats.adapters.SIO(N(j( {
//         
//       }
//       ,t), {
//         workspaceKey:t.workspaceKey||((s=n.workspace)==null?void 0:s.seatCloud),divId:"seats-cloud-chart"
//       }
//       )).render()
//      id:"seats-planner-script",url:"https://chart.seatcloud.com/v1.0/chart.js"

export const API_CONFIG = {
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
        v3Key: "6LcvYHooAAAAAC-G46bpymJKtIwfDQpg9DsHPMpL",
    },
    cloudflarecaptcha: {
        VITE_PUBLIC_TURNSTILE_SITE_KEY: "0x4AAAAAAAw0ci3Vi2Xv3txt"
    },
    cookie: {
        domain: "webook.com"
    }
};

export const LOG_COLORS = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    warning: "\x1b[33m",
    error: "\x1b[31m",
    reset: "\x1b[0m",
};

export const SEATSIO_CONSTANTS = {
    VITE_PUBLIC_SEATCLOUD_WORKSPACE_KEY: "66e63c10464382fb1f049832",
    HOLD_OBJECTS_URL: 'https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/events/groups/actions/hold-objects',
    RELEASE_OBJECTS_URL: 'https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/events/groups/actions/release-held-objects',
    OBJECT_STATUSES_URL: 'https://cdn-eu.seatsio.net/system/public/3d443a0c-83b8-4a11-8c57-3db9d116ef76/events/object-statuses',
    CHART_JS_URL: 'https://cdn-eu.seatsio.net/chart.js',
};

export const BOT_SETTINGS = {
    USE_PREPARED_ACCESS_TOKENS: true,
    TICKET_PER_ACCOUNT: parseInt(process.env.TICKET_PER_ACCOUNT) || 1,
    THREADS: process.env.THREADS || 5,
};
export async function solveV3Wrapper(websiteURL, websiteKey, pageAction, minScore) {
    // make 3 attempts
    for (let i = 0; i < 3; i++) {
      try {
        if (process.env.USE_LOCAL_CAPTCHA_SOLVER === 'true') {
          console.log('solving v3 (local)');
          return await solveV3Local(websiteKey, websiteURL, pageAction, minScore);
        }
        console.log('solving v3 (direct)');
        const reCaptchaToken = await solveV3AntiCaptcha(websiteURL, websiteKey, pageAction, minScore);
        return reCaptchaToken;
      } catch (error) {
        console.log(`solveV3Wrapper attempt ${i + 1}/3 failed:`, error.message || error);
        if (i === 2) return null; // Return null only after all retries exhausted
      }
    }
  }
export async function solveTurnstileWrapper(websiteURL, sitekey, action, cdata) {
    try {
        console.log('solving turnstile (direct)');
        const reCaptchaToken = await solveTurnstileAntiCaptcha(websiteURL, sitekey, action, cdata);
        return reCaptchaToken;
    } catch (error) {
        console.log(error);
        throw error;
    }
}
