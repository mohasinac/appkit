import { z } from "zod";

// ============================================
// COMMON SCHEMAS
// ============================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().min(1).max(100).optional(),
});

export const objectIdSchema = z.string().regex(/^[a-z0-9-]+$/);

export const urlSchema = z.string().url().max(2048);

import {
  isStoredMediaRef,
  MEDIA_URL_MAX_LENGTH,
  MEDIA_URL_MESSAGE,
} from "../utils/media-url";

/**
 * A media reference we are willing to PERSIST.
 *
 * The rule lives in `isStoredMediaRef` (`utils/media-url.ts`) so this schema
 * and its zod-4 twin in `src/validation/request-schemas.ts` cannot drift —
 * the two Zod major versions mean the schema object can't be shared, but the
 * predicate can.
 *
 * This used to be `.url()` + an approved-host refine, which rejected the
 * canonical `/media/<slug>` form that `/api/media/finalize` actually mints.
 * That is what made every avatar save fail with a bare "Validation failed".
 *
 * For a genuine EXTERNAL link (a brand website, a social handle, a tracking
 * URL) use `urlSchema` above — not this.
 */
export const mediaUrlSchema = z
  .string()
  .max(MEDIA_URL_MAX_LENGTH)
  .refine(isStoredMediaRef, { message: MEDIA_URL_MESSAGE });

export const dateStringSchema = z.string().datetime();

// ============================================
// SHARED PRIMITIVES (W2-4 — 2026-05-23)
// Use these instead of redefining the same validators in feature schemas.
// ============================================

/** Discount percentage — 0–100. */
export const discountPercentSchema = z.number().min(0).max(100);

/** Bounded image-array schema factory — caps gallery length. */
export const imageArraySchema = (max: number) =>
  z.array(mediaUrlSchema).max(max, `At most ${max} images allowed`);

/** Slug regex factory. Pass the `<prefix>-` token (e.g. `"product-"`) to enforce prefix discipline. */
export const createSlugValidator = (prefix?: string) =>
  prefix
    ? z
        .string()
        .min(prefix.length + 1)
        .regex(new RegExp(`^${prefix}[a-z0-9-]+$`), `Slug must start with "${prefix}"`)
    : z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens");

/** A Firestore Timestamp converted to JS Date — accepts string or Date instances. */
export const timestampSchema = z.union([z.string().datetime(), z.date()]);

/** Standard `createdAt`/`updatedAt` block — fold into doc schemas with `.merge(timestampsSchema)`. */
export const timestampsSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** Non-empty trimmed string with a length cap. */
export const nonEmptyString = (max = 255) =>
  z.string().trim().min(1, "Required").max(max, `Must be at most ${max} characters`);

/** Optional rich-text body — uses the HTML schema (plain length cap). */
export const richTextBodySchema = (max = 50_000) =>
  z.string().trim().max(max, `Body must be at most ${max} characters`);

// ============================================
// AUTH / USER SCHEMAS
// ============================================

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be less than 128 characters")
  .refine(
    (p) =>
      /[A-Z]/.test(p) &&
      /[a-z]/.test(p) &&
      /\d/.test(p) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
 "Password must contain uppercase, lowercase, number, and special character",
 )
 .refine(
 (p) =>
 !["qwerty", "asdf", "zxcv", "123456", "password", "admin"].some((pat) =>
 p.toLowerCase().includes(pat),
 ),
 "Password contains common patterns",
 );

export const phoneSchema = z
 .string()
 .refine(
 (phone) => /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\D/g, "")),
 "Invalid phone number format",
 )
 .refine((phone) => {
 const digits = phone.replace(/\D/g, "");
 return digits.length >= 10 && digits.length <= 15;
 }, "Phone number must have 10-15 digits");

export const emailSchema = z.string().email().max(255);

/*
 * `addressSchema` is DELETED (W5 / D19).
 *
 * A third naming again — `street`, `pincode`, and a country constrained to a
 * 2-letter code while every stored address holds "India". Its postal rule was
 * `/^\d{5,6}$/`, one of the fifteen that disagreed. Zero consumers outside the
 * barrel.
 */
// ============================================
// AUTH / PROFILE SCHEMAS
// ============================================

export const resetPasswordSchema = z.object({
 token: z.string().min(1, "Reset token is required"),
 newPassword: passwordSchema,
});

export const sendVerificationSchema = z.object({
 email: emailSchema,
});

export const addPhoneSchema = z.object({
 phoneNumber: phoneSchema,
});

export const verifyPhoneSchema = z.object({
 verificationId: z.string().min(1, "Verification ID is required"),
 code: z
 .string()
 .length(6, "Verification code must be exactly 6 digits")
 .regex(/^\d+$/, "Verification code must contain only digits"),
});

export const deleteAccountSchema = z.object({
 confirmation: z.literal("DELETE"),
});

export const changePasswordSchema = z
 .object({
 currentPassword: z.string().min(1, "Current password is required"),
 newPassword: passwordSchema,
 })
 .refine((data) => data.currentPassword !== data.newPassword, {
 message: "New password must differ from current password",
 path: ["newPassword"],
 });

// ============================================
// MEDIA SCHEMAS
// ============================================

export const cropDataSchema = z
 .object({
 sourceUrl: mediaUrlSchema,
 x: z.number().nonnegative(),
 y: z.number().nonnegative(),
 width: z.number().positive(),
 height: z.number().positive(),
 rotation: z.number().min(0).max(360).optional(),
 aspectRatio: z
 .string()
 .regex(/^\d+:\d+$/)
 .optional(),
 outputFolder: z.string().optional(),
 outputFormat: z.enum(["jpeg", "png", "webp"]).optional(),
 quality: z.number().min(1).max(100).optional(),
 minWidth: z.number().int().positive().optional(),
 minHeight: z.number().int().positive().optional(),
 })
 .refine(
 (data) => {
 if (!data.aspectRatio) return true;
 const [wPart, hPart] = data.aspectRatio.split(":").map(Number);
 if (!wPart || !hPart) return true;
 const expectedRatio = wPart / hPart;
 const actualRatio = data.width / data.height;
 return Math.abs(actualRatio - expectedRatio) / expectedRatio < 0.02;
 },
 { message: "Crop dimensions do not match the declared aspect ratio" },
 )
 .refine((data) => !data.minWidth || data.width >= data.minWidth, {
 message: "Crop width does not meet the minimum width requirement",
 })
 .refine((data) => !data.minHeight || data.height >= data.minHeight, {
 message: "Crop height does not meet the minimum height requirement",
 });

export const trimDataSchema = z
 .object({
 sourceUrl: mediaUrlSchema,
 startTime: z.number().nonnegative(),
 endTime: z.number().positive(),
 outputFolder: z.string().optional(),
 outputFormat: z.enum(["mp4", "webm"]).optional(),
 quality: z.enum(["low", "medium", "high"]).optional(),
 })
 .refine((data) => data.endTime > data.startTime, {
 message: "End time must be after start time",
 });

// ============================================
// REQUEST VALIDATION HELPERS
// ============================================

export function validateRequestBody<T>(
 schema: z.ZodSchema<T>,
 body: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
 const result = schema.safeParse(body);
 if (result.success) {
 return { success: true, data: result.data };
 }
 return { success: false, errors: result.error };
}

export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
 const formatted: Record<string, string[]> = {};
 error.issues.forEach((issue) => {
 const path = issue.path.join(".");
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });
  return formatted;
}
