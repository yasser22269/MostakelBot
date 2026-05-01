// src/encryption/md5/index.ts
import md5 from "md5";
var generateMd5 = (value) => {
  const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `${md5(value + randomString)}|${randomString}`;
};

export {
  generateMd5
};
//# sourceMappingURL=chunk-VRTIRCR3.js.map