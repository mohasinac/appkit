export * from "./firestore";

import { z } from "zod";
import { ERROR_MESSAGES } from "../../../errors/messages";

// --- Form schemas -------------------------------------------------------------

/**
 * Login form schema — use with react-hook-form + zodResolver.
 *
 * @example
 * import { loginSchema } from "@mohasinac/feat-auth";
 * const form = useForm({ resolver: zodResolver(loginSchema) });
 */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * Matches the server-side complexity rule enforced in
 * src/app/api/auth/register/route.ts — kept in sync so a password that fails
 * client-side validation is exactly the same one that would fail server-side,
 * instead of passing the client gate and failing with a generic toast after
 * the network round-trip.
 */
export const registerPasswordSchema = z
  .string()
  .min(8, ERROR_MESSAGES.PASSWORD.TOO_SHORT)
  .regex(/[A-Z]/, ERROR_MESSAGES.PASSWORD.NO_UPPERCASE)
  .regex(/[a-z]/, ERROR_MESSAGES.PASSWORD.NO_LOWERCASE)
  .regex(/[0-9]/, ERROR_MESSAGES.PASSWORD.NO_NUMBER);

export const registerSchema = z.object({
  email: z.string().email(),
  password: registerPasswordSchema,
  displayName: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

// --- Auth user schema ---------------------------------------------------------

export const userRoleSchema = z.enum([
  "user",
  "seller",
  "moderator",
  "employee",
  "admin",
]);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  role: userRoleSchema.optional(),
  isEmailVerified: z.boolean().optional(),
});
