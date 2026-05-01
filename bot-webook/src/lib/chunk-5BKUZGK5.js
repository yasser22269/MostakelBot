import {
  logout
} from "./chunk-RIHYP73M.js";

// src/hooks/wbk/auth/logout.ts
// import { useMutation as tanstackUseMutation, useQueryClient as tanstackUseQueryClient } from "@tanstack/react-query";


var useLogout = (props) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["user", props], null);
    }
  });
};

// Minimal non-browser implementations
function useMutation({ mutationFn, onSuccess }) {
  return {
    mutate: async (...args) => {
      const result = await mutationFn(...args);
      if (onSuccess) onSuccess(result);
      return result;
    }
  };
}

function useQueryClient() {
  // In-memory store for demonstration
  const store = {};
  return {
    setQueryData: (key, value) => {
      store[JSON.stringify(key)] = value;
    }
  };
}

export {
  useLogout,
  useMutation,
  useQueryClient
};
//# sourceMappingURL=chunk-5BKUZGK5.js.map