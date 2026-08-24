import { db } from "./src/api/database";
import * as schema from "./src/api/database/schema";
import { auth } from "./src/api/auth";
import { eq } from "drizzle-orm";

const seedPassword = process.env.SEED_PASSWORD;
const isProduction = process.env.NODE_ENV === "production";
const allowProductionSeed = process.env.ALLOW_PRODUCTION_SEED === "true";

if (!seedPassword || seedPassword.length < 12) {
  throw new Error("SEED_PASSWORD must be provided and contain at least 12 characters");
}

if (isProduction && !allowProductionSeed) {
  throw new Error("Production seeding is disabled. Set ALLOW_PRODUCTION_SEED=true only for an intentional one-off operation.");
}

const accounts = [
  { name: "Admin User", email: "admin@vineyard.school", role: "admin" as const },
  { name: "Principal User", email: "principal@vineyard.school", role: "principal" as const },
  { name: "Teacher User", email: "teacher@vineyard.school", role: "teacher" as const },
  { name: "Accountant User", email: "accountant@vineyard.school", role: "accountant" as const },
];

async function main() {
  for (const account of accounts) {
    const existing = await db.select().from(schema.user).where(eq(schema.user.email, account.email)).limit(1);
    let userId = existing[0]?.id;

    if (!userId) {
      const created = await auth.api.signUpEmail({
        body: {
          name: account.name,
          email: account.email,
          password: seedPassword,
        },
      });
      userId = created.user.id;
    }

    await db
      .insert(schema.userProfiles)
      .values({ userId, role: account.role, phone: null })
      .onConflictDoUpdate({ target: schema.userProfiles.userId, set: { role: account.role } });
  }

  console.log(`Seed complete for ${accounts.length} role accounts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
