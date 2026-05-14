import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function main() {
  const students = await db.execute("SELECT id, class_id FROM students");
  const staffRows = await db.execute("SELECT id FROM staff LIMIT 1");
  const staffId = staffRows.rows[0].id;

  // Generate 10 school days going back from today
  const dates: string[] = [];
  const d = new Date();
  while (dates.length < 10) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(d.toISOString().split("T")[0]);
    }
    d.setDate(d.getDate() - 1);
  }

  const statuses = ["present", "present", "present", "present", "absent", "late"];
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  // Build batch - 50 rows at a time
  let inserted = 0;
  const BATCH = 50;

  for (const date of dates) {
    for (let i = 0; i < students.rows.length; i += BATCH) {
      const batch = students.rows.slice(i, i + BATCH);
      const placeholders = batch.map(() => "(?,?,?,?,?,?)").join(",");
      const args: (string | number)[] = [];
      for (const s of batch) {
        args.push(s.id as number, s.class_id as number, date, pick(statuses), staffId as number, Date.now());
      }
      await db.execute({ sql: `INSERT INTO attendance (student_id, class_id, date, status, staff_id, created_at) VALUES ${placeholders}`, args });
      inserted += batch.length;
    }
  }

  console.log(`✓ attendance (${inserted} records)`);
  console.log("✅ Done!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
