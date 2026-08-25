import { z } from "zod";

export const corporateInquiryStatusSchema = z.enum([
  "pending",
  "contacted",
  "proposal_sent",
  "negotiating",
  "closed_won",
  "closed_lost",
]);

/**
 * Base Zod schema for a corporate inquiry record.
 *
 * @example
 * import { corporateInquirySchema } from "@mohasinac/feat-corporate";
 *
 * const mySchema = corporateInquirySchema.extend({
 *   internalNotes: z.string().optional(),
 * });
 */
export const corporateInquirySchema = z.object({
  id: z.string(),
  companyName: z.string(),
  contactPerson: z.string(),
  designation: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  units: z.number().int().positive().optional(),
  budgetPerUnit: z.number().optional(),
  totalBudget: z.number().optional(),
  deliveryDateRequired: z.string().optional(),
  customBranding: z.boolean().default(false),
  status: corporateInquiryStatusSchema.default("pending"),
  adminNote: z.string().optional(),
  createdAt: z.string().optional(),
});

/**
 * Form schema for submitting a corporate inquiry.
 */
export const submitCorporateInquirySchema = z.object({
  companyName: z.string().trim().min(2, "A company name is required.").max(160),
  contactPerson: z.string().trim().min(2, "Who should we reply to?").max(120),
  designation: z.string().trim().max(120).optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "An email address is required.")
    .email("That doesn't look like an email address."),
  // Indian mobile, tolerant of spacing and a country code. Optional — a
  // reachable email is enough, and demanding a phone number loses enquiries.
  phone: z
    .string()
    .trim()
    .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.")
    .optional()
    .or(z.literal("")),
  /*
   * 🛑 COERCED. These were `z.number()`, and this schema's own form sends
   * strings — so every submission carrying a unit count failed to parse the
   * moment anyone actually wired the form to the schema. Bounds are
   * deliberately generous: they catch a mistyped figure, not a large order.
   *
   * A sales reply is priced from these two, and until now both were free text.
   */
  units: z.coerce
    .number({ invalid_type_error: "Enter the number of units as a number." })
    .int("Units must be a whole number.")
    .positive("At least one unit.")
    .max(1_000_000, "That looks like a typo — contact us directly for orders this large.")
    .optional(),
  budgetPerUnit: z.coerce
    .number({ invalid_type_error: "Enter a per-unit budget as a number." })
    .min(0, "A budget cannot be negative.")
    .max(10_000_000, "That looks like a typo.")
    .optional(),
  totalBudget: z.coerce.number().min(0).optional(),
  deliveryDateRequired: z.string().optional(),
  customBranding: z.boolean().default(false),
  message: z.string().trim().max(4000).optional(),
});
