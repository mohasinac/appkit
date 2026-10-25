#!/usr/bin/env node
/*
 * audit-schema-form-parity — a document field with no form control is a
 * DECISION NOBODY MADE.
 *
 * WHY THIS EXISTS (owner's instruction, 2026-10-25): a field added to a
 * Firestore document schema and never wired into the authoring form compiles,
 * round-trips, validates, and is invisible to the only people who would ever
 * set it. Nothing fails. This codebase has paid for that exact shape several
 * times over in other layers — a `page.tsx` with no nav entry (Root Cause
 * #37), a registry with no readers (the retired `route-schema-registry`),
 * `couponIds` with no renderer — and the schema→form gap is the same class.
 *
 * 🛑 THIS AUDIT DOES NOT SAY "ADD A FIELD". It says "nobody has recorded a
 * decision about this field." Plenty of document fields correctly have no form
 * control: `searchTxt` is derived on write, `statusHistory` is appended by the
 * repository, rollup counters are written by scheduled jobs, `createdAt` is
 * the base document's. The audit's job is to force that answer to be WRITTEN
 * DOWN once, not to demand an input for every key.
 *
 * So the resolution of a finding is always one of exactly two things:
 *   1. wire the field into the form, or
 *   2. add it to EXEMPT below WITH A REASON.
 *
 * Both are a decision. Neither is silence, which is what exists today.
 *
 * 🛑 IT IS A RATCHET, NOT A BASELINE. `KNOWN_GAPS` names every pre-existing
 * unreviewed field individually and may only SHRINK; a field that is new to a
 * schema fails the build. A baseline tolerating "N violations" would let the
 * next one hide in the count — see § "Staged audits — a ratchet is not a
 * baseline" in CLAUDE.md.
 *
 * 🛑 SEEDED FROM A RUN OF ITS OWN RULE, never from the grep written while
 * designing it. Root Cause #84: every hand-written enumeration in this repo
 * has come in under the audit's own count, and adopting the hand list would
 * bless the difference silently.
 *
 * Lives in appkit rather than the consumer's `scripts/` because it is not
 * business-related — it is a structural guarantee about how schemas and forms
 * are written, so every consumer of appkit should inherit it.
 *
 * USAGE
 *   node appkit/scripts/audit-schema-form-parity.mjs
 *   MIGRATE=strict  — fail on KNOWN_GAPS too, to see the real remaining work
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FEATURES = join(HERE, "..", "src", "features");
const STRICT = process.env.MIGRATE === "strict";

/**
 * Which document interface each form schema authors.
 *
 * 🛑 EXPLICIT, NOT INFERRED FROM THE FILENAME. `coupon-form.ts` lives under
 * `features/seller/` and authors `CouponDocument`, which is declared under
 * `features/promotions/` — a filename heuristic resolves that to nothing and
 * then reports the form as having no schema, which is a false clean rather
 * than a false positive. Silence is the failure mode this audit exists to
 * remove, so it must not introduce its own.
 *
 * A form whose document is genuinely not a stored document (a resolve form, an
 * adjustment form — these write a COMMAND, not a record) maps to `null` and is
 * skipped with that stated.
 */
const FORM_DOCUMENT = {
  "addresses/address-form.ts": "AddressDocument",
  "admin/admin-user-form.ts": "UserDocument",
  "admin/homepage-section-form.ts": "HomepageSectionDocument",
  "admin/nav-item-form.ts": null, // nav items are a settings sub-object, not a document
  "admin/site-settings-form.ts": "SiteSettingsDocument",
  "admin/action-index-form.ts": null, // an index rebuild command
  "ads/creative-form.ts": "AdCreativeDocument",
  "blog/blog-form.ts": "BlogPostDocument",
  "categories/bundle-form.ts": "CategoryDocument",
  "events/event-form.ts": "EventDocument",
  "grouped/grouped-listing-form.ts": "GroupedListingDocument",
  "payment-cases/resolve-form.ts": null, // a resolution command, not a record
  "points/adjust-form.ts": null, // an adjustment command
  "scams/report-form.ts": "ScammerDocument",
  "seller/coupon-form.ts": "CouponDocument",
  "seller/product-form.ts": "ProductDocument",
  "store-extensions/admin-notification-form.ts": "AdminNotificationDocument",
  "store-extensions/custom-role-form.ts": "CustomRoleDocument",
  "store-extensions/google-config-form.ts": null, // a settings sub-object
  "store-extensions/item-request-create-form.ts": "ItemRequestDocument",
};

