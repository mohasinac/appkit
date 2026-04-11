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
