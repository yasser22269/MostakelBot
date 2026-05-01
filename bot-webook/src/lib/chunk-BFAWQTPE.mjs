import {
  fetchClient
} from "./chunk-K342ITN7.js";
import {
  generateRecaptchaToken
} from "./chunk-W4XMZLKW.js";
import {
  ApiConfig
} from "./chunk-LPIRJEMY.js";
import {
  __async
} from "./chunk-DFMI36TU.js";

// src/core/wbk/auth/login.ts
// import { generateMd5, getLocaleOnly } from "./chunk-VRTIRCR3.mjs";
import { generateMd5 } from "./chunk-VRTIRCR3.js";
function getLocaleOnly(locale) {
  return locale || "en";
}
import {Exception} from "./chunk-RIHYP73M.js";
// import { Exception } from "@wbk/logger";
// oldException = Exception;
// function Exception(_0) {
//   return new Exception({
//     error: _0.error,
//     name: _0.name,
//     context: {
//       tags: _0.context.tags,
//       extra: _0.context.extra
//     }
//   });
// }
var loginWithPassword = (_0) => __async(void 0, [_0], function* ({ email, password, locale, agent }) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  try {
    const signature = generateMd5(email);
    const captcha = yield generateRecaptchaToken("login");
    const lang = getLocaleOnly(locale);
    const data = yield fetchClient({
      url: `/login?lang=${lang}`,
      baseUrl: (_b = (_a = ApiConfig.config) == null ? void 0 : _a.wbk) == null ? void 0 : _b.authApi,
      options: {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          captcha,
          signature,
          app_source: (_d = (_c = ApiConfig.config) == null ? void 0 : _c.wbk) == null ? void 0 : _d.appSource,
          login_with: "email",
          lang
        })
      },
      agent
    });
    if (((_e = data == null ? void 0 : data.status) == null ? void 0 : _e.toLowerCase()) === "success" && ((_f = data == null ? void 0 : data.data) == null ? void 0 : _f.access_token)) {
      //log the info
      // console.log("login successful", data.data);
      return {
        new_user: false,
        user: data.data
      };
    }
    const possibleDataError = data == null ? void 0 : data.data;
    const msg = typeof (possibleDataError == null ? void 0 : possibleDataError[0]) === "string" ? possibleDataError[0] : ((_g = data == null ? void 0 : data.error) == null ? void 0 : _g.mobile) || ((_h = data == null ? void 0 : data.error) == null ? void 0 : _h.phone) || ((_i = data == null ? void 0 : data.error) == null ? void 0 : _i.cell_number) || ((_j = data == null ? void 0 : data.error) == null ? void 0 : _j.email) || ((_l = (_k = data == null ? void 0 : data.original) == null ? void 0 : _k.error) == null ? void 0 : _l.description) || ((_m = data == null ? void 0 : data.error) == null ? void 0 : _m.description) || ((_o = (_n = data == null ? void 0 : data.error) == null ? void 0 : _n.captcha) == null ? void 0 : _o[0]);
    const finalMsg = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(finalMsg);
  } catch (error) {
    throw new Exception({
      error,
      name: "loginException",
      context: { tags: { journey: "auth" }, extra: { email } }
    });
  }
});
var createAccount = (_0) => __async(void 0, [_0], function* ({
  email,
  password,
  first_name,
  last_name,
  confirm_email,
  phone,
  agreeTerms,
  newsletter,
  country_code,
  country,
  referral_key,
  lang,
  captcha,
  signature,
  skip_phone_validation,
  check_user,
  utm_wbk_wa_session_id,
  agent
}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  try {
    const data = yield fetchClient({
      url: `/register?lang=${lang}`,
      baseUrl: (_b = (_a = ApiConfig.config) == null ? void 0 : _a.wbk) == null ? void 0 : _b.authApi,
      options: {
        method: "POST",
        body: JSON.stringify({
          email,
          mode: "signup",
          password,
          first_name,
          last_name,
          confirm_email,
          phone,
          agreeTerms,
          newsletter,
          country_code,
          country,
          referral_key,
          lang,
          captcha,
          signature,
          skip_phone_validation,
          check_user,
          utm_wbk_wa_session_id,
          app_source: (_d = (_c = ApiConfig.config) == null ? void 0 : _c.wbk) == null ? void 0 : _d.appSource
        })
      },
      agent
    });
    if (((_e = data == null ? void 0 : data.status) == null ? void 0 : _e.toLowerCase()) === "success") {
      return {
        new_user: true,
        user: data.data
      };
    }
    const possibleDataError = data == null ? void 0 : data.data;
    if (!data.status || data.status.toLowerCase() !== "success") {
        console.error("Registration failed response:", JSON.stringify(data, null, 2));
    }
    const msg = typeof (possibleDataError == null ? void 0 : possibleDataError[0]) === "string" ? possibleDataError[0] : ((_g = data == null ? void 0 : data.error) == null ? void 0 : _g.mobile) || ((_h = data == null ? void 0 : data.error) == null ? void 0 : _h.phone) || ((_i = data == null ? void 0 : data.error) == null ? void 0 : _i.cell_number) || ((_j = data == null ? void 0 : data.error) == null ? void 0 : _j.email) || ((_l = (_k = data == null ? void 0 : data.original) == null ? void 0 : _k.error) == null ? void 0 : _l.description) || ((_m = data == null ? void 0 : data.error) == null ? void 0 : _m.description) || ((_o = (_n = data == null ? void 0 : data.error) == null ? void 0 : _n.captcha) == null ? void 0 : _o[0]);
    const finalMsg = Array.isArray(msg) ? msg[0] : msg;
    throw new Error(finalMsg || JSON.stringify(data));
  } catch (error) {
    throw new Exception({
      error,
      name: "registerException",
      context: { tags: { journey: "auth" }, extra: { email } }
    });
  }
});

export {
  loginWithPassword,
  createAccount
};
//# sourceMappingURL=chunk-BFAWQTPE.mjs.map
