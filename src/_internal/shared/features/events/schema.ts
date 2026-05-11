import { z } from "zod";
import { EVENT_TITLE_MAX_LENGTH, EVENT_DESCRIPTION_MAX_LENGTH } from "./config";

export const eventInputSchema = z.object({
  title: z.string().min(3).max(EVENT_TITLE_MAX_LENGTH),
  slug: z.string().min(1).regex(/^event-[a-z0-9-]+$/, "Slug must start with 'event-'"),
  type: z.enum(["TOURNAMENT", "CONVENTION", "MEETUP", "SALE"]),
  description: z.string().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
  tags: z.array(z.string()).max(10).default([]),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  maxEntries: z.number().int().min(1).optional(),
  imageUrl: z.string().url().optional(),
  location: z.string().max(300).optional(),
  isOnline: z.boolean().default(false),
  entryFee: z.number().int().min(0).default(0),
});

export const eventUpdateSchema = eventInputSchema.partial().omit({ slug: true });

export const registerForEventSchema = z.object({
  eventId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type RegisterForEventInput = z.infer<typeof registerForEventSchema>;
