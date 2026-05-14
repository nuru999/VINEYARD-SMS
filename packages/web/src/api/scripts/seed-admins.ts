/**
 * Seed script: ensure all existing users get an admin profile
 * Run with: bun src/api/scripts/seed-admins.ts
 */
import { db } from "../database";
import { userProfiles } from "../database/schema";
import { user as userTable } from "../database/auth-schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding admin profiles...");

  // Get all users
  const users = await db.select().from(userTable);
  console.log(`Found ${users.length} user(s):`, users.map(u => u.email));

  for (const u of users) {
    // Check if profile exists
    const [existing] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, u.id));

    if (existing) {
      console.log(`  ✓ ${u.email} — already has role: ${existing.role}`);
    } else {
      // First 2 users get admin, rest get teacher
      const adminCount = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.role, "admin"))
        .then(r => r.length);

      const role = adminCount < 2 ? "admin" : "teacher";
      await db.insert(userProfiles).values({ userId: u.id, role });
      console.log(`  + ${u.email} — assigned role: ${role}`);
    }
  }

  console.log("✅ Done");
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
