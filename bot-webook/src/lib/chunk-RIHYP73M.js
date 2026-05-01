import { fetchClient } from "./chunk-K342ITN7.js";
import { ApiConfig } from "./chunk-LPIRJEMY.js";

// src/core/wbk/auth/logout.ts
export function Exception({ error, name, context }) {
  this.name = name || "Exception";
  if (error instanceof Error) {
    this.message = error.message || "Unknown Error";
  } else {
    this.message = error && typeof error === 'object' ? JSON.stringify(error) : String(error);
  }
  this.stack = error && error.stack ? error.stack : (new Error(this.message)).stack;
  if (context) this.context = context;
}

const logout = async () => {
  try {
    await fetchClient({
      url: "/auth/logout",
      baseUrl: ApiConfig.config?.wbk?.authApi,
      options: {
        method: "POST"
      }
    });
    return true;
  } catch (error) {
    throw new Exception({ error, name: "logoutException" });
  }
};

export { logout };
