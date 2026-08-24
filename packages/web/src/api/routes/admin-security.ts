import { Hono } from "hono";
import { Scrypt } from "better-auth";
import { and, eq } from "drizzle-orm";
import { db } from "../database";
import { account, session, user as userTable } from "../database/auth-schema";
import { requireAdmin } from "../middleware/auth";

export const adminSecurityRoutes = new Hono()
  .post("/users/:id/password", requireAdmin, async (c) => {
    const adminUser = c.get("user")!;
    const targetUserId = c.req.param("id");
    const body = await c.req.json();
    const newPassword = String(body.newPassword || "");

    if (!targetUserId) return c.json({ message: "User id is required" }, 400);
    if (targetUserId === adminUser.id) {
      return c.json({ message: "Use My Profile to change your own password" }, 400);
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      return c.json({ message: "Password must contain between 12 and 128 characters" }, 400);
    }

    const [targetUser] = await db.select().from(userTable).where(eq(userTable.id, targetUserId));
    if (!targetUser) return c.json({ message: "User not found" }, 404);

    const scrypt = new Scrypt();
    const passwordHash = await scrypt.hash(newPassword);
    const updated = await db
      .update(account)
      .set({ password: passwordHash })
      .where(and(eq(account.userId, targetUserId), eq(account.providerId, "credential")))
      .returning({ id: account.id });

    if (!updated.length) {
      return c.json({ message: "This user does not have an email/password credential account" }, 409);
    }

    // A forced reset is a security action: invalidate every active login for the
    // target account so the new password is required on all devices.
    await db.delete(session).where(eq(session.userId, targetUserId));

    return c.json({ message: "Password reset; all sessions revoked" }, 200);
  });
