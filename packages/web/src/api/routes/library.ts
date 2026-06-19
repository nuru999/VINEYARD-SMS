import { Hono } from "hono";
import { db } from "../database";
import { libraryBooks, libraryBorrows } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

// Books
app.get("/books", async (c) => {
  const rows = await db.select().from(libraryBooks);
  return c.json(rows);
});

app.post("/books", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(libraryBooks).values(body).returning();
  return c.json(row, 201);
});

app.put("/books/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [row] = await db.update(libraryBooks).set(body).where(eq(libraryBooks.id, id)).returning();
  return c.json(row);
});

app.delete("/books/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(libraryBooks).where(eq(libraryBooks.id, id));
  return c.json({ success: true });
});

// Borrows
app.get("/borrows", async (c) => {
  const rows = await db.select().from(libraryBorrows).orderBy(desc(libraryBorrows.borrowDate));
  return c.json(rows);
});

app.post("/borrows", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(libraryBorrows).values(body).returning();
  // decrement available
  const book = await db.select().from(libraryBooks).where(eq(libraryBooks.id, body.bookId));
  if (book[0]) {
    await db.update(libraryBooks).set({ available: Math.max(0, (book[0].available ?? 1) - 1) }).where(eq(libraryBooks.id, body.bookId));
  }
  return c.json(row, 201);
});

app.put("/borrows/:id/return", async (c) => {
  const id = Number(c.req.param("id"));
  const borrow = await db.select().from(libraryBorrows).where(eq(libraryBorrows.id, id));
  if (!borrow[0]) return c.json({ error: "Not found" }, 404);
  const today = new Date().toISOString().split("T")[0];
  const [row] = await db.update(libraryBorrows).set({ returnDate: today, status: "returned" }).where(eq(libraryBorrows.id, id)).returning();
  // increment available
  const bookAfterReturn = (await db.select().from(libraryBooks).where(eq(libraryBooks.id, borrow[0].bookId)))[0];
  await db.update(libraryBooks).set({ available: (bookAfterReturn?.available ?? 0) + 1 }).where(eq(libraryBooks.id, borrow[0].bookId));
  return c.json(row);
});

export default app;
