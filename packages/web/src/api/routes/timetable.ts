import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { eq } from "drizzle-orm";

const app = new Hono();
app.use("*", requireAuth);

app.get("/", async (c) => {
  const user = c.get("user")!;
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));
  const role = profile?.role ?? "teacher";

  const rows = await db.select().from(schema.timetableSlots);
  if (role === "admin" || role === "principal") {
    return c.json(rows, 200);
  }

  const classes = await db.select().from(schema.classes);
  const myClassIds = classes.filter((c2) => c2.teacherUserId === user.id).map((c2) => c2.id);
  const myRows = rows.filter((r) => myClassIds.includes(r.classId));
  return c.json(myRows, 200);
});

app.post("/", async (c) => {
  const user = c.get("user")!;
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));
  const role = profile?.role ?? "teacher";
  if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
  const body = await c.req.json();
  const [row] = await db.insert(schema.timetableSlots).values(body).returning();
  return c.json(row, 201);
});

app.put("/:id", async (c) => {
  const user = c.get("user")!;
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));
  const role = profile?.role ?? "teacher";
  if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [row] = await db.update(schema.timetableSlots).set(body).where(eq(schema.timetableSlots.id, id)).returning();
  return c.json(row, 200);
});

app.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));
  const role = profile?.role ?? "teacher";
  if (!['admin','principal'].includes(role)) return c.json({ message: "Forbidden" }, 403);
  const id = Number(c.req.param("id"));
  await db.delete(schema.timetableSlots).where(eq(schema.timetableSlots.id, id));
  return c.json({ success: true }, 200);
});

export default app;
