import crypto from 'crypto';
import fetch from 'node-fetch';
import fs from 'fs';
import 'dotenv/config';
import UserAgent from 'user-agents';

// import { bU } from './cdn-eu.seatsio.net_selectedSeatsObjectConstructor';
import { HttpsProxyAgent } from 'https-proxy-agent';

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
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}]`, ...args, colors.reset);
}

// Your SOCKS5 proxy URL (encoded if needed)
// const proxy = 'http://fc26b074f5ea92079f8a__cr.sa:be044a6c2cd3656d@gw.dataimpulse.com:10000';
// // Create an agent
// const agent = new HttpsProxyAgent(proxy);
export function bU(e, t) {
  let i = e.split("").reverse().join("");
  return crypto.createHash('sha256').update(i + t).digest('hex');
}

// Your SOCKS5 proxy URL (encoded if needed)

class b4 {

    /**
     * Perform a fetch request.
     * @param {string|Request} e - The Buffer To Deobfuscate.
     * @param {string} t - The Chart Key.
     * @returns {string} - The decoded string.
     */
    static deobfuscate( e, t) {
        let i = b4.keyToNumberBetween0And63(t),
            r = new Uint8Array(e);
        for (let e = 0; e < r.length; ++e) r[e] = r[e] - i;
        return new TextDecoder("utf-8").decode(r)
    }
    static keyToNumberBetween0And63(e) {
        return 63 & b4.hashCode(e)
    }
    static hashCode(e) {
        let t = 0;
        for (let i = 0; i < e.length; i++) t = (29 * t % 10007 + e.charCodeAt(i)) % 10007;
        return t
    }
}
//  fetchSeat = async (url, options = {}) => {
//         // Add custom headers
//         options.headers = this.addHeaders(options);
//         // Perform the fetch
//         const response = await n4(url, options);
//         // If the response is a Response object, check content type
//         if (response instanceof Response) {
//             const contentType = response.headers.get("Content-Type");
//             // If the content is obfuscated seatsio data, deobfuscate and parse
//             if (contentType === "application/vnd.seatsio.drawing" || contentType === "application/vnd.seatsio") {
//                 const buffer = await response.arrayBuffer();
//                 const json = b4.deobfuscate(buffer, this.deobfuscationKey);
//                 return JSON.parse(json);
//             }
//         }
//         // Otherwise, return the response as is
//         return response;
//     }
// }

/**
 * Standalone fetch function that uses the b4 class for deobfuscation.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options (headers, etc).
 * @param {string} deobfuscationKey - Key for deobfuscation.
 * @param {function} addHeaders - Function to add headers to options.
 * @returns {Promise<any>} - The parsed response or the response object.
 */
async function seatsioFetch(url, options = {}, deobfuscationKey, addHeaders) {
    options.headers = addHeaders ? addHeaders(options) : options.headers;
    const response = await n4(url, options);
    if (response instanceof Response) {
        const contentType = response.headers.get("Content-Type");
        if (contentType === "application/vnd.seatsio.drawing" || contentType === "application/vnd.seatsio") {
            const buffer = await response.arrayBuffer();
            const json = b4.deobfuscate(buffer, deobfuscationKey);
            return JSON.parse(json);
        }
    }
    return response;
}


// For compatibility with previous usage, provide a function version as well
async function n4(url, options) {
    return fetch(url, options);
}


// function bU(chartToken, body) {
//     // Reverse the chartToken string
//     const reversed = chartToken.split('').reverse().join('');
//     // Concatenate reversed chartToken with body
//     const input = reversed + body;
//     // SHA256 hash, output as hex string
//     return crypto.createHash('sha256').update(input).digest('hex');
// }


function rE() {
  return Math.floor((1 + Math.random()) * 65536)
    .toString(16)
    .substring(1);
}

/**
 * Generates a new browser ID. This is a stateless version of the method and will
 * always generate a new ID. This is useful for testing or for use cases where
 * you don't want to store the browser ID locally.
 *
 * @returns {string} The new browser ID.
 */
function getOrCreateBrowserId() {
  // Always generate a new ID (stateless version)
  return rE() + rE() + rE() + rE();
}

function  getRequiredHeaders(e) {
    return {
      "X-Client-Tool": "Renderer",
      "X-Signature": e.body
        ? bU(this.chartToken, e.body)
        : bU(this.chartToken, ""),
      "X-Browser-Id": getOrCreateBrowserId(),
    };
}

/**
 * Example: Fetch rendering-info with custom headers (Node.js)
 */
async function fetchRenderingInfo(url, chartToken,browserId, options = {},withAuth = true,agent = null) {
    
    let signature = "";
    let body = "";
    if (withAuth) {
     body =options.body ||  ""; // For GET, body is empty string for signature
     signature = bU(chartToken, body);
    // log('info', 'Signature:', signature);
    }
  const userAgent = new UserAgent().toString();
    const headers = {
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "x-browser-id": browserId,
        "x-signature": signature,
        "user-agent":userAgent,
        "x-client-tool": "Renderer",
        "accept": "*/*",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "sec-fetch-storage-access": "active",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-US,en;q=0.9",
        "priority": "u=1, i",
        "Host": "cdn-eu.seatsio.net",
        "Accept-encoding": "gzip, deflate, br, zstd",
        "Content-Type": "application/json",
        "Content-Length": body.length,

        "origin": "https://cdn-eu.seatsio.net",
        "referer": "https://cdn-eu.seatsio.net/static/version/seatsio-ui-prod-00510-9kg/chart-renderer/chartRendererIframe.html?environment=PROD&commit_hash=7625830347dc843b0827224bef9194ccf3ae9242",
        ...options.headers

    };
  // add them to tests/testHoldV1Header.json
//  fs.writeFileSync('tests/testHoldV1Header.json', JSON.stringify(headers, null, 2));
    const response = await fetch(url, {
        ...options,
        headers,
        agent
    });
    return response;
}

// Example usage (uncomment to run):
// fetchRenderingInfo("tanzania-vs-south-africa", "your_chart_token_here").then(async res => {
//     console.log(await res.text());
// });
export { seatsioFetch ,b4 as SeatsioDeobfuscator ,getRequiredHeaders,fetchRenderingInfo,getOrCreateBrowserId};
