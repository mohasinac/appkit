import { z } from "zod";
import { annotate } from "../../shell/field-ui-meta";

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
  name: annotate(z.string().trim().min(2, "Please tell us your name.").max(120), {
    section: "who", sectionLabel: "Your details", sectionRequired: true,
    order: 1, row: "pair", label: "Your name",
  }),
  email: annotate(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "An email address is required.")
      .email("That doesn't look like an email address."),
    { section: "who", order: 2, row: "pair", inputType: "email", label: "Email" },
  ),
  // Same shape as the corporate enquiry's — see the note there.
  phone: annotate(
    z
      .string()
      .trim()
      .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.")
      .optional()
      .or(z.literal("")),
    { section: "who", order: 3, row: "pair", inputType: "tel", label: "Phone" },
  ),
  /*
   * Optional here, though the document treats it as the subject of the
   * booking: the public form does not render a concern picker, so requiring it
   * would reject every submission the form can produce. The admin-side booking
   * path is where it is set.
   */
  /*
   * NOT `derived`. An earlier annotation here marked it server-owned on the
   * strength of the comment above — and the form does render a picker for it
   * (`ConsultationForm.tsx:92`), conditional on a `concerns` prop rather than
   * on anything the schema can see. `kind: "list"` so the generator asks for a
   * renderer instead of guessing, which is the honest answer for a control
   * whose options arrive from outside the schema.
   */
  concern: annotate(z.array(z.string()).optional(), {
    section: "who", order: 4, row: "full", kind: "list", label: "What do you need help with?",
  }),
  preferredDate: annotate(z.string().optional(), {
    section: "schedule", sectionLabel: "When suits you",
    order: 1, row: "pair", kind: "date", label: "Preferred date",
  }),
  preferredTime: annotate(z.string().optional(), {
    section: "schedule", order: 2, row: "pair", label: "Preferred time",
  }),
  mode: annotate(consultationModeSchema.optional(), {
    section: "schedule", order: 3, row: "pair", kind: "select", label: "How would you like to meet?",
  }),
  message: annotate(z.string().trim().max(4000).optional(), {
    section: "detail", sectionLabel: "Anything else",
    order: 1, row: "full", kind: "textarea", label: "Message",
  }),
});
