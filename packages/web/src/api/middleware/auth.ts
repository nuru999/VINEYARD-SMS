import { createMiddleware } from "hono/factory";
import { auth } from "../auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);

  // Better Auth identity alone is not enough to enter the school application.
  // Every app user must have an explicit profile/role. This prevents a partial
  // account-creation/deletion failure from falling through to route-level
  // `teacher` defaults and accidentally gaining teacher permissions.
  const [profile] = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile) {
    return c.json({ message: "Forbidden: account profile is not configured" }, 403);
  }

  return next();
});

/** Only admin can access */
export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);

  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile || profile.role !== "admin") {
    return c.json({ message: "Forbidden: Admin access required" }, 403);
  }
  return next();
});

/** Admin OR Principal */
export const requireAdminOrPrincipal = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);

  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile || !["admin", "principal"].includes(profile.role)) {
    return c.json({ message: "Forbidden: Admin or Principal access required" }, 403);
  }
  return next();
});

/** Admin OR Accountant */
export const requireAdminOrAccountant = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);

  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile || !["admin", "accountant"].includes(profile.role)) {
    return c.json({ message: "Forbidden: Admin or Accountant access required" }, 403);
  }
  return next();
});

/** Admin, Principal, OR Accountant */
export const requireFinanceAccess = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);

  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile || !["admin", "principal", "accountant"].includes(profile.role)) {
    return c.json({ message: "Forbidden: Finance access required" }, 403);
  }
  return next();
});

/** School operations are available to Admin, Principal, and Teacher — never Accountant. */
export const requireSchoolOperationsAccess = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);

  const [profile] = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.userId, user.id));

  if (!profile || !["admin", "principal", "teacher"].includes(profile.role)) {
    return c.json({ message: "Forbidden: School operations access required" }, 403);
  }
  return next();
});
