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
import type { StatusChangeEntry } from "../../../_internal/shared/history/types";
import type { BaseDocument } from "../../../_internal/shared/types/base-document";
import type { ProductDraftFields } from "../../shipments/schemas/firestore";

export const CATALOGUE_COLLECTION = "catalogueItems" as const;

export type CatalogueVisibility = "public" | "private";
export type CatalogueOwnerRole = "user" | "seller" | "admin";
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
  // `price` (decimal rupees, from ProductDraftFields) plays "estimated resale price."
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

  /**
   * Who changed what, when, and why. See § "Status History" in CLAUDE.md.
   *
   * A catalogue item's status is a small approval workflow between an owner
   * and an admin (`not_listed → pending_admin_approval → listed | rejected`),
   * so "why was mine rejected and by whom" is exactly the question the
   * timeline exists for. `rejectionReason` alone is overwritten by the next
   * decision.
   */
  statusHistory?: StatusChangeEntry[];
  statusHistoryTruncated?: number;
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


/** The fields whose changes earn a timeline entry. */
export const CATALOGUE_TRACKED_FIELDS = [
  "listingStatus",
  "rejectionReason",
  "linkedProductId",
  "submittedForApprovalAt",
] as const;

/**
 * PII on this document, for `withHistory`'s scrub. `ownerId` is a UID, not
 * PII, and is what the timeline's actor already carries.
 */
export const CATALOGUE_HISTORY_PII_FIELDS = ["ownerName", "ownerEmail"] as const;
