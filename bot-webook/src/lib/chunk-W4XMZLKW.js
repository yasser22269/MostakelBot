import { ApiConfig } from "./chunk-LPIRJEMY.js";
import { solveV3Wrapper } from '../utils/config.js';

// src/grecaptcha/token.ts
const generateRecaptchaToken = async (action = "unspecific") => {
  const websiteURL = `${ApiConfig.config.wbk.api}/${action}`;
  const websiteKey = ApiConfig.config?.grecaptcha?.v3Key || "SITE_KEY";
  const minScore = ApiConfig.config?.recaptchaMinScore || 0.3;

  const result = await solveV3Wrapper(websiteURL, websiteKey, action, minScore);

  if (result) {
    return result;
  } else {
    throw new Error("Capsolver getTaskResult failed or timed out: " + JSON.stringify(result));
  }
};

export { generateRecaptchaToken };
