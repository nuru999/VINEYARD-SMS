import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const payrollRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const data = await db.select().from(schema.payroll);
    return c.json({ payroll: data }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const net = (body.basicSalary || 0) + (body.allowances || 0) - (body.deductions || 0);
    const [record] = await db.insert(schema.payroll).values({ ...body, netSalary: net }).returning();
    return c.json({ payroll: record }, 201);
  })
  .put("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const net = (body.basicSalary || 0) + (body.allowances || 0) - (body.deductions || 0);
    const [record] = await db.update(schema.payroll).set({ ...body, netSalary: net }).where(eq(schema.payroll.id, id)).returning();
    return c.json({ payroll: record }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.payroll).where(eq(schema.payroll.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
