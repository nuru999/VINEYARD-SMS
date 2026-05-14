import { createAuthClient } from "better-auth/react";
import { bearerClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [bearerClient()],
});
