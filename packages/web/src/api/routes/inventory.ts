import { Hono } from "hono";
import { db } from "../database";
import { inventoryItems } from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { eq } from "drizzle-orm";

const CATEGORIES = ["Furniture", "Electronics", "Sports", "Stationery", "Kitchen", "Cleaning", "Books", "Laboratory", "Other"] as const;
const CONDITIONS = ["good", "fair", "poor", "damaged"] as const;

const app = new Hono();
app.use("*", requireAuth);

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function inventoryInput(body: any) {
  const quantity = Number(body.quantity);
  const category = String(body.category || "");
  const condition = String(body.condition || "");
  const purchaseDate = body.purchaseDate ? String(body.purchaseDate) : null;

  if (!body.name?.trim() || !Number.isInteger(quantity) || quantity < 0) return null;
  if (!CATEGORIES.includes(category as any) || !CONDITIONS.includes(condition as any)) return null;
  if (purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return null;

  return {
    name: String(body.name).trim(),
    category,
    quantity,
    condition,
    location: body.location ? String(body.location).trim() : null,
    purchaseDate,
    notes: body.notes ? String(body.notes).trim() : null,
  };
}

app.get("/", async (c) => {
  const rows = await db.select().from(inventoryItems);
  return c.json(rows);
});

app.post("/", requireAdminOrPrincipal, async (c) => {
  const input = inventoryInput(await c.req.json());
  if (!input) return c.json({ message: "Valid item name, category, quantity, condition, and purchase date are required" }, 400);

  const [row] = await db.insert(inventoryItems).values(input).returning();
  return c.json(row, 201);
});

app.put("/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid inventory item id" }, 400);

  const input = inventoryInput(await c.req.json());
  if (!input) return c.json({ message: "Valid item name, category, quantity, condition, and purchase date are required" }, 400);

  const [row] = await db.update(inventoryItems).set(input).where(eq(inventoryItems.id, id)).returning();
  if (!row) return c.json({ message: "Inventory item not found" }, 404);
  return c.json(row);
});

app.delete("/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid inventory item id" }, 400);

  const [existing] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  if (!existing) return c.json({ message: "Inventory item not found" }, 404);

  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  return c.json({ success: true });
});

export default app;
