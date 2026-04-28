import { fetchClient } from "./chunk-K342ITN7.js";
import { generateRecaptchaToken } from "./chunk-W4XMZLKW.js";
import { ApiConfig } from "./chunk-LPIRJEMY.js";
import { generateMd5 } from "./chunk-VRTIRCR3.js";
import { Exception } from "./chunk-RIHYP73M.js";

function getLocaleOnly(locale) {
  return "en"; // Placeholder
}

// src/core/wbk/auth/login.ts
const loginWithPassword = async ({ email, password, locale, agent }) => {
  try {
    const signature = generateMd5(email);
    const captcha = await generateRecaptchaToken("login");
    const lang = getLocaleOnly(locale);
    const data = await fetchClient({
      url: "/login",
      baseUrl: ApiConfig.config?.wbk?.authApi,
      options: {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          captcha,
          signature,
          app_source: ApiConfig.config?.wbk?.appSource,
          login_with: "email",
          lang
        })
      },
      agent
    });

    if (data?.status?.toLowerCase() === "success" && data?.data?.access_token) {
      return {
        new_user: false,
        user: data.data
      };
    }

    const possibleDataError = data?.data;
    const msg = typeof possibleDataError?.[0] === "string" 
      ? possibleDataError[0] 
      : data?.error?.mobile || data?.error?.phone || data?.error?.cell_number || data?.error?.email || data?.original?.error?.description || data?.error?.description || data?.error?.captcha?.[0];
    
    const finalMsg = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(finalMsg);
  } catch (error) {
    throw new Exception({
      error,
      name: "loginException",
      context: { tags: { journey: "auth" }, extra: { email } }
    });
  }
};

export { loginWithPassword };
