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

const TERMS = new Set(["Term 1", "Term 2", "Term 3"]);
const SETTING_KEYS = new Set(Object.keys(DEFAULTS));

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validLogoUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeSettings(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Settings payload must be an object" } as const;
  }

  const normalized: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(body as Record<string, unknown>)) {
    if (!SETTING_KEYS.has(key)) return { error: `Unknown setting: ${key}` } as const;
    if (typeof rawValue !== "string") return { error: `${key} must be a string` } as const;

    const value = rawValue.trim();
    if (key === "school_name") {
      if (!value) return { error: "School name is required" } as const;
      if (value.length > 160) return { error: "School name cannot exceed 160 characters" } as const;
    }
    if (key === "school_motto" && value.length > 200) {
      return { error: "School motto cannot exceed 200 characters" } as const;
    }
    if (key === "current_term" && !TERMS.has(value)) {
      return { error: "Current term must be Term 1, Term 2, or Term 3" } as const;
    }
    if (key === "current_year") {
      const year = Number(value);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return { error: "Academic year must be between 2000 and 2100" } as const;
      }
    }
    if (key === "school_email") {
      if (value.length > 254 || !validEmail(value)) return { error: "School email is invalid" } as const;
    }
    if (key === "school_phone" && value.length > 50) {
      return { error: "School phone cannot exceed 50 characters" } as const;
    }
    if (key === "school_address" && value.length > 500) {
      return { error: "School address cannot exceed 500 characters" } as const;
    }
    if (key === "school_logo_url") {
      if (value.length > 1000 || !validLogoUrl(value)) {
        return { error: "Logo URL must be an http(s) URL or a root-relative path" } as const;
      }
    }

    normalized[key] = value;
  }

  return { value: normalized } as const;
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
  .get("/", requireAuth, async (c) => {
    const rows = await db.select().from(schema.schoolSettings);
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      if (SETTING_KEYS.has(row.key)) map[row.key] = row.value;
    }
    return c.json(map);
  })

  .put("/", requireAdmin, async (c) => {
    const parsed = normalizeSettings(await c.req.json());
    if ("error" in parsed) return c.json({ message: parsed.error }, 400);

    // Validate the entire payload before writing any setting, so one bad value
    // cannot leave a partially-updated school configuration.
    for (const [key, value] of Object.entries(parsed.value)) {
      await setSetting(key, value);
    }
    return c.json({ ok: true, settings: parsed.value });
  });
