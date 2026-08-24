import { and, eq } from "drizzle-orm";
import { client, db } from "../database";
import { account, session, user as userTable } from "../database/auth-schema";
import { staff, userProfiles } from "../database/schema";
import { hashPassword } from "./auth-password";

type Role = "admin" | "principal" | "teacher" | "accountant";

type RotationTarget = {
  role: Role;
  oldEmail: string;
  newEmail: string;
  password: string;
  userId: string;
};

const roleConfigs: Array<{
  role: Role;
  oldEmail: string;
  emailEnv: string;
  passwordEnv: string;
}> = [
  {
    role: "admin",
    oldEmail: "admin@vineyard.school",
    emailEnv: "ROTATE_ADMIN_EMAIL",
    passwordEnv: "ROTATE_ADMIN_PASSWORD",
  },
  {
    role: "principal",
    oldEmail: "principal@vineyard.school",
    emailEnv: "ROTATE_PRINCIPAL_EMAIL",
    passwordEnv: "ROTATE_PRINCIPAL_PASSWORD",
  },
  {
    role: "teacher",
    oldEmail: "teacher@vineyard.school",
    emailEnv: "ROTATE_TEACHER_EMAIL",
    passwordEnv: "ROTATE_TEACHER_PASSWORD",
  },
  {
    role: "accountant",
    oldEmail: "accountant@vineyard.school",
    emailEnv: "ROTATE_ACCOUNTANT_EMAIL",
    passwordEnv: "ROTATE_ACCOUNTANT_PASSWORD",
  },
];

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email.toLowerCase()))
    .limit(1);
  return user;
}

export async function runRoleCredentialRotation() {
  const rotationId = String(process.env.ROLE_CREDENTIAL_ROTATION_ID || "").trim();
  if (!rotationId) return;

  const marker = `role-credential-rotation:${rotationId}`;
  const alreadyApplied = await client.execute({
    sql: "SELECT id FROM app_migrations WHERE id = ? LIMIT 1",
    args: [marker],
  });
  if (alreadyApplied.rows.length > 0) {
    console.log(`[Credential rotation] ${rotationId} already applied; skipping`);
    return;
  }

  const targets: RotationTarget[] = [];

  for (const config of roleConfigs) {
    const newEmail = String(process.env[config.emailEnv] || "").trim().toLowerCase();
    const password = String(process.env[config.passwordEnv] || "");

    if (!validEmail(newEmail)) {
      throw new Error(`${config.emailEnv} must contain a valid email address`);
    }
    if (password.length < 12 || password.length > 128) {
      throw new Error(`${config.passwordEnv} must contain between 12 and 128 characters`);
    }

    const oldUser = await findUserByEmail(config.oldEmail);
    const newUser = await findUserByEmail(newEmail);
    if (oldUser && newUser && oldUser.id !== newUser.id) {
      throw new Error(`Cannot rotate ${config.role}: ${newEmail} already belongs to another user`);
    }

    const targetUser = oldUser ?? newUser;
    if (!targetUser) {
      throw new Error(`Cannot rotate ${config.role}: existing role account was not found`);
    }

    const [profile] = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, targetUser.id))
      .limit(1);
    if (!profile || profile.role !== config.role) {
      throw new Error(`Cannot rotate ${config.role}: account role does not match expected profile`);
    }

    const credentialRows = await db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, targetUser.id), eq(account.providerId, "credential")));
    if (credentialRows.length === 0) {
      throw new Error(`Cannot rotate ${config.role}: credential account is missing`);
    }

    targets.push({
      role: config.role,
      oldEmail: config.oldEmail,
      newEmail,
      password,
      userId: targetUser.id,
    });
  }

  const distinctEmails = new Set(targets.map((target) => target.newEmail));
  if (distinctEmails.size !== targets.length) {
    throw new Error("Each rotated role must have a unique login email");
  }
  const distinctPasswords = new Set(targets.map((target) => target.password));
  if (distinctPasswords.size !== targets.length) {
    throw new Error("Each rotated role must have a unique password");
  }

  // Resolve and validate every target before the first write. If a later write
  // is interrupted, rerunning with the same rotation id is safe because each
  // account is located by either its old or new email and the marker is only
  // written after all four accounts complete.
  const passwordHashes = await Promise.all(targets.map((target) => hashPassword(target.password)));

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const passwordHash = passwordHashes[index];

    await db
      .update(account)
      .set({ password: passwordHash })
      .where(and(eq(account.userId, target.userId), eq(account.providerId, "credential")));

    await db.update(userTable).set({ email: target.newEmail }).where(eq(userTable.id, target.userId));
    await db.update(staff).set({ email: target.newEmail }).where(eq(staff.userId, target.userId));

    // Explicitly preserve the intended role and force every browser/device to
    // authenticate again with the new credentials.
    await db
      .update(userProfiles)
      .set({ role: target.role })
      .where(eq(userProfiles.userId, target.userId));
    await db.delete(session).where(eq(session.userId, target.userId));
  }

  await client.execute({
    sql: "INSERT INTO app_migrations (id) VALUES (?)",
    args: [marker],
  });

  console.log(
    `[Credential rotation] applied ${rotationId} for ${targets
      .map((target) => `${target.role}:${target.newEmail}`)
      .join(", ")}`,
  );
}
