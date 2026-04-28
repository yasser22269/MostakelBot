import { ApiConfig } from "./chunk-LPIRJEMY.js";
import fetch from "node-fetch";
import 'dotenv/config';
import { readCookie } from "./chunk-UFCTKZW2.js";

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

const fetchClient = async ({
  baseUrl,
  url,
  options,
  agent,
  raw,
  cookie,
  formData,
  includeAuth = true,
  includeToken = true,
  version,
}) => {
  const wbkConfig = ApiConfig.config?.wbk;
  if (!baseUrl && !wbkConfig) {
    const msg = "WBK `ApiConfig` was not initialized.";
    log('error', msg);
    throw new Error(msg);
  }

  let api = wbkConfig?.api;
  if (version === "v1") {
    api = api?.replace("v2", "v1");
  }

  const base = baseUrl || api;
  let finalUrl;
  if (url.startsWith("http")) {
    finalUrl = url;
  } else {
    const endPoint = url.startsWith("/") ? url : `/${url}`;
    finalUrl = `${base}${endPoint}`;
  }
  const token = readCookie("token") || "";

  const headers = {
    ...(includeToken && { token: wbkConfig?.apiToken }),
    ...(includeAuth && { Authorization: `Bearer${token ? " " + token : ""}` }),
    Accept: "application/json",
    ...options?.headers
  };

  const defaultHeaders = {
    "Content-Type": "application/json",
    origin: "https://webook.com",
    priority: "u=1, i",
    "sec-ch-ua": '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "host": 'api.webook.com',
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": process.env.USER_AGENT || "Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    accept: "application/json, text/plain, */*, text/*",
    cookie,
    ...headers
  };

  const finalHeaders = formData ? headers : defaultHeaders;

  const response = await fetch(finalUrl, {
    ...options,
    agent,
    headers: finalHeaders
  });

  if (raw) {
    return response;
  }

  const res = await response.json();
  if (!response.ok) {
    log('error', `Request to ${finalUrl} failed with status ${response.status}:`, JSON.stringify(res));
    if (!res.message) {
      res.message = res?.error || "Something went wrong";
    }
    res.statusCode = response.status;
    throw res;
  }

  return res;
};

export { fetchClient };
