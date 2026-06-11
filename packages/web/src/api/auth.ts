import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db } from "./database";

// Production URL — always the Render deployment
const PRODUCTION_URL = "https://vineyard-sms.onrender.com";

function buildOrigin(): string {
  const raw = process.env.WEBSITE_URL || process.env.REMOTE_URL || "";
  if (!raw) return PRODUCTION_URL;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw}`;
}

const origin = buildOrigin();

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: origin,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    origin,
    PRODUCTION_URL,
    "http://localhost:3000",
    "http://localhost:4200",
    "http://localhost:5173",
    // Electron origins — requests come from file:// or null origin
    "file://",
    "null",
    "app://.",
  ],
  plugins: [bearer()],
});
