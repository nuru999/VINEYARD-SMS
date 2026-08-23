import { Hono } from "hono";
import { db } from "../database";
import { libraryBooks, libraryBorrows } from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

// Books
app.get("/books", async (c) => {
  const rows = await db.select().from(libraryBooks);
  return c.json(rows);
});

app.post("/books", requireAdminOrPrincipal, async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(libraryBooks).values(body).returning();
  return c.json(row, 201);
});

app.put("/books/:id", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ message: "Invalid book id" }, 400);
  const body = await c.req.json();
  const { id: _id, createdAt, ...safePayload } = body;
  const [row] = await db
    .update(libraryBooks)
    .set(safePayload)
    .where(eq(libraryBooks.id, id))
    .returning();
  if (!row) return c.json({ message: "Book not found" }, 404);
  return c.json(row);
});

app.delete("/books/:id", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ message: "Invalid book id" }, 400);
  await db.delete(libraryBooks).where(eq(libraryBooks.id, id));
  return c.json({ success: true });
});

// Borrows
app.get("/borrows", async (c) => {
  const rows = await db.select().from(libraryBorrows).orderBy(desc(libraryBorrows.borrowDate));
  return c.json(rows);
});

app.post("/borrows", requireAdminOrPrincipal, async (c) => {
  const body = await c.req.json();
  const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, body.bookId));
  if (!book) return c.json({ message: "Book not found" }, 404);
  if ((book.available ?? 0) <= 0) return c.json({ message: "No available copies" }, 400);

  const [row] = await db.insert(libraryBorrows).values(body).returning();
  await db
    .update(libraryBooks)
    .set({ available: (book.available ?? 0) - 1 })
    .where(eq(libraryBooks.id, body.bookId));
  return c.json(row, 201);
});

app.put("/borrows/:id/return", requireAdminOrPrincipal, async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ message: "Invalid borrow id" }, 400);

  const [borrow] = await db.select().from(libraryBorrows).where(eq(libraryBorrows.id, id));
  if (!borrow) return c.json({ error: "Not found" }, 404);
  if (borrow.status === "returned") return c.json({ message: "Book already returned" }, 400);

  const today = new Date().toISOString().split("T")[0];
  const [row] = await db
    .update(libraryBorrows)
    .set({ returnDate: today, status: "returned" })
    .where(eq(libraryBorrows.id, id))
    .returning();

  const [bookAfterReturn] = await db
    .select()
    .from(libraryBooks)
    .where(eq(libraryBooks.id, borrow.bookId));

  if (bookAfterReturn) {
    const nextAvailable = Math.min(
      bookAfterReturn.copies,
      (bookAfterReturn.available ?? 0) + 1
    );
    await db
      .update(libraryBooks)
      .set({ available: nextAvailable })
      .where(eq(libraryBooks.id, borrow.bookId));
  }

  return c.json(row);
});

export default app;
