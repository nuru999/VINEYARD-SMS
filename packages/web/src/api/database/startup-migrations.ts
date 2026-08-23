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

const migrations: StartupMigration[] = [
  {
    id: "2026-08-23_fee_payments_term",
    run: () => addColumnIfMissing("fee_payments", "term", "TEXT"),
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