/**
 * Fields that are correctly absent from every form, whatever the document.
 *
 * These are written by the repository, a trigger, or a scheduled job — never
 * by a human in a form. Listed once here rather than repeated per document.
 */
const UNIVERSALLY_SERVER_OWNED = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "deletedAt",
  // Derived search index — see appkit/src/utils/search-txt.ts.
  "searchTxt",
  // Appended by the repository write primitives, never authored.
  "statusHistory",
  "statusHistoryTruncated",
  // Test-fixture plumbing, set by the seeder and swept by testDataCleanup.
  "isTestData",
  "testDataExpiresAt",
]);

/**
 * Per-document exemptions, each WITH A REASON.
 *
 * 🛑 A reason that just restates the field name ("stats are stats") is not a
 * reason. The test is whether a reader who has never seen the field can tell
 * why no human sets it.
 */
const EXEMPT = {
  EventDocument: {
    stats: "rollup counters — written by entry/like handlers, never authored",
    searchTxt: "derived on write",
  },
};

/**
 * Strip comments before any brace counting.
 *
 * 🛑 NOT COSMETIC. These files carry long block comments that contain braces
 * and colons — `address-form.ts` opens with a nine-line rationale mentioning
 * `/^\d{6}$/`. Counting those braces desynchronises the depth tracker for the
 * rest of the file, and the symptom is a parser that silently reports every
 * real field as missing.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Keys at the top level of a braced body, by DEPTH — never by indentation.
 *
 * 🛑 INDENTATION WAS THE FIRST DRAFT AND IT WAS WRONG, in the direction that
 * matters: it assumed two leading spaces, and `addressFormSchema` is written
 * `z\n  .object({` so its members sit at FOUR. The audit then reported
 * `fullName`, `phone`, `city` and every other obviously-present field as
 * missing — 176 findings, nearly all false.
 *
 * An audit whose findings are mostly false is worse than no audit, because the
 * real ones get dismissed along with the noise (the `lister-opts-forwarding`
 * first draft: 11 findings, 9 false). Depth is the property actually being
 * tested; indentation was a proxy for it that any formatting choice breaks.
 */
function topLevelKeys(body, keyPattern) {
  const keys = [];
  let depth = 0;

  for (const line of body.split(/\r?\n/)) {
    // Depth is measured at the START of the line, before this line's brackets.
    if (depth === 0) {
      const m = keyPattern.exec(line.trim());
      if (m) keys.push(m[1]);
      // A closer sitting at depth 0 ends the body.
      if (/^[\}\)\]]/.test(line.trim()) && keys.length > 0) break;
    }
    depth += (line.match(/[\{\(\[]/g) ?? []).length;
    depth -= (line.match(/[\}\)\]]/g) ?? []).length;
    if (depth < 0) break;
  }
  return keys;
}

/** Every top-level member of `export interface <name> ... { … }`. */
function documentFields(source, interfaceName) {
  const clean = stripComments(source);
  const start = new RegExp(
    `export interface ${interfaceName}\\b[^{]*\\{`,
    "m",
  ).exec(clean);
  if (!start) return null;

  return topLevelKeys(
    clean.slice(start.index + start[0].length),
    /^(\w+)\??\s*:/,
  );
}

