import { client } from "./index";

type StartupMigration = {
  id: string;
  run: () => Promise<void>;
};

async function columnExists(tableName: string, columnName: string) {
  const result = await client.execute(`PRAGMA table_info(${tableName})`);
  return result.rows.some((row) => String(row.name) === columnName);
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  if (await columnExists(tableName, columnName)) return;

  try {
    await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    // Two instances can start at the same time. If another instance added the
    // column after our check, treat the duplicate-column error as success.
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (!message.includes("duplicate column")) throw error;
  }
}

async function repairReleaseData() {
  // Correct the known production typo only when doing so cannot create a
  // duplicate class name.
  const canonicalGrade4 = await client.execute(
    "SELECT id FROM classes WHERE lower(trim(name)) = 'grade 4' LIMIT 1"
  );
  if (canonicalGrade4.rows.length === 0) {
    await client.execute("UPDATE classes SET name = 'Grade 4' WHERE upper(trim(name)) = 'GARDE 4'");
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS demo_seed_registry (
      batch_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      row_id INTEGER NOT NULL,
      PRIMARY KEY (batch_id, table_name, row_id)
    )
  `);

  // Earlier demo data could assign the seeded class to a teacher who already
  // owned a real class. Remove only the demo-side assignment and preserve the
  // established class relationship.
  await client.execute(`
    UPDATE classes AS demo_class
    SET teacher_user_id = NULL
    WHERE demo_class.teacher_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM demo_seed_registry AS demo_registry
        WHERE demo_registry.table_name = 'classes'
          AND demo_registry.row_id = demo_class.id
      )
      AND EXISTS (
        SELECT 1 FROM classes AS established_class
        WHERE established_class.teacher_user_id = demo_class.teacher_user_id
          AND established_class.id <> demo_class.id
          AND NOT EXISTS (
            SELECT 1 FROM demo_seed_registry AS established_registry
            WHERE established_registry.table_name = 'classes'
              AND established_registry.row_id = established_class.id
          )
      )
  `);
}

const migrations: StartupMigration[] = [
  {
    id: "2026-08-23_fee_payments_term",
    run: () => addColumnIfMissing("fee_payments", "term", "TEXT"),
  },
  {
    id: "2026-09-12_release_data_cleanup",
    run: repairReleaseData,
  },
];

export async function runStartupMigrations() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const migration of migrations) {
    const existing = await client.execute({
      sql: "SELECT id FROM app_migrations WHERE id = ? LIMIT 1",
      args: [migration.id],
    });

    if (existing.rows.length > 0) continue;

    await migration.run();

    await client.execute({
      sql: "INSERT OR IGNORE INTO app_migrations (id) VALUES (?)",
      args: [migration.id],
    });

    console.log(`[DB migration] applied ${migration.id}`);
  }
}
