export * from "./firestore";

import { z } from "zod";
import { ERROR_MESSAGES } from "../../../errors/messages";
import { annotate } from "../../shell/field-ui-meta";

// --- Form schemas -------------------------------------------------------------

/*
 * The `annotate()` calls below add UI metadata to a WeakMap keyed on the schema
 * object; they return the same schema and change nothing about parsing. That is
 * what makes them safe on `registerSchema`, which the register ROUTE also
 * parses — the server never reads the registry.
 *
 * Every auth form is a single required section. That is not a section in any
 * interesting sense, and it is not meant to be: `sectionRequired` renders the
 * panel open and non-collapsible, so the page looks exactly as it does today
 * and gains the pinned mobile action bar, which is the whole reason to put a
 * short form through <SectionForm> at all.
 */

/**
 * Login form schema — use with react-hook-form + zodResolver.
 *
 * @example
 * import { loginSchema } from "@mohasinac/feat-auth";
 * const form = useForm({ resolver: zodResolver(loginSchema) });
 */
export const loginSchema = z.object({
  email: annotate(z.string().email(), {
    section: "basics", sectionLabel: "Sign in", sectionRequired: true,
    order: 1, row: "full", inputType: "email", label: "Email",
  }),
  password: annotate(z.string().min(6), {
    section: "basics", order: 2, row: "full", inputType: "password", label: "Password",
  }),
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
  displayName: annotate(z.string().min(1).optional(), {
    section: "basics", sectionLabel: "Create your account", sectionRequired: true,
    order: 1, row: "full", label: "Display name",
  }),
  email: annotate(z.string().email(), {
    section: "basics", order: 2, row: "full", inputType: "email", label: "Email",
  }),
  password: annotate(registerPasswordSchema, {
    section: "basics", order: 3, row: "full", inputType: "password", label: "Password",
    help: "At least 8 characters, with an uppercase letter, a lowercase letter and a number.",
  }),
});

export const forgotPasswordSchema = z.object({
  email: annotate(z.string().email(), {
    section: "basics", sectionLabel: "Reset your password", sectionRequired: true,
    order: 1, row: "full", inputType: "email", label: "Email",
  }),
});

export const resetPasswordSchema = z.object({
  // Carried in the reset link, never typed. `derived` keeps it out of the
  // rendered form; the schema still requires it, because the SUBMIT needs it.
  token: annotate(z.string().min(1), {
    section: "basics", order: 1, derived: true, tier: "t2-server",
  }),
  password: annotate(z.string().min(6), {
    section: "basics", sectionLabel: "Choose a new password", sectionRequired: true,
    order: 2, row: "full", inputType: "password", label: "New password",
  }),
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
