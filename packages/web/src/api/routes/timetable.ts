import { Hono } from "hono";
import { db } from "../database";
import { timetableSlots } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

app.get("/", async (c) => {
  const classId = c.req.query("classId");
  const rows = classId
    ? await db.select().from(timetableSlots).where(eq(timetableSlots.classId, Number(classId)))
    : await db.select().from(timetableSlots);
  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const [row] = await db.insert(timetableSlots).values(body).returning();
  return c.json(row, 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [row] = await db.update(timetableSlots).set(body).where(eq(timetableSlots.id, id)).returning();
  return c.json(row);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(timetableSlots).where(eq(timetableSlots.id, id));
  return c.json({ success: true });
});

export default app;
