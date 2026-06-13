import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";

const DEFAULTS: Record<string, string> = {
  school_name: "Vineyard Primary School",
  school_motto: "Fruitful Development",
  current_term: "Term 1",
  current_year: String(new Date().getFullYear()),
  school_email: "",
  school_phone: "",
  school_address: "",
  school_logo_url: "",
};

async function getSetting(key: string): Promise<string> {
  const rows = await db
    .select()
    .from(schema.schoolSettings)
    .where(eq(schema.schoolSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? DEFAULTS[key] ?? "";
}

async function setSetting(key: string, value: string) {
  const existing = await db
    .select()
    .from(schema.schoolSettings)
    .where(eq(schema.schoolSettings.key, key))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(schema.schoolSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.schoolSettings.key, key));
  } else {
    await db.insert(schema.schoolSettings).values({ key, value });
  }
}

export const settingsRoutes = new Hono()
  // GET /api/settings — public read (used by all dashboards for school name/term)
  .get("/", requireAuth, async (c) => {
    const keys = Object.keys(DEFAULTS);
    const rows = await db.select().from(schema.schoolSettings);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    // Fill defaults for any missing keys
    for (const key of keys) {
      if (!(key in map)) map[key] = DEFAULTS[key];
    }
    return c.json(map);
  })

  // PUT /api/settings — admin only
  .put("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    const allowed = Object.keys(DEFAULTS);
    for (const [key, value] of Object.entries(body)) {
      if (allowed.includes(key) && typeof value === "string") {
        await setSetting(key, value);
      }
    }
    return c.json({ ok: true });
  });
