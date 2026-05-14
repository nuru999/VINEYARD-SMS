import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const certificatesRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.certificates);
    return c.json({ certificates: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [cert] = await db.insert(schema.certificates).values(body).returning();
    return c.json({ certificate: cert }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [cert] = await db.select().from(schema.certificates).where(eq(schema.certificates.id, id));
    if (!cert) return c.json({ message: "Not found" }, 404);
    return c.json({ certificate: cert }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.certificates).where(eq(schema.certificates.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
