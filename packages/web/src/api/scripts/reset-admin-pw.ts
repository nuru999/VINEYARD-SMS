/**
 * Targeted credential reset helper.
 *
 * Usage:
 * TARGET_USER_EMAIL=user@example.com NEW_PASSWORD='strong-password' bun src/api/scripts/reset-admin-pw.ts
 *
 * Production use also requires ALLOW_PRODUCTION_PASSWORD_RESET=true.
 */
import { db } from "../database";
import { user as userTable, account } from "../database/auth-schema";
import { and, eq } from "drizzle-orm";
import { Scrypt } from "better-auth";

const targetEmail = String(process.env.TARGET_USER_EMAIL || "").trim().toLowerCase();
const newPassword = String(process.env.NEW_PASSWORD || "");
const isProduction = process.env.NODE_ENV === "production";

if (!targetEmail) throw new Error("TARGET_USER_EMAIL is required");
if (newPassword.length < 12) throw new Error("NEW_PASSWORD must contain at least 12 characters");
if (isProduction && process.env.ALLOW_PRODUCTION_PASSWORD_RESET !== "true") {
  throw new Error("Production password reset is disabled unless ALLOW_PRODUCTION_PASSWORD_RESET=true");
}

async function main() {
  const [targetUser] = await db.select().from(userTable).where(eq(userTable.email, targetEmail)).limit(1);
  if (!targetUser) throw new Error("Target user not found");

  const scrypt = new Scrypt();
  const hashed = await scrypt.hash(newPassword);

  const updated = await db
    .update(account)
    .set({ password: hashed })
    .where(and(eq(account.userId, targetUser.id), eq(account.providerId, "credential")))
    .returning();

  if (updated.length === 0) throw new Error("No credential account found for target user");

  console.log(`Password reset completed for ${targetUser.email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
