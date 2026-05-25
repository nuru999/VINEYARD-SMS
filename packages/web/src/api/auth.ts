import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db } from "./database";

const origin = process.env.WEBSITE_URL || process.env.REMOTE_URL || "http://localhost:3000";

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: origin,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [origin],
  plugins: [bearer()],
});
