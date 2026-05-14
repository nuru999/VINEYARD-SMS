/**
 * Reset admin passwords for testing
 * bun src/api/scripts/reset-admin-pw.ts
 */
import { db } from "../database";
import { user as userTable, account } from "../database/auth-schema";
import { eq } from "drizzle-orm";
import { Scrypt } from "better-auth";

const NEW_PASSWORD = "Vineyard@2026";

async function main() {
  const scrypt = new Scrypt();
  const hashed = await scrypt.hash(NEW_PASSWORD);

  const users = await db.select().from(userTable);
  console.log("Users:", users.map(u => u.email));

  for (const u of users) {
    // Update the account table where providerId = 'credential'
    const updated = await db
      .update(account)
      .set({ password: hashed })
      .where(eq(account.userId, u.id))
      .returning();

    if (updated.length > 0) {
      console.log(`✓ Reset password for ${u.email}`);
    } else {
      console.log(`⚠ No credential account found for ${u.email}`);
    }
  }

  console.log(`\n✅ New password: ${NEW_PASSWORD}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
