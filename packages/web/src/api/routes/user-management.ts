import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { auth } from "../auth";
import { user as userTable } from "../database/auth-schema";

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

  // GET /api/me/users — admin: list all users with roles
  .get("/users", requireAdmin, async (c) => {
    const authUsers = await db.select().from(userTable);
    const profiles = await db.select().from(schema.userProfiles);

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const users = authUsers.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: profileMap.get(u.id)?.role ?? "teacher",
      createdAt: u.createdAt,
    }));

    return c.json({ users });
  })

  // POST /api/me/users — admin: create a new user (teacher or admin)
  .post("/users", requireAdmin, async (c) => {
    const body = await c.req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return c.json({ message: "name, email, password required" }, 400);
    }
    if (!["admin", "teacher"].includes(role ?? "teacher")) {
      return c.json({ message: "role must be admin or teacher" }, 400);
    }

    const targetRole = (role ?? "teacher") as "admin" | "teacher";

    // Enforce max 2 admins
    if (targetRole === "admin") {
      const admins = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.role, "admin"));
      if (admins.length >= 2) {
        return c.json({ message: "Maximum 2 admin accounts allowed" }, 400);
      }
    }

    // Create the user via better-auth admin API or direct DB insert
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!result || result.error) {
      return c.json({ message: (result as any)?.error?.message ?? "Failed to create user" }, 400);
    }

    const newUser = (result as any).user;

    // Upsert profile with role
    await db
      .insert(schema.userProfiles)
      .values({ userId: newUser.id, role: targetRole })
      .onConflictDoUpdate({
        target: schema.userProfiles.userId,
        set: { role: targetRole },
      });

    // If teacher, auto-create a linked staff record (if one doesn't already exist)
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

    return c.json({ user: { id: newUser.id, email, name, role: targetRole } }, 201);
  })

  // DELETE /api/me/users/:id — admin: delete a user
  .delete("/users/:id", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const user = c.get("user")!;

    if (id === user.id) {
      return c.json({ message: "Cannot delete yourself" }, 400);
    }

    await db.delete(schema.userProfiles).where(eq(schema.userProfiles.userId, id));
    // better-auth handles the actual user table
    await db.delete(userTable).where(eq(userTable.id, id)).catch(() => {});

    return c.json({ message: "User deleted" });
  })

  // PUT /api/me/users/:id/role — admin: change role
  .put("/users/:id/role", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const { role } = await c.req.json();

    if (!["admin", "teacher"].includes(role)) {
      return c.json({ message: "role must be admin or teacher" }, 400);
    }

    if (role === "admin") {
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
