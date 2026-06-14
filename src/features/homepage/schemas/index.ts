export * from "./firestore";

// ─── Firestore document schemas (W2) ──────────────────────────────────────────
// Mirrors HomepageSectionDocument + CarouselSlideDocument + CarouselDocument in
// ./firestore.ts. Registered into:
//   SCHEMAS.firestore.homepageSections
//   SCHEMAS.firestore.carouselSlides
//   SCHEMAS.firestore.carousels
//
// Per-section-type config schemas live in adminSectionsBuildParse (W5 row 1).
// Here the `config` field is treated as a typed `Record<string, JsonValue>` —
// the section-builder schemas validate it at the form boundary.

import { z } from "zod";
import { auditTimestampsShape, firestoreDateSchema } from "../../../schemas/firestore-helpers";
import type { JsonValue } from "../../../schemas/types";

export const homepageSectionTypeSchema = z.enum([
  "welcome",
  "carousel",
  "stats",
  "trust-indicators",
  "categories",
  "brands",
  "products",
  "pre-orders",
  "auctions",
  "banner",
  "features",
  "reviews",
  "whatsapp-community",
  "faq",
  "blog-articles",
  "newsletter",
  "stores",
  "events",
  "social-feed",
  "custom-cards",
  "google-reviews",
  "featured-bundles",
  "prize-draws",
  "event-raffles",
  "collection-cards",
]);

// JsonValue Zod — used for section configs whose shape varies per section type.
// The section-builder schemas (W5 row 1) provide the per-type validation.
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const homepageSectionFirestoreSchema = z.object({
  id: z.string(),
  type: homepageSectionTypeSchema,
  order: z.number().int(),
  enabled: z.boolean(),
  config: z.record(z.string(), jsonValueSchema),
  ...auditTimestampsShape,
});

export const carouselBackgroundSchema = z.object({
  type: z.enum(["image", "video", "color", "gradient"]),
  url: z.string().optional(),
  mobileUrl: z.string().optional(),
  thumbnail: z.string().optional(),
  color: z.string().optional(),
  gradientFrom: z.string().optional(),
  gradientTo: z.string().optional(),
  gradientAngle: z.number().min(0).max(360).optional(),
  dimOverlay: z
    .object({ enabled: z.boolean(), opacity: z.number().min(0).max(1) })
    .optional(),
});

export const carouselCardSchema = z.object({
  id: z.string(),
  zone: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  mobileZone: z.union([z.literal(2), z.literal(5)]).optional(),
  background: carouselBackgroundSchema,
  content: z
    .object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      textColor: z.string().optional(),
      textAlign: z.enum(["left", "center", "right"]).optional(),
    })
    .optional(),
  buttons: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string(),
        href: z.string(),
        variant: z.enum(["primary", "secondary", "outline", "ghost", "link"]),
        openInNewTab: z.boolean().optional(),
      }),
    )
    .optional(),
  hover: z
    .object({
      effect: z.enum(["scale", "color", "glow", "none"]),
      scaleValue: z.number().optional(),
      colorValue: z.string().optional(),
    })
    .optional(),
  isButtonOnly: z.boolean().optional(),
  gridRow: z.union([z.literal(1), z.literal(2)]).optional(),
  gridCol: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const carouselFirestoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["active", "draft"]),
  slideIds: z.array(z.string()),
  createdBy: z.string(),
  ...auditTimestampsShape,
});

export const carouselSlideFirestoreSchema = z.object({
  id: z.string(),
  carouselId: z.string().nullable().optional(),
  title: z.string(),
  order: z.number().int(),
  active: z.boolean(),
  background: carouselBackgroundSchema.optional(),
  media: z
    .object({
      type: z.enum(["image", "video"]),
      url: z.string(),
      alt: z.string().optional(),
      thumbnail: z.string().optional(),
    })
    .optional(),
  link: z.object({ url: z.string(), openInNewTab: z.boolean() }).optional(),
  mobileMedia: z
    .object({ type: z.enum(["image", "video"]), url: z.string(), alt: z.string().optional() })
    .optional(),
  cards: z.array(carouselCardSchema),
  overlay: z
    .object({
      enabled: z.boolean().optional(),
      color: z.string().optional(),
      opacity: z.number().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      button: z
        .object({
          id: z.string().optional(),
          text: z.string(),
          link: z.string(),
          variant: z.enum(["primary", "secondary", "outline"]),
          openInNewTab: z.boolean(),
        })
        .optional(),
    })
    .optional(),
  settings: z
    .object({
      autoplayDelayMs: z.number().int().optional(),
      height: z.enum(["viewport", "tall", "medium"]).optional(),
    })
    .optional(),
  analytics: z
    .object({ views: z.number().int().nonnegative(), lastViewed: firestoreDateSchema.optional() })
    .optional(),
  createdBy: z.string(),
  ...auditTimestampsShape,
});

export type HomepageSectionFromSchema = z.infer<typeof homepageSectionFirestoreSchema>;
export type CarouselFromSchema = z.infer<typeof carouselFirestoreSchema>;
export type CarouselSlideFromSchema = z.infer<typeof carouselSlideFirestoreSchema>;
