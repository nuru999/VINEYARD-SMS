import { Hono } from "hono";
import { db } from "../database";
import { transportRoutes, transportAssignments, students } from "../database/schema";
import { requireAuth, requireAdminOrPrincipal } from "../middleware/auth";
import { eq, and } from "drizzle-orm";

const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
const app = new Hono();
app.use("*", requireAuth);

function validId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function routeInput(body: any) {
  const fee = Number(body.fee ?? 0);
  if (!body.name?.trim() || !Number.isFinite(fee) || fee < 0) return null;
  return {
    name: String(body.name).trim(),
    vehicle: body.vehicle ? String(body.vehicle).trim() : null,
    driver: body.driver ? String(body.driver).trim() : null,
    driverPhone: body.driverPhone ? String(body.driverPhone).trim() : null,
    fee,
  };
}

app.get("/routes", async (c) => {
  const rows = await db.select().from(transportRoutes);
  return c.json(rows);
});

app.post("/routes", requireAdminOrPrincipal, async (c) => {
  const input = routeInput(await c.req.json());
  if (!input) return c.json({ message: "Route name and a valid non-negative fee are required" }, 400);

  const [row] = await db.insert(transportRoutes).values(input).returning();
  return c.json(row, 201);
});

app.put("/routes/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid route id" }, 400);

  const input = routeInput(await c.req.json());
  if (!input) return c.json({ message: "Route name and a valid non-negative fee are required" }, 400);

  const [row] = await db.update(transportRoutes).set(input).where(eq(transportRoutes.id, id)).returning();
  if (!row) return c.json({ message: "Transport route not found" }, 404);
  return c.json(row);
});

app.delete("/routes/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid route id" }, 400);

  const [route] = await db.select().from(transportRoutes).where(eq(transportRoutes.id, id));
  if (!route) return c.json({ message: "Transport route not found" }, 404);

  const assigned = await db.select().from(transportAssignments).where(eq(transportAssignments.routeId, id));
  if (assigned.length > 0) {
    return c.json({ message: "Remove student assignments before deleting this route" }, 409);
  }

  await db.delete(transportRoutes).where(eq(transportRoutes.id, id));
  return c.json({ success: true });
});

app.get("/assignments", async (c) => {
  const rows = await db.select().from(transportAssignments);
  return c.json(rows);
});

app.post("/assignments", requireAdminOrPrincipal, async (c) => {
  const body = await c.req.json();
  const studentId = validId(body.studentId);
  const routeId = validId(body.routeId);
  const year = Number(body.year);
  const term = String(body.term || "");

  if (!studentId || !routeId || !TERMS.includes(term as any) || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return c.json({ message: "Valid student, route, term, and year are required" }, 400);
  }

  const [student] = await db.select().from(students).where(eq(students.id, studentId));
  if (!student) return c.json({ message: "Student not found" }, 404);

  const [route] = await db.select().from(transportRoutes).where(eq(transportRoutes.id, routeId));
  if (!route) return c.json({ message: "Transport route not found" }, 404);

  const [existing] = await db.select().from(transportAssignments).where(
    and(
      eq(transportAssignments.studentId, studentId),
      eq(transportAssignments.term, term),
      eq(transportAssignments.year, year)
    )
  );
  if (existing) {
    return c.json({ message: "Student already has a transport assignment for this term and year" }, 409);
  }

  const [row] = await db.insert(transportAssignments).values({ studentId, routeId, term, year }).returning();
  return c.json(row, 201);
});

app.delete("/assignments/:id", requireAdminOrPrincipal, async (c) => {
  const id = validId(c.req.param("id"));
  if (!id) return c.json({ message: "Invalid assignment id" }, 400);

  const [existing] = await db.select().from(transportAssignments).where(eq(transportAssignments.id, id));
  if (!existing) return c.json({ message: "Transport assignment not found" }, 404);

  await db.delete(transportAssignments).where(eq(transportAssignments.id, id));
  return c.json({ success: true });
});

export default app;
