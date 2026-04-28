import { loginWithPassword } from "./chunk-BFAWQTPE.js";
import { createCookie } from "./chunk-UFCTKZW2.js";
import { useMutation, useQueryClient } from "./chunk-5BKUZGK5.js";
import { Exception } from "./chunk-RIHYP73M.js";

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

// src/hooks/wbk/auth/login.ts
const useLogin = ({ lang, agent }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => loginWithPassword({ ...variables, agent }),
    onSuccess: (user) => {
      if (user.user.access_token) {
        createCookie({ name: 'token', value: user.user.access_token, domain: 'webook.com', path: '/', secure: true, sameSite: 'Strict' });
        log('success', `Login successful for user: ${user.user.email} and the access tokin is: ${user.user.access_token.slice(0, 10)}...`);
      } else {
        throw new Exception({
          error: "Login failed",
          name: "LoginError",
          context: {
            tags: ["login", "useLogin"],
            extra: { user: user.user }
          }
        });
      }
      queryClient.setQueryData(["user", { lang }], { ...user.user });
    }
  });
};

export { useLogin };
