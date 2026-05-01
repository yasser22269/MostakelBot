// src/config.ts
class WbkApiConfig {
  constructor() {
    this._config = null;
  }
  get config() {
    return this._config;
  }
  init(config) {
    this._config = this.setDefaults(config);
  }
  update(config) {
    this._config = { ...this._config, ...this.setDefaults(config) };
  }
  setDefaults(config) {
    return {
      ...config,
      grecaptcha: {
        v3Key: "",
        spammyCountryCodes: [973, 965],
        ...config.grecaptcha
      },
      cookie: {
        tokenExpiration: 30,
        ...config.cookie
      }
    };
  }
}
const ApiConfig = new WbkApiConfig();

export { ApiConfig };
