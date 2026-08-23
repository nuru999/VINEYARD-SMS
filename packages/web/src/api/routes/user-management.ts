import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { auth } from "../auth";
import { user as userTable } from "../database/auth-schema";

const ALLOWED_ROLES = ["admin", "principal", "teacher", "accountant"] as const;
type UserRole = (typeof ALLOWED_ROLES)[number];

export const userManagementRoutes = new Hono()
  // GET /api/me — returns current user's role
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

  // GET /api/me/users — admin: list all users with roles + assigned class
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

  // POST /api/me/users — admin: create a new user
  .post("/users", requireAdmin, async (c) => {
    const body = await c.req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const targetRole = (body.role ?? "teacher") as UserRole;

    if (!name || !email || !password) {
      return c.json({ message: "name, email, password required" }, 400);
    }
    if (!ALLOWED_ROLES.includes(targetRole)) {
      return c.json({ message: "role must be admin, principal, teacher or accountant" }, 400);
    }

    // Validate an optional teacher class before creating any auth/profile/staff rows.
    let classId: number | null = null;
    if (targetRole === "teacher" && body.classId !== undefined && body.classId !== null && body.classId !== "") {
      classId = Number(body.classId);
      if (!Number.isInteger(classId) || classId <= 0) {
        return c.json({ message: "Invalid classId" }, 400);
      }

      const [targetClass] = await db
        .select()
        .from(schema.classes)
        .where(eq(schema.classes.id, classId));
      if (!targetClass) {
        return c.json({ message: "Selected class not found" }, 400);
      }
    }

    if (targetRole === "admin") {
      const admins = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.role, "admin"));
      if (admins.length >= 2) {
        return c.json({ message: "Maximum 2 admin accounts allowed" }, 400);
      }
    }

    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!result || result.error) {
      return c.json(
        { message: (result as any)?.error?.message ?? "Failed to create user" },
        400
      );
    }

    const newUser = (result as any).user;

    try {
      await db
        .insert(schema.userProfiles)
        .values({ userId: newUser.id, role: targetRole })
        .onConflictDoUpdate({
          target: schema.userProfiles.userId,
          set: { role: targetRole },
        });

      if (targetRole === "teacher") {
        const existing = await db
          .select()
          .from(schema.staff)
          .where(eq(schema.staff.userId, newUser.id));

        if (!existing.length) {
          await db.insert(schema.staff).values({
            userId: newUser.id,
            name,
            email,
            designation: "Teacher",
            status: "active",
          });
        }
      }

      if (targetRole === "teacher" && classId) {
        await db
          .update(schema.classes)
          .set({ teacherUserId: newUser.id })
          .where(eq(schema.classes.id, classId));
      }
    } catch (error) {
      // Best-effort cleanup if creating related records fails after Better Auth created the user.
      await db.delete(schema.userProfiles).where(eq(schema.userProfiles.userId, newUser.id)).catch(() => {});
      await db.delete(schema.staff).where(eq(schema.staff.userId, newUser.id)).catch(() => {});
      await db.delete(userTable).where(eq(userTable.id, newUser.id)).catch(() => {});
      throw error;
    }

    return c.json({ user: { id: newUser.id, email, name, role: targetRole } }, 201);
  })

  // DELETE /api/me/users/:id — admin: delete a user
  .delete("/users/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const user = c.get("user")!;

    if (id === user.id) {
      return c.json({ message: "Cannot delete yourself" }, 400);
    }

    await db
      .update(schema.classes)
      .set({ teacherUserId: null })
      .where(eq(schema.classes.teacherUserId, id));
    await db
      .update(schema.staff)
      .set({ userId: null })
      .where(eq(schema.staff.userId, id));
    await db.delete(schema.userProfiles).where(eq(schema.userProfiles.userId, id));
    await db.delete(userTable).where(eq(userTable.id, id)).catch(() => {});

    return c.json({ message: "User deleted" });
  })

  // PUT /api/me/users/:id/role — admin: change role
  .put("/users/:id/role", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const { role } = await c.req.json();

    if (!ALLOWED_ROLES.includes(role)) {
      return c.json({ message: "role must be admin, principal, teacher or accountant" }, 400);
    }

    const [targetUser] = await db.select().from(userTable).where(eq(userTable.id, id));
    if (!targetUser) {
      return c.json({ message: "User not found" }, 404);
    }

    const [currentProfile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, id));

    if (role === "admin" && currentProfile?.role !== "admin") {
      const admins = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.role, "admin"));
      if (admins.length >= 2) {
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
