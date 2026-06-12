import { db } from "./src/api/database";
import * as schema from "./src/api/database/schema";
import { auth } from "./src/api/auth";
import { eq } from "drizzle-orm";

const accounts = [
  { name: "Admin User", email: "admin@vineyard.school", password: "Vineyard@2026", role: "admin" as const },
  { name: "Principal User", email: "principal@vineyard.school", password: "Vineyard@2026", role: "principal" as const },
  { name: "Teacher User", email: "teacher@vineyard.school", password: "Vineyard@2026", role: "teacher" as const },
  { name: "Accountant User", email: "accountant@vineyard.school", password: "Vineyard@2026", role: "accountant" as const },
  { name: "Muhammad Nuru", email: "muhammadnuru85@gmail.com", password: "Vineyard@2026", role: "teacher" as const },
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
          password: account.password,
        },
      });
      userId = created.user.id;
    }

    await db
      .insert(schema.userProfiles)
      .values({ userId, role: account.role, phone: null })
      .onConflictDoUpdate({ target: schema.userProfiles.userId, set: { role: account.role } });
  }

  console.log("Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
