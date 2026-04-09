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
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  concern: z.array(z.string()).min(1, "Select at least one concern"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  mode: consultationModeSchema.optional(),
  message: z.string().optional(),
});
