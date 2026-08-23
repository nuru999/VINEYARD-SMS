import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrAccountant, requireFinanceAccess } from "../middleware/auth";

const TYPES = ["income", "expense"] as const;
const INCOME_CATEGORIES = ["School Fees", "Donations", "Grants", "Other Income"] as const;
const EXPENSE_CATEGORIES = ["Salaries", "Utilities", "Supplies", "Maintenance", "Transport", "Events", "Other Expense"] as const;
const PAYMENT_METHODS = ["Cash", "M-Pesa", "Bank Transfer"] as const;

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function transactionInput(body: any) {
  const type = String(body.type || "");
  const category = String(body.category || "");
  const description = String(body.description || "").trim();
  const amount = Number(body.amount);
  const date = String(body.date || "");
  const paymentMethod = String(body.paymentMethod || "Cash");
  const reference = body.reference ? String(body.reference).trim() : null;

  if (!TYPES.includes(type as any)) return null;
  const allowedCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!allowedCategories.includes(category as any)) return null;
  if (!description || description.length > 500) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!PAYMENT_METHODS.includes(paymentMethod as any)) return null;
  if (reference && reference.length > 200) return null;

  return { type, category, description, amount, date, paymentMethod, reference };
}

export const accountsRoutes = new Hono()
  .get("/", requireFinanceAccess, async (c) => {
    const { type, category, startDate, endDate } = c.req.query();
    if (type && !TYPES.includes(type as any)) return c.json({ message: "Invalid transaction type" }, 400);
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return c.json({ message: "Invalid start date" }, 400);
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return c.json({ message: "Invalid end date" }, 400);
    if (startDate && endDate && startDate > endDate) return c.json({ message: "Start date cannot be after end date" }, 400);

    let data = await db.select().from(schema.transactions);
    if (type) data = data.filter((t) => t.type === type);
    if (category) data = data.filter((t) => t.category === category);
    if (startDate) data = data.filter((t) => t.date >= startDate);
    if (endDate) data = data.filter((t) => t.date <= endDate);

    const totalIncome = data.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpense = data.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return c.json({ transactions: data, summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense } }, 200);
  })
  .post("/", requireAdminOrAccountant, async (c) => {
    const user = c.get("user")!;
    const input = transactionInput(await c.req.json());
    if (!input) return c.json({ message: "Valid type, category, description, positive amount, date, and payment method are required" }, 400);

    const [creator] = await db.select().from(schema.staff).where(eq(schema.staff.userId, user.id));
    const [tx] = await db.insert(schema.transactions).values({
      ...input,
      createdBy: creator?.id ?? null,
    }).returning();
    return c.json({ transaction: tx }, 201);
  })
  .put("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid transaction id" }, 400);

    const [existing] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id));
    if (!existing) return c.json({ message: "Transaction not found" }, 404);

    const input = transactionInput(await c.req.json());
    if (!input) return c.json({ message: "Valid type, category, description, positive amount, date, and payment method are required" }, 400);

    const [tx] = await db.update(schema.transactions).set(input).where(eq(schema.transactions.id, id)).returning();
    return c.json({ transaction: tx }, 200);
  })
  .delete("/:id", requireAdminOrAccountant, async (c) => {
    const id = validId(c.req.param("id"));
    if (!id) return c.json({ message: "Invalid transaction id" }, 400);

    const [existing] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, id));
    if (!existing) return c.json({ message: "Transaction not found" }, 404);

    await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
    return c.json({ message: "Deleted" }, 200);
  });
