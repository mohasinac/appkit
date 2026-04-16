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

/** Default approved media domains. Extend via `createMediaUrlSchema`. */
export const APPROVED_MEDIA_DOMAINS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "res.cloudinary.com",
  "images.unsplash.com",
  // Add site-specific CDN domains by calling createMediaUrlSchema(extraDomains)
];

export const mediaUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine(
    (url) => {
      try {
        const { hostname } = new URL(url);
        return APPROVED_MEDIA_DOMAINS.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        );
      } catch {
        return false;
      }
    },
    { message: "Image or video URL must be hosted on an approved CDN domain" },
  );

export const dateStringSchema = z.string().datetime();

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

export const addressSchema = z.object({
  street: z
    .string()
    .min(5, "Street address too short")
    .max(100, "Street address too long")
    .refine(
      (street) => !/^[\d\s]+$/.test(street),
      "Street must contain non-numeric characters",
    ),
  city: z
    .string()
    .min(2, "City name too short")
    .regex(/^[a-zA-Z\s\-']+$/, "Invalid city name"),
  state: z.string().min(2, "State code required").max(50, "Invalid state"),
  pincode: z
    .string()
    .refine((pin) => /^\d{5,6}$/.test(pin), "Invalid pincode format"),
  country: z
    .string()
    .length(2, "Country code must be 2 characters")
    .toUpperCase(),
});

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
