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
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
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
