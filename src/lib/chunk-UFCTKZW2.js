// src/cookies/index.ts
// In-memory cookie store for non-browser environments
const cookieStore = {};

var internlCreateCookie = ({ name, value, expiration = 1, path = "/", domain }) => {
  // expiration, path, and domain are ignored in this in-memory implementation
  cookieStore[name] = value;
};

var createCookie = (props) => {
  eraseCookie(props.name, props.domain);
  internlCreateCookie(props);
  // console.log(`Cookie created: ${props.name}=${props.value}`);
  // //log all the cookies
  // console.log("Current cookies:", cookieStore);
};

var readCookie = (name) => {
  if (typeof cookieStore !== "undefined") {
    return cookieStore.hasOwnProperty(name) ? cookieStore[name] : null;
  }
  return null;
};

var eraseCookie = (name, domain) => {
  if (cookieStore.hasOwnProperty(name)) {
    delete cookieStore[name];
  }
};

export {
  createCookie,
  readCookie,
  eraseCookie
};
//# sourceMappingURL=chunk-UFCTKZW2.js.map