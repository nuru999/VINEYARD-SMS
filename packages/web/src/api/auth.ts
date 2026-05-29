import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { db } from "./database";

function buildOrigin(): string {
  const raw = process.env.WEBSITE_URL || process.env.REMOTE_URL || "";
  if (!raw) return "http://localhost:3000";
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
    "http://localhost:3000",
    "http://localhost:4200",
    "http://localhost:5173",
    "file://",
    "null",
  ],
  plugins: [bearer()],
});
