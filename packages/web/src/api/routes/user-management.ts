import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { auth } from "../auth";
import { user as userTable } from "../database/auth-schema";

export const userManagementRoutes = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [profile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, user.id));

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: profile?.role ?? "teacher",
    });
  })

  .get("/users", requireAdmin, async (c) => {
    const authUsers = await db.select().from(userTable);
    const profiles = await db.select().from(schema.userProfiles);
    const classes = await db.select().from(schema.classes);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const classMap = new Map(
      classes
        .filter((cl) => cl.teacherUserId)
        .map((cl) => [cl.teacherUserId!, { id: cl.id, name: cl.name }])
    );

    const users = authUsers.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: profileMap.get(u.id)?.role ?? "teacher",
      createdAt: u.createdAt,
      assignedClass: classMap.get(u.id) ?? null,
    }));

    return c.json({ users });
  })

  .post("/users", requireAdmin, async (c) => {
    const body = await c.req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return c.json({ message: "name, email, password required" }, 400);
    }
    if (!["admin", "principal", "teacher", "accountant"].includes(role ?? "teacher")) {
      return c.json({ message: "role must be admin, principal, teacher or accountant" }, 400);
    }

    const targetRole = (role ?? "teacher") as "admin" | "principal" | "teacher" | "accountant";

    if (targetRole === "admin") {
      const admins = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.role, "admin"));
      if (admins.length >= 2) {
        return c.json({ message: "Maximum 2 admin accounts allowed" }, 400);
      }
    }

    let targetStaffId: number | null = null;
    if (body.staffId !== undefined && body.staffId !== null && body.staffId !== "") {
      targetStaffId = Number(body.staffId);
      if (targetRole !== "teacher" || !Number.isInteger(targetStaffId) || targetStaffId <= 0) {
        return c.json({ message: "staffId is only valid for an existing teacher staff record" }, 400);
      }

      const [staffMember] = await db.select().from(schema.staff).where(eq(schema.staff.id, targetStaffId));
      if (!staffMember) return c.json({ message: "Selected staff member not found" }, 404);
      if (staffMember.designation !== "Teacher") {
        return c.json({ message: "Selected staff member is not a teacher" }, 400);
      }
      if (staffMember.userId) {
        return c.json({ message: "This staff member already has a login account" }, 409);
      }
    }

    const classId = body.classId ? Number(body.classId) : null;
    if (classId !== null) {
      if (targetRole !== "teacher" || !Number.isInteger(classId) || classId <= 0) {
        return c.json({ message: "classId is only valid for teacher accounts" }, 400);
      }
      const [targetClass] = await db.select().from(schema.classes).where(eq(schema.classes.id, classId));
      if (!targetClass) return c.json({ message: "Selected class not found" }, 404);
    }

    const result = await auth.api.signUpEmail({
      body: { name: String(name).trim(), email: String(email).trim().toLowerCase(), password },
    });

    if (!result || result.error) {
      return c.json({ message: (result as any)?.error?.message ?? "Failed to create user" }, 400);
    }

    const newUser = (result as any).user;

    await db
      .insert(schema.userProfiles)
      .values({ userId: newUser.id, role: targetRole })
      .onConflictDoUpdate({
        target: schema.userProfiles.userId,
        set: { role: targetRole },
      });

    if (targetRole === "teacher") {
      if (targetStaffId) {
        await db.update(schema.staff)
          .set({
            userId: newUser.id,
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            designation: "Teacher",
            status: "active",
          })
          .where(eq(schema.staff.id, targetStaffId));
      } else {
        const existing = await db
          .select()
          .from(schema.staff)
          .where(eq(schema.staff.userId, newUser.id));

        if (!existing.length) {
          await db.insert(schema.staff).values({
            userId: newUser.id,
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            designation: "Teacher",
            status: "active",
          });
        }
      }
    }

    if (targetRole === "teacher" && classId) {
      await db
        .update(schema.classes)
        .set({ teacherUserId: newUser.id })
        .where(eq(schema.classes.id, classId));
    }

    return c.json({ user: { id: newUser.id, email, name, role: targetRole } }, 201);
  })

  .delete("/users/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const user = c.get("user")!;

    if (id === user.id) {
      return c.json({ message: "Cannot delete yourself" }, 400);
    }

    const [existingUser] = await db.select().from(userTable).where(eq(userTable.id, id));
    if (!existingUser) return c.json({ message: "User not found" }, 404);

    await db.update(schema.classes)
      .set({ teacherUserId: null })
      .where(eq(schema.classes.teacherUserId, id));

    await db.update(schema.staff)
      .set({ userId: null })
      .where(eq(schema.staff.userId, id));

    await db.delete(schema.userProfiles).where(eq(schema.userProfiles.userId, id));
    await db.delete(userTable).where(eq(userTable.id, id)).catch(() => {});

    return c.json({ message: "User deleted" });
  })

  .put("/users/:id/role", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const { role } = await c.req.json();

    if (!["admin", "principal", "teacher", "accountant"].includes(role)) {
      return c.json({ message: "role must be admin, principal, teacher or accountant" }, 400);
    }

    const [existingUser] = await db.select().from(userTable).where(eq(userTable.id, id));
    if (!existingUser) return c.json({ message: "User not found" }, 404);

    if (role === "admin") {
      const admins = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.role, "admin"));
      const [currentProfile] = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.userId, id));
      if (currentProfile?.role !== "admin" && admins.length >= 2) {
        return c.json({ message: "Maximum 2 admin accounts allowed" }, 400);
      }
    }

    await db
      .insert(schema.userProfiles)
      .values({ userId: id, role })
      .onConflictDoUpdate({
        target: schema.userProfiles.userId,
        set: { role },
      });

    return c.json({ message: "Role updated" });
  });
