import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAdminOrAccountant, requireFinanceAccess } from "../middleware/auth";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;
const STATUSES = ["pending", "paid"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function payrollInput(body: any) {
  const staffId = validId(body.staffId);
  const month = String(body.month || "");
  const year = Number(body.year);
  const basicSalary = Number(body.basicSalary);
  const allowances = Number(body.allowances ?? 0);
  const deductions = Number(body.deductions ?? 0);
  const status = String(body.status || "pending");
  const paidDate = body.paidDate ? String(body.paidDate) : null;

  if (!staffId || !MONTHS.includes(month as any)) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (![basicSalary, allowances, deductions].every(Number.isFinite)) return null;
  if (basicSalary < 0 || allowances < 0 || deductions < 0) return null;
  if (deductions > basicSalary + allowances) return null;
  if (!STATUSES.includes(status as any)) return null;
  if (paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) return null;
  if (status === "paid" && !paidDate) return null;

  return {
    staffId,
    month,
    year,
    basicSalary,
    allowances,
    deductions,
    netSalary: basicSalary + allowances - deductions,
    paidDate: status === "paid" ? paidDate : null,
    status,
  };
}

export const payrollRoutes = new Hono()
  .get("/", requireFinanceAccess, async (c) => {
    const data = await db.select().from(schema.payroll);
    return c.json({ payroll: data }, 200);
  })
  .post("/", requireAdminOrAccountant, async (c) => {
    const input = payrollInput(await c.req.json());
    if (!input) {
      return c.json({ message: "Valid staff, pay period, non-negative salary values, status, and paid date are required" }, 400);
    }

    const [staffMember] = await db.select().from(schema.staff).where(eq(schema.staff.id, input.staffId));
    if (!staffMember) return c.json({ message: "Staff member not found" }, 404);

    const [existing] = await db.select().from(schema.payroll).where(
      and(
        eq(schema.payroll.staffId, input.staffId),
        eq(schema.payroll.month, input.month),
        eq(schema.payroll.year, input.year)
      )
    );

    if (existing) {
      const [updated] = await db.update(schema.payroll).set(input).where(eq(schema.payroll.id, existing.id)).returning();
      return c.json({ payroll: updated }, 200);
    }

    const [record] = await db.insert(schema.payroll).values(input).returning();
    return c.json({ payroll: record }, 201);
  })
  .put("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid payroll id" }, 400);

    const [existingRecord] = await db.select().from(schema.payroll).where(eq(schema.payroll.id, id));
    if (!existingRecord) return c.json({ message: "Payroll record not found" }, 404);

    const input = payrollInput(await c.req.json());
    if (!input) {
      return c.json({ message: "Valid staff, pay period, non-negative salary values, status, and paid date are required" }, 400);
    }

    const [staffMember] = await db.select().from(schema.staff).where(eq(schema.staff.id, input.staffId));
    if (!staffMember) return c.json({ message: "Staff member not found" }, 404);

    const [samePeriod] = await db.select().from(schema.payroll).where(
      and(
        eq(schema.payroll.staffId, input.staffId),
        eq(schema.payroll.month, input.month),
        eq(schema.payroll.year, input.year)
      )
    );
    if (samePeriod && samePeriod.id !== id) {
      return c.json({ message: "A payroll record already exists for this staff member and pay period" }, 409);
    }

    const [record] = await db.update(schema.payroll).set(input).where(eq(schema.payroll.id, id)).returning();
    return c.json({ payroll: record }, 200);
  })
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid payroll id" }, 400);

    const [existing] = await db.select().from(schema.payroll).where(eq(schema.payroll.id, id));
    if (!existing) return c.json({ message: "Payroll record not found" }, 404);

    await db.delete(schema.payroll).where(eq(schema.payroll.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
