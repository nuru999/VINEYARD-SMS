import { createAuthClient } from "better-auth/react";

const baseURL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) ||
  "https://vineyard-sms-gq1q.onrender.com";

export const authClient = createAuthClient({
  baseURL,
  basePath: "/api/auth",
});
