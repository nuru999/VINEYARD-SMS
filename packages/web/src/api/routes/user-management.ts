import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { auth } from "../auth";
import { user as userTable } from "../database/auth-schema";

const ROLES = ["admin", "principal", "teacher", "accountant"] as const;
type AppRole = typeof ROLES[number];

const DESIGNATION_BY_ROLE: Record<AppRole, string> = {
  admin: "Admin",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
};

function validRole(value: unknown): value is AppRole {
  return typeof value === "string" && ROLES.includes(value as AppRole);
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensureTeacherStaffLink(user: any) {
  const [linked] = await db.select().from(schema.staff).where(eq(schema.staff.userId, user.id));
  if (linked) {
    if (linked.designation !== "Teacher") {
      await db.update(schema.staff)
        .set({ designation: "Teacher" })
        .where(eq(schema.staff.id, linked.id));
    }
    return linked.id;
  }

  const allStaff = await db.select().from(schema.staff);
  const matchingUnlinked = allStaff.find((member) =>
    !member.userId && member.email?.trim().toLowerCase() === String(user.email || "").trim().toLowerCase()
  );

  if (matchingUnlinked) {
    await db.update(schema.staff)
      .set({ userId: user.id, designation: "Teacher" })
      .where(eq(schema.staff.id, matchingUnlinked.id));
    return matchingUnlinked.id;
  }

  const [created] = await db.insert(schema.staff).values({
    userId: user.id,
    name: String(user.name || user.email || "Teacher").trim(),
    email: String(user.email || "").trim().toLowerCase() || null,
    designation: "Teacher",
    status: "active",
  }).returning();
  return created.id;
}

async function cleanupApplicationLinks(userId: string) {
  await db.update(schema.classes)
    .set({ teacherUserId: null })
    .where(eq(schema.classes.teacherUserId, userId));

  await db.update(schema.staff)
    .set({ userId: null })
    .where(eq(schema.staff.userId, userId));

  await db.delete(schema.userProfiles).where(eq(schema.userProfiles.userId, userId));
}

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
      role: profileMap.get(u.id)?.role ?? "unconfigured",
      createdAt: u.createdAt,
      assignedClass: classMap.get(u.id) ?? null,
    }));

    return c.json({ users });
  })

  .post("/users", requireAdmin, async (c) => {
    const body = await c.req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const targetRole: AppRole = validRole(body.role ?? "teacher") ? body.role ?? "teacher" : "teacher";

    if (!name || name.length > 160 || !email || !validEmail(email) || password.length < 8) {
      return c.json({ message: "Valid name, email, and a password of at least 8 characters are required" }, 400);
    }
    if (!validRole(body.role ?? "teacher")) {
      return c.json({ message: "role must be admin, principal, teacher or accountant" }, 400);
    }

    const [duplicateUser] = await db.select().from(userTable).where(eq(userTable.email, email));
    if (duplicateUser) return c.json({ message: "A user with this email already exists" }, 409);

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

    const result = await auth.api.signUpEmail({ body: { name, email, password } });
    if (!result || (result as any).error) {
      return c.json({ message: (result as any)?.error?.message ?? "Failed to create user" }, 400);
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
        if (targetStaffId) {
          await db.update(schema.staff)
            .set({
              userId: newUser.id,
              name,
              email,
              designation: "Teacher",
              status: "active",
            })
            .where(eq(schema.staff.id, targetStaffId));
        } else {
          await ensureTeacherStaffLink({ ...newUser, name, email });
        }
      }

      if (targetRole === "teacher" && classId) {
        await db.update(schema.classes)
          .set({ teacherUserId: null })
          .where(eq(schema.classes.teacherUserId, newUser.id));
        await db.update(schema.classes)
          .set({ teacherUserId: newUser.id })
          .where(eq(schema.classes.id, classId));
      }
    } catch (error) {
      // Fail closed if application setup is interrupted. Remove role/link state
      // first so an auth identity can never fall through to teacher privileges,
      // then best-effort remove the Better Auth identity as well.
      await cleanupApplicationLinks(newUser.id).catch(() => {});
      await db.delete(userTable).where(eq(userTable.id, newUser.id)).catch(() => {});
      throw error;
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

    // Delete the identity first. Better Auth account/session rows reference the
    // user with ON DELETE CASCADE, so a successful delete removes active login
    // material. Never suppress a failure here or report a false success.
    const deleted = await db.delete(userTable)
      .where(eq(userTable.id, id))
      .returning({ id: userTable.id });
    if (!deleted.length) {
      return c.json({ message: "Failed to delete authentication account" }, 500);
    }

    await cleanupApplicationLinks(id);
    return c.json({ message: "User deleted" });
  })

  .put("/users/:id/role", requireAdmin, async (c) => {
    const id = c.req.param("id");
    const adminUser = c.get("user")!;
    const { role } = await c.req.json();

    if (!validRole(role)) {
      return c.json({ message: "role must be admin, principal, teacher or accountant" }, 400);
    }

    const [existingUser] = await db.select().from(userTable).where(eq(userTable.id, id));
    if (!existingUser) return c.json({ message: "User not found" }, 404);

    const [currentProfile] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.userId, id));
    if (!currentProfile || !validRole(currentProfile.role)) {
      return c.json({ message: "User does not have a configured application role" }, 409);
    }
    const currentRole = currentProfile.role;

    if (id === adminUser.id && currentRole === "admin" && role !== "admin") {
      return c.json({ message: "You cannot remove your own admin access" }, 400);
    }

    if (role === "admin") {
      const admins = await db
        .select()
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.role, "admin"));
      if (currentRole !== "admin" && admins.length >= 2) {
        return c.json({ message: "Maximum 2 admin accounts allowed" }, 400);
      }
    }

    if (role !== "teacher") {
      await db.update(schema.classes)
        .set({ teacherUserId: null })
        .where(eq(schema.classes.teacherUserId, id));
    }

    const [linkedStaff] = await db.select().from(schema.staff).where(eq(schema.staff.userId, id));
    if (role === "teacher") {
      await ensureTeacherStaffLink(existingUser);
    } else if (linkedStaff && linkedStaff.designation !== DESIGNATION_BY_ROLE[role]) {
      await db.update(schema.staff)
        .set({ designation: DESIGNATION_BY_ROLE[role] })
        .where(eq(schema.staff.id, linkedStaff.id));
    }

    await db
      .update(schema.userProfiles)
      .set({ role })
      .where(eq(schema.userProfiles.userId, id));

    return c.json({
      message: "Role updated",
      role,
      classAssignmentsCleared: currentRole === "teacher" && role !== "teacher",
    });
  });
