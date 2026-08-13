/**
 * Personal Catalogue (Feature B) Firestore Document Types & Constants.
 *
 * Naming note: this is unrelated to `CatalogProductDocument` (SB-UNI-L, the
 * shared master-catalog sellers create offers against) — "Catalogue" here is
 * a user's personal photo inventory of items they own, slug-prefixed
 * `mycatalog-` to stay visually distinct from `catalog-`.
 */

import {
  generateCatalogueItemId,
  type GenerateCatalogueItemIdInput,
} from "../../../utils/id-generators";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ProductDraftFields } from "../../shipments/schemas/firestore";

export const CATALOGUE_COLLECTION = "catalogueItems" as const;

export type CatalogueVisibility = "public" | "private";
export type CatalogueOwnerRole = "user" | "seller";
export type CatalogueListingStatus = "not_listed" | "pending_admin_approval" | "listed" | "rejected";

export interface CatalogueItemDocument
  extends BaseDocument,
    Partial<Omit<ProductDraftFields, "title" | "images" | "mainImage">> {
  ownerId: string;
  ownerRole: CatalogueOwnerRole;
  title: string;
  description?: string;
  // Reused verbatim from ProductDraftFields shape (string[] / string, exactly
  // ProductDocument's own fields) rather than MediaField[] — the eventual
  // product-creation call is a near-literal field copy. The upload UI still
  // uses <MediaUploadList> (MediaField[]); the same adapter ProductForm.tsx
  // already uses converts at the form boundary.
  images: string[];
  mainImage?: string;
  // `price` (paise, from ProductDraftFields) plays "estimated resale price."
  quantity: number;

  visibility: CatalogueVisibility;
  watermarkOverride?: { text?: string };

  lastImageUpdateAt: Date;
  staleReminderSentAt?: Date;

  listingStatus: CatalogueListingStatus;
  submittedForApprovalAt?: Date;
  rejectionReason?: string;
  linkedProductId?: string;
  linkedProductSlug?: string;
}

export const CATALOGUE_IMAGE_FRESHNESS_DAYS = 30 as const;

export const CATALOGUE_FIELDS = {
  ID: "id",
  OWNER_ID: "ownerId",
  VISIBILITY: "visibility",
  LISTING_STATUS: "listingStatus",
  LAST_IMAGE_UPDATE_AT: "lastImageUpdateAt",
  CREATED_AT: "createdAt",
} as const;

export type CatalogueItemCreateInput = Omit<
  CatalogueItemDocument,
  "id" | "createdAt" | "updatedAt" | "lastImageUpdateAt" | "listingStatus"
>;
export type CatalogueItemUpdateInput = Partial<
  Omit<CatalogueItemDocument, "id" | "createdAt" | "ownerId">
>;

export function createCatalogueItemId(input: GenerateCatalogueItemIdInput): string {
  return generateCatalogueItemId(input);
}
