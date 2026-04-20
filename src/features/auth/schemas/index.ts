export * from "./firestore";

import { z } from "zod";

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

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
  "customer",
  "seller",
  "admin",
  "superadmin",
]);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  role: userRoleSchema.optional(),
  isEmailVerified: z.boolean().optional(),
});
