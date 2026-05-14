import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const feeStructuresRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.feeStructures);
    return c.json({ feeStructures: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [fs] = await db.insert(schema.feeStructures).values(body).returning();
    return c.json({ feeStructure: fs }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [fs] = await db.update(schema.feeStructures).set(body).where(eq(schema.feeStructures.id, id)).returning();
    return c.json({ feeStructure: fs }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.feeStructures).where(eq(schema.feeStructures.id, id));
    return c.json({ message: "Deleted" }, 200);
  });

export const feePaymentsRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.feePayments);
    return c.json({ payments: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const receiptNo = `RCP-${Date.now()}`;
    const [payment] = await db.insert(schema.feePayments).values({ ...body, receiptNo }).returning();
    return c.json({ payment }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [payment] = await db.select().from(schema.feePayments).where(eq(schema.feePayments.id, id));
    if (!payment) return c.json({ message: "Not found" }, 404);
    return c.json({ payment }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.feePayments).where(eq(schema.feePayments.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
