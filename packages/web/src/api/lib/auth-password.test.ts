import { describe, expect, test } from "bun:test";
import { hashPassword, verifyPassword } from "./auth-password";

describe("Better Auth password crypto integration", () => {
  test("hashes and verifies credentials through the supported runtime export", async () => {
    const password = "PresentationSafe#2026";
    const hash = await hashPassword(password);

    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPassword({ hash, password })).toBe(true);
    expect(await verifyPassword({ hash, password: "WrongPassword#2026" })).toBe(false);
  });
});
