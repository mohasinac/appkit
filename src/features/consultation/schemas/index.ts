import { z } from "zod";

export const consultationStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

export const consultationModeSchema = z.enum(["online", "in_person", "phone"]);

/**
 * Base Zod schema for a consultation booking.
 *
 * @example
 * import { consultationBookingSchema } from "@mohasinac/feat-consultation";
 *
 * const mySchema = consultationBookingSchema.extend({
 *   consultantId: z.string(),
 * });
 */
export const consultationBookingSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  concern: z.array(z.string()).optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  mode: consultationModeSchema.optional(),
  message: z.string().optional(),
  status: consultationStatusSchema.default("pending"),
  adminNote: z.string().optional(),
  createdAt: z.string().optional(),
});

/**
 * Form schema for submitting a new consultation booking.
 */
export const bookConsultationSchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name.").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "An email address is required.")
    .email("That doesn't look like an email address."),
  // Same shape as the corporate enquiry's — see the note there.
  phone: z
    .string()
    .trim()
    .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.")
    .optional()
    .or(z.literal("")),
  /*
   * Optional here, though the document treats it as the subject of the
   * booking: the public form does not render a concern picker, so requiring it
   * would reject every submission the form can produce. The admin-side booking
   * path is where it is set.
   */
  concern: z.array(z.string()).optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  mode: consultationModeSchema.optional(),
  message: z.string().trim().max(4000).optional(),
});
