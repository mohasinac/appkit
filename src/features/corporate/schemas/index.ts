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
  companyName: z.string().min(2),
  contactPerson: z.string().min(2),
  designation: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  units: z.number().int().positive().optional(),
  budgetPerUnit: z.number().optional(),
  totalBudget: z.number().optional(),
  deliveryDateRequired: z.string().optional(),
  customBranding: z.boolean().default(false),
});
