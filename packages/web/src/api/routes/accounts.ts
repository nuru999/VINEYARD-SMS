import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrAccountant, requireFinanceAccess } from "../middleware/auth";

export const accountsRoutes = new Hono()
  // Principals need read access for school reports, but writes stay with finance admins.
  .get("/", requireFinanceAccess, async (c) => {
    const { type, category, startDate, endDate } = c.req.query();
    let data = await db.select().from(schema.transactions);
    // Filter in JS (SQLite text comparisons are straightforward here)
    if (type) data = data.filter(t => t.type === type);
    if (category) data = data.filter(t => t.category === category);
    if (startDate) data = data.filter(t => t.date >= startDate);
    if (endDate) data = data.filter(t => t.date <= endDate);
    const totalIncome = data.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpense = data.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    return c.json({ transactions: data, summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense } }, 200);
  })
  .post("/", requireAdminOrAccountant, async (c) => {
    const body = await c.req.json();
    const [tx] = await db.insert(schema.transactions).values(body).returning();
    return c.json({ transaction: tx }, 201);
  })
  .put("/:id", requireAdminOrAccountant, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const { id: _id, createdAt, ...safePayload } = body;
    const [tx] = await db.update(schema.transactions).set(safePayload).where(eq(schema.transactions.id, id)).returning();
    return c.json({ transaction: tx }, 200);
  })
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