/**
 * Every top-level key of the form's `z.object({ … })`.
 *
 * 🛑 The opener is matched with whitespace tolerance (`z\s*\.\s*object`),
 * because `z\n  .object({` is a real and common formatting in this tree — six
 * of the twenty form schemas are written that way, and a tight `z\.object\(\{`
 * reported every one of them as "no z.object found" and SKIPPED them. A
 * skipped form reads as a pass.
 */
function formFields(source) {
  const clean = stripComments(source);
  const start = /z\s*\.\s*object\s*\(\s*\{/.exec(clean);
  if (!start) return null;

  return topLevelKeys(clean.slice(start.index + start[0].length), /^(\w+)\s*:/);
}

/** Find the file declaring `export interface <name>` anywhere under features. */
function findDocumentSource(interfaceName) {
  const needle = new RegExp(`export interface ${interfaceName}\\b`);
  for (const feature of readdirSync(FEATURES)) {
    const schemas = join(FEATURES, feature, "schemas");
    if (!existsSync(schemas)) continue;
    for (const file of readdirSync(schemas)) {
      if (!file.endsWith(".ts")) continue;
      const full = join(schemas, file);
      const src = readFileSync(full, "utf8");
      if (needle.test(src)) return { full, src };
    }
  }
  return null;
}

/*
 * ── KNOWN_GAPS ────────────────────────────────────────────────────────────
 *
 * 🛑 EMPTY ON PURPOSE AT THE MOMENT OF WRITING, and it must be filled by
 * running this audit — not by hand. Seeding a ratchet from the author's guess
 * is Root Cause #84, and that mistake is specifically why `listing-delegation`
 * was seeded at 45 routes when its own rule found 61.
 *
 * Fill it with the output of a real run, triaged entry by entry: each one
 * either gets a form control or moves to EXEMPT with a reason. What is left
 * after that triage is the ratchet.
 */
const KNOWN_GAPS = new Set([
  // ── AddressDocument — 10 awaiting triage
  "AddressDocument.addressHash",
  "AddressDocument.autoBanned",
  "AddressDocument.banReason",
  "AddressDocument.banStatus",
  "AddressDocument.bannedAt",
  "AddressDocument.bannedBy",
  "AddressDocument.ownerId",
  "AddressDocument.ownerType",
  "AddressDocument.unbanRequestNote",
  "AddressDocument.unbanRequestedAt",

  // ── AdminNotificationDocument — 2 awaiting triage
  "AdminNotificationDocument.isRead",
  "AdminNotificationDocument.readAt",

  // ── BlogPostDocument — 6 awaiting triage
  "BlogPostDocument.additionalImages",
  "BlogPostDocument.authorAvatar",
  "BlogPostDocument.authorId",
  "BlogPostDocument.contentImages",
  "BlogPostDocument.readTimeMinutes",
  "BlogPostDocument.views",

  // ── CategoryDocument — 49 awaiting triage
  "CategoryDocument.aliases",
  "CategoryDocument.ancestors",
  "CategoryDocument.brandCountry",
  "CategoryDocument.brandFounded",
  "CategoryDocument.brandSlug",
  "CategoryDocument.brandWebsite",
  "CategoryDocument.bundleCategorySlugs",
  "CategoryDocument.bundleItemDetails",
  "CategoryDocument.bundleKind",
  "CategoryDocument.bundleOriginalTotal",
  "CategoryDocument.bundlePrice",
  "CategoryDocument.bundleProductIds",
  "CategoryDocument.bundleQueryResolvedAt",
  "CategoryDocument.bundleQueryRule",
  "CategoryDocument.bundleStockStatus",
  "CategoryDocument.categoryType",
  "CategoryDocument.childrenIds",
  "CategoryDocument.contentBody",
  "CategoryDocument.createdByStoreId",
  "CategoryDocument.createdByStoreName",
  "CategoryDocument.createdByType",
  "CategoryDocument.description",
  "CategoryDocument.descriptionTemplates",
  "CategoryDocument.display",
  "CategoryDocument.faqs",
  "CategoryDocument.featuredPriority",
  "CategoryDocument.hasbroCoverImage",
  "CategoryDocument.hasbroName",
  "CategoryDocument.highlights",
  "CategoryDocument.isActive",
  "CategoryDocument.isBrand",
  "CategoryDocument.isFeatured",
  "CategoryDocument.isLeaf",
  "CategoryDocument.isSearchable",
  "CategoryDocument.itemCode",
  "CategoryDocument.metrics",
  "CategoryDocument.name",
  "CategoryDocument.order",
  "CategoryDocument.parentIds",
  "CategoryDocument.path",
  "CategoryDocument.position",
  "CategoryDocument.productDefaults",
  "CategoryDocument.rootId",
  "CategoryDocument.seo",
  "CategoryDocument.seoCanonicalPath",
  "CategoryDocument.showOnHomepage",
  "CategoryDocument.slug",
  "CategoryDocument.subtreeSize",
  "CategoryDocument.tier",

  // ── CouponDocument — 13 awaiting triage
  "CouponDocument.applicableToAuctions",
  "CouponDocument.bxgy",
  "CouponDocument.description",
  "CouponDocument.discount",
  "CouponDocument.name",
  "CouponDocument.pointsPercent",
  "CouponDocument.restrictions",
  "CouponDocument.scope",
  "CouponDocument.stats",
  "CouponDocument.storeId",
  "CouponDocument.tiers",
  "CouponDocument.usage",
  "CouponDocument.validity",

  // ── EventDocument — 36 awaiting triage
  "EventDocument.additionalImages",
  "EventDocument.allowGuestParticipation",
  "EventDocument.carouselConfig",
  "EventDocument.coverImage",
  "EventDocument.coverImageUrl",
  "EventDocument.description",
  "EventDocument.eventImages",
  "EventDocument.feedbackConfig",
  "EventDocument.hasRaffle",
  "EventDocument.isPinned",
  "EventDocument.lotteryConfig",
  "EventDocument.offerConfig",
  "EventDocument.pollConfig",
  "EventDocument.raffleEntryCount",
  "EventDocument.raffleGithubFunctionUrl",
  "EventDocument.rafflePrize",
  "EventDocument.rafflePrizeCouponCode",
  "EventDocument.rafflePrizeCouponCodes",
  "EventDocument.rafflePrizeCouponId",
  "EventDocument.rafflePrizeProductIds",
  "EventDocument.raffleTopN",
  "EventDocument.raffleTriggeredAt",
  "EventDocument.raffleType",
  "EventDocument.raffleWinnerDisplayName",
  "EventDocument.raffleWinnerEntryId",
  "EventDocument.raffleWinnerUserId",
  "EventDocument.saleConfig",
  "EventDocument.slug",
  "EventDocument.spinMaxPerUser",
  "EventDocument.spinPrizes",
  "EventDocument.spinWindowEnd",
  "EventDocument.spinWindowStart",
  "EventDocument.status",
  "EventDocument.surveyConfig",
  "EventDocument.tags",
  "EventDocument.winnerImages",

  // ── GroupedListingDocument — 11 awaiting triage
  "GroupedListingDocument.activeMemberCount",
  "GroupedListingDocument.brandSlug",
  "GroupedListingDocument.categorySlug",
  "GroupedListingDocument.groupDiscountPercent",
  "GroupedListingDocument.groupMaxMembers",
  "GroupedListingDocument.groupMaxUnitsPerMember",
  "GroupedListingDocument.groupMinMembers",
  "GroupedListingDocument.groupRequiredMemberIds",
  "GroupedListingDocument.slug",
  "GroupedListingDocument.storeId",
  "GroupedListingDocument.visibilityStatus",

  // ── HomepageSectionDocument — 3 awaiting triage
  "HomepageSectionDocument.config",
  "HomepageSectionDocument.surface",
  "HomepageSectionDocument.type",

  // ── ItemRequestDocument — 8 awaiting triage
  "ItemRequestDocument.approvedAt",
  "ItemRequestDocument.approvedBy",
  "ItemRequestDocument.closedAt",
  "ItemRequestDocument.opDisplayName",
  "ItemRequestDocument.opUserId",
  "ItemRequestDocument.replies",
  "ItemRequestDocument.replyCount",
  "ItemRequestDocument.status",

  // ── ProductDocument — 100 awaiting triage
  "ProductDocument.allowCoordination",
  "ProductDocument.allowShipBeforeEmiComplete",
  "ProductDocument.assembledFrom",
  "ProductDocument.auctionOriginalEndDate",
  "ProductDocument.authenticity",
  "ProductDocument.availableQuantity",
  "ProductDocument.avgRating",
  "ProductDocument.beyId",
  "ProductDocument.bidCount",
  "ProductDocument.bidsHaveStarted",
  "ProductDocument.brandSlug",
  "ProductDocument.bulkDiscounts",
  "ProductDocument.card",
  "ProductDocument.catalogProductId",
  "ProductDocument.categoryIdNames",
  "ProductDocument.categoryIds",
  "ProductDocument.categoryName",
  "ProductDocument.categoryNames",
  "ProductDocument.categorySlugs",
  "ProductDocument.classified",
  "ProductDocument.colourway",
  "ProductDocument.currency",
  "ProductDocument.currentBid",
  "ProductDocument.customFields",
  "ProductDocument.customSections",
  "ProductDocument.digitalCode",
  "ProductDocument.dimensionsCm",
  "ProductDocument.features",
  "ProductDocument.franchise",
  "ProductDocument.franchiseSlug",
  "ProductDocument.grading",
  "ProductDocument.groupChildSlugs",
  "ProductDocument.groupDiscountPercent",
  "ProductDocument.groupIcon",
  "ProductDocument.groupId",
  "ProductDocument.groupMaxMembers",
  "ProductDocument.groupMaxUnitsPerMember",
  "ProductDocument.groupMinMembers",
  "ProductDocument.groupParentSlug",
  "ProductDocument.groupRequiredMemberIds",
  "ProductDocument.groupTitle",
  "ProductDocument.howToUse",
  "ProductDocument.ingredients",
  "ProductDocument.isGroupParent",
  "ProductDocument.isLot",
  "ProductDocument.isPartOfBundle",
  "ProductDocument.isSold",
  "ProductDocument.leadingBidderId",
  "ProductDocument.listingType",
  "ProductDocument.liveItem",
  "ProductDocument.lotSize",
  "ProductDocument.lotteryConfig",
  "ProductDocument.madeToOrder",
  "ProductDocument.maxPerUser",
  "ProductDocument.mouldVariant",
  "ProductDocument.partGlossaryId",
  "ProductDocument.partOfBundleIds",
  "ProductDocument.partOfBundleTitles",
  "ProductDocument.physicalLocation",
  "ProductDocument.preOrderClosed",
  "ProductDocument.preOrderCurrentCount",
  "ProductDocument.preOrderDepositAmount",
  "ProductDocument.pricePerEntry",
  "ProductDocument.printMeta",
  "ProductDocument.prizeCurrentEntries",
  "ProductDocument.prizeDrawDurationDays",
  "ProductDocument.prizeDrawItems",
  "ProductDocument.prizeDrawMode",
  "ProductDocument.prizeGithubFileUrl",
  "ProductDocument.prizeMaxEntries",
  "ProductDocument.prizeRevealMode",
  "ProductDocument.prizeRevealStatus",
  "ProductDocument.prizeRevealWindowEnd",
  "ProductDocument.prizeRevealWindowStart",
  "ProductDocument.promotionEndDate",
  "ProductDocument.reviewCount",
  "ProductDocument.seoKeywords",
  "ProductDocument.shipping",
  "ProductDocument.shippingInfo",
  "ProductDocument.sourceCatalogueItemId",
  "ProductDocument.sourceCatalogueOwnerId",
  "ProductDocument.sourceShipmentId",
  "ProductDocument.sourceShipmentItemId",
  "ProductDocument.sourceShipmentLotId",
  "ProductDocument.sourceStickerPartOrdinal",
  "ProductDocument.sourceStickerSheetId",
  "ProductDocument.specifications",
  "ProductDocument.storeId",
  "ProductDocument.storeName",
  "ProductDocument.storeRating",
  "ProductDocument.storeReviewCount",
  "ProductDocument.storeSlug",
  "ProductDocument.subcategory",
  "ProductDocument.sublistingCategoryId",
  "ProductDocument.sublistingIcon",
  "ProductDocument.unitLabel",
  "ProductDocument.viewCount",
  "ProductDocument.views30d",
  "ProductDocument.views7d",
  "ProductDocument.weightG",

  // ── ScammerDocument — 18 awaiting triage
  "ScammerDocument.commentCount",
  "ScammerDocument.contestCount",
  "ScammerDocument.displayNames",
  "ScammerDocument.evidence",
  "ScammerDocument.incidentCount",
  "ScammerDocument.isContested",
  "ScammerDocument.mergedFromIds",
  "ScammerDocument.relatedScammerIds",
  "ScammerDocument.reportedBy",
  "ScammerDocument.reporterAttested",
  "ScammerDocument.seoSlug",
  "ScammerDocument.socialMedia",
  "ScammerDocument.status",
  "ScammerDocument.tags",
  "ScammerDocument.verificationNote",
  "ScammerDocument.verifiedAt",
  "ScammerDocument.verifiedBy",
  "ScammerDocument.views",

  // ── SiteSettingsDocument — 35 awaiting triage
  "SiteSettingsDocument.aboutContent",
  "SiteSettingsDocument.actionConfig",
  "SiteSettingsDocument.adSettings",
  "SiteSettingsDocument.background",
  "SiteSettingsDocument.chat",
  "SiteSettingsDocument.credentials",
  "SiteSettingsDocument.disabledRoutes",
  "SiteSettingsDocument.emailSettings",
  "SiteSettingsDocument.faq",
  "SiteSettingsDocument.favicon",
  "SiteSettingsDocument.featuredResults",
  "SiteSettingsDocument.features",
  "SiteSettingsDocument.footerConfig",
  "SiteSettingsDocument.integrations",
  "SiteSettingsDocument.legalPages",
  "SiteSettingsDocument.listings",
  "SiteSettingsDocument.logo",
  "SiteSettingsDocument.messaging",
  "SiteSettingsDocument.motto",
  "SiteSettingsDocument.navConfig",
  "SiteSettingsDocument.navbarConfig",
  "SiteSettingsDocument.notificationChannels",
  "SiteSettingsDocument.payment",
  "SiteSettingsDocument.platformLimits",
  "SiteSettingsDocument.rateChanges",
  "SiteSettingsDocument.returns",
  "SiteSettingsDocument.search",
  "SiteSettingsDocument.shipping",
  "SiteSettingsDocument.siteName",
  "SiteSettingsDocument.socialLinks",
  "SiteSettingsDocument.support",
  "SiteSettingsDocument.tagline",
  "SiteSettingsDocument.theme",
  "SiteSettingsDocument.watermark",
  "SiteSettingsDocument.whatsappFeed",

  // ── UserDocument — 33 awaiting triage
  "UserDocument.avatarMetadata",
  "UserDocument.disabled",
  "UserDocument.dismissedBannerHash",
  "UserDocument.email",
  "UserDocument.googleLinked",
  "UserDocument.googleLinkedEmail",
  "UserDocument.hardBanExpiresAt",
  "UserDocument.hardBanFraudOrderId",
  "UserDocument.hardBanReason",
  "UserDocument.hardBanReinstatedAt",
  "UserDocument.hardBannedAt",
  "UserDocument.hardBannedBy",
  "UserDocument.isDisabled",
  "UserDocument.metadata",
  "UserDocument.notificationPreferences",
  "UserDocument.passwordHash",
  "UserDocument.payoutDetails",
  "UserDocument.permissionGroup",
  "UserDocument.permissions",
  "UserDocument.phoneVerified",
  "UserDocument.photoURL",
  "UserDocument.pointsBalance",
  "UserDocument.publicProfile",
  "UserDocument.scamAwarenessAcknowledgedAt",
  "UserDocument.shippingConfig",
  "UserDocument.slug",
  "UserDocument.softBans",
  "UserDocument.stats",
  "UserDocument.storeId",
  "UserDocument.storeSlug",
  "UserDocument.storeStatus",
  "UserDocument.uiPreferences",
  "UserDocument.uid",
]);

const findings = [];
const skipped = [];
let documentsChecked = 0;

for (const [formPath, documentName] of Object.entries(FORM_DOCUMENT)) {
  const full = join(FEATURES, ...formPath.split("/").slice(0, 1), "schemas", basename(formPath));
  if (!existsSync(full)) {
    skipped.push(`${formPath} — form file not found (renamed or deleted?)`);
    continue;
  }
  if (documentName === null) {
    skipped.push(`${formPath} — authors a command, not a stored document`);
    continue;
  }

  const form = formFields(readFileSync(full, "utf8"));
  if (!form) {
    skipped.push(`${formPath} — no z.object({ … }) found`);
    continue;
  }

  const doc = findDocumentSource(documentName);
  if (!doc) {
    skipped.push(`${formPath} — ${documentName} not declared anywhere`);
    continue;
  }

  const fields = documentFields(doc.src, documentName);
  if (!fields) {
    skipped.push(`${formPath} — ${documentName} found but unparseable`);
    continue;
  }

  documentsChecked++;
  const formSet = new Set(form);
  const exemptions = EXEMPT[documentName] ?? {};

  for (const field of fields) {
    if (formSet.has(field)) continue;
    if (UNIVERSALLY_SERVER_OWNED.has(field)) continue;
    if (exemptions[field]) continue;

    const key = `${documentName}.${field}`;
    if (!STRICT && KNOWN_GAPS.has(key)) continue;
    findings.push({ key, formPath, docFile: doc.full });
  }
}

/*
 * 🛑 THE DENOMINATOR IS PRINTED ON SUCCESS AS WELL AS FAILURE, and every
 * skipped form is NAMED.
 *
 * A filtered subset that reads like a whole suite has cost this project three
 * sessions in three different forms (see the fast-gate note in CLAUDE.md). An
 * audit that silently skipped half its corpus would report a confident green
 * while checking nothing — which is the precise failure
 * `audit_entry_conditions_lie` is about.
 */
console.log(
  `[schema-form-parity] ${documentsChecked} document/form pair(s) checked, ` +
    `${skipped.length} skipped, ${findings.length} finding(s)` +
    (STRICT ? " [MIGRATE=strict]" : ""),
);
for (const s of skipped) console.log(`  · skipped: ${s}`);

if (findings.length > 0) {
  console.error("\nDocument fields with no form control and no recorded decision:\n");
  for (const f of findings) {
    console.error(`  ${f.key}`);
    console.error(`      form: ${f.formPath}`);
    console.error(`      doc:  ${f.docFile}`);
  }
  console.error(
    "\nEach of these is a decision nobody has made. Resolve EVERY one by either:\n" +
      "  1. wiring the field into the form schema, or\n" +
      "  2. adding it to EXEMPT in this script WITH A REASON.\n" +
      "\nIf it is not obvious which — ASK THE OWNER. That is what this audit is for:\n" +
      "a field the product may or may not want a human to set is a product question,\n" +
      "not something to decide silently while passing through.\n",
  );
  process.exit(1);
}

console.log("[schema-form-parity] OK");
