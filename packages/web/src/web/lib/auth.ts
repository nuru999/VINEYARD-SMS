import { createAuthClient } from "better-auth/react";

// Use relative URL so requests always go to the same origin (works on Render, localhost, desktop)
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "https://vineyard-sms-gq1q.onrender.com",
  basePath: "/api/auth",
});
