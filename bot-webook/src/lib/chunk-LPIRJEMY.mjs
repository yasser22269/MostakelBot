import {
  __spreadProps,
  __spreadValues
} from "./chunk-DFMI36TU.mjs";

// src/config.ts
var WbkApiConfig = class {
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
    this._config = __spreadValues(__spreadValues({}, this._config), this.setDefaults(config));
  }
  setDefaults(config) {
    return __spreadProps(__spreadValues({}, config), {
      grecaptcha: __spreadValues({
        v3Key: "",
        spammyCountryCodes: [973, 965]
      }, config.grecaptcha),
      cookie: __spreadValues({
        tokenExpiration: 30
      }, config.cookie)
    });
  }
};
var ApiConfig = new WbkApiConfig();

export {
  ApiConfig
};
//# sourceMappingURL=chunk-LPIRJEMY.mjs.map