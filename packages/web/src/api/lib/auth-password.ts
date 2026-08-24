import {
  hashPassword as betterAuthHashPassword,
  verifyPassword as betterAuthVerifyPassword,
} from "better-auth/crypto";

/**
 * Keep application-side credential updates on Better Auth's public crypto API
 * so generated hashes stay compatible with Better Auth email/password login.
 */
export const hashPassword = betterAuthHashPassword;
export const verifyPassword = betterAuthVerifyPassword;
