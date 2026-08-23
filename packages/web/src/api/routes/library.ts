import { Hono } from "hono";
import { db } from "../database";
import { libraryBooks, libraryBorrows, students, userProfiles } from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { eq, desc, and } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function canManageLoans(userId: string) {
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return !!profile && ["admin", "principal", "teacher"].includes(profile.role);
}

function bookInput(body: any) {
  const copies = Number(body.copies);
  if (!body.title?.trim() || !Number.isInteger(copies) || copies < 1) return null;
  return {
    title: String(body.title).trim(),
    author: body.author ? String(body.author).trim() : null,
    isbn: body.isbn ? String(body.isbn).trim() : null,
    category: body.category ? String(body.category).trim() : null,
    copies,
  };
}

app.get("/books", async (c) => {
  const rows = await db.select().from(libraryBooks);
  return c.json(rows);
});

app.post("/books", requireAdminOrPrincipal, async (c) => {
  const input = bookInput(await c.req.json());
  if (!input) return c.json({ message: "Book title and at least one copy are required" }, 400);

  const [row] = await db.insert(libraryBooks).values({ ...input, available: input.copies }).returning();
  return c.json(row, 201);
});

app.put("/books/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid book id" }, 400);

  const input = bookInput(await c.req.json());
  if (!input) return c.json({ message: "Book title and at least one copy are required" }, 400);

  const [existing] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, id));
  if (!existing) return c.json({ message: "Book not found" }, 404);

  const activeLoans = await db.select().from(libraryBorrows).where(
    and(eq(libraryBorrows.bookId, id), eq(libraryBorrows.status, "borrowed"))
  );
  if (input.copies < activeLoans.length) {
    return c.json({ message: `Copies cannot be lower than ${activeLoans.length} active loan(s)` }, 409);
  }

  const [row] = await db.update(libraryBooks)
    .set({ ...input, available: input.copies - activeLoans.length })
    .where(eq(libraryBooks.id, id))
    .returning();
  return c.json(row);
});

app.delete("/books/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid book id" }, 400);

  const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, id));
  if (!book) return c.json({ message: "Book not found" }, 404);

  const history = await db.select().from(libraryBorrows).where(eq(libraryBorrows.bookId, id));
  if (history.length > 0) {
    return c.json({ message: "This book has loan history and cannot be deleted" }, 409);
  }

  await db.delete(libraryBooks).where(eq(libraryBooks.id, id));
  return c.json({ success: true });
});

app.get("/borrows", async (c) => {
  const rows = await db.select().from(libraryBorrows).orderBy(desc(libraryBorrows.borrowDate));
  return c.json(rows);
});

app.post("/borrows", async (c) => {
  const user = c.get("user")!;
  if (!(await canManageLoans(user.id))) return c.json({ message: "Forbidden: library loan access required" }, 403);

  const body = await c.req.json();
  const bookId = validId(body.bookId);
  const studentId = validId(body.studentId);
  const borrowDate = body.borrowDate;
  const dueDate = body.dueDate;

  if (!bookId || !studentId || !validDate(borrowDate) || !validDate(dueDate) || dueDate < borrowDate) {
    return c.json({ message: "Valid book, student, borrow date, and due date are required" }, 400);
  }

  const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, bookId));
  if (!book) return c.json({ message: "Book not found" }, 404);
  if ((book.available ?? 0) <= 0) return c.json({ message: "No copies of this book are currently available" }, 409);

  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  if (!student) return c.json({ message: "Student not found" }, 404);

  const [duplicate] = await db.select().from(libraryBorrows).where(
    and(
      eq(libraryBorrows.bookId, bookId),
      eq(libraryBorrows.studentId, studentId),
      eq(libraryBorrows.status, "borrowed")
    )
  );
  if (duplicate) return c.json({ message: "This student already has an active loan for this book" }, 409);

  const [row] = await db.insert(libraryBorrows).values({
    bookId,
    studentId,
    borrowDate,
    dueDate,
    returnDate: null,
    status: "borrowed",
  }).returning();

  await db.update(libraryBooks)
    .set({ available: Math.max(0, (book.available ?? 0) - 1) })
    .where(eq(libraryBooks.id, bookId));

  return c.json(row, 201);
});

app.put("/borrows/:id/return", async (c) => {
  const user = c.get("user")!;
  if (!(await canManageLoans(user.id))) return c.json({ message: "Forbidden: library loan access required" }, 403);

  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid loan id" }, 400);

  const [borrow] = await db.select().from(libraryBorrows).where(eq(libraryBorrows.id, id));
  if (!borrow) return c.json({ message: "Loan not found" }, 404);
  if (borrow.status === "returned" || borrow.returnDate) {
    return c.json({ message: "This loan has already been returned" }, 409);
  }

  const [book] = await db.select().from(libraryBooks).where(eq(libraryBooks.id, borrow.bookId));
  if (!book) return c.json({ message: "Referenced book no longer exists" }, 409);

  const today = new Date().toISOString().split("T")[0];
  const [row] = await db.update(libraryBorrows)
    .set({ returnDate: today, status: "returned" })
    .where(eq(libraryBorrows.id, id))
    .returning();

  await db.update(libraryBooks)
    .set({ available: Math.min(book.copies, (book.available ?? 0) + 1) })
    .where(eq(libraryBooks.id, borrow.bookId));

  return c.json(row);
});

export default app;
