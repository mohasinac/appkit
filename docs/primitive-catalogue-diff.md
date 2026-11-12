# PRIMITIVE CATALOGUE — RESEARCH ↔ CODEBASE DIFF

All paths relative to `D:\proj\letitrip.in\appkit\`. Everything below was read, not recalled.

---

## 0. THE HEADLINE FINDING: FIVE TYPE-KEYED REGISTRIES, NOT ONE

The brief said "8 of 9 capabilities are second names for mechanisms." **Measured, it is worse: there are FIVE registries keyed on listing type, each with its own vocabulary, and one of them does not even agree on the type KEYS.**

| # | Registry | File | Shape | Runtime readers |
|---|---|---|---|---|
| 1 | `LISTING_TYPE_CAPABILITIES` | `src/_internal/shared/listing-types/capabilities.ts` | 10 booleans × 9 types | **yes** — `cart-shipping.ts`, `policy-consent.ts`, ~18 sites |
| 2 | `LISTING_TYPE_REGISTRY` (`ListingTypePlugin`) | `src/_internal/shared/listing-types/_registry.ts:77` | **22 fields** incl. `isAvailable()`, `sortOptions`, `extraFacetKeys`, `primaryActionKind`, `cartLine`, `hideDefault`, `browseRoute` | **yes** |
| 3 | `CHECKOUT_RULES` (`ListingCheckoutRule`) | `src/_internal/shared/checkout/rules/_registry.ts:34` | ~20 fields **+ 6 hook functions** (`splitKey`, `preflightChecks`, `stockDecrementExtras`, `stockIncrementExtras`, `decorateOrderItem`, `decorateOrderDoc`) | **yes** |
| 4 | `LISTING_TYPE_TIER` | `src/_internal/shared/listing-types/tiers.ts:53` | basic/advanced | yes |
| 5 | `listingTypesSeedData[].mechanisms` + `mechanismsSeedData` | `src/seed/listing-types-seed-data.ts`, `src/seed/mechanisms-seed-data.ts` | 24 mechanism ids × 9 types | **ZERO** — grep for `listingTypesSeedData` / `mechanismsSeedData` outside `src/seed/` returns nothing, and `src/seed/manifest.ts` does not seed them to Firestore either |

🛑 **Registry 1 and registry 5 use different keys for the same type**: `"collector-drop"` (capabilities.ts, and the live `ListingType` union) vs `"collector"` (seed, line 138). Any join between them silently drops that type — the exact class of defect `nav-brands`/`nav-public-brands` already cost.

🛑 **`canBid` has no mechanism counterpart at all.** Registry 1 says `collector-drop: canBid: true`; registry 5's `collector` row switches on `offers`/`autoAward`/`buyoutCap` and there is no `bid` mechanism id. The seed re-spelled bidding as offers and registry 1 was never updated.

The same idea by namespace, counted:

| One idea | Spellings in the tree |
|---|---|
| cart eligibility | `canAddToCart` (1) · `addToCart` (5) · `cartEligible` (3) · `cartLine: "blocked"` (2) — **4** |
| physical shipping | `supportsShipping` (1) · `physicalShipping` (5) · `requiresShippingAddress` (3) · `ShippingRuleSet.physical` (`rule-sets-seed-data.ts`) — **4** |
| instant fulfilment | `hasInstantFulfillment` (1) · `instantFulfilment` (5) — **2** |
| offers | `canMakeOffer` (1) · `offers` (5) · `offerRule` (3) — **3** |
| reveal | `supportsSurpriseReveal` (1) · `reveal` + `cancelLockedByReveal` (5) — **3** |
| verified seller | `requiresVendorVerified` (1) · `verifiedSellerOnly` (5) · `verified_seller` (`StoreCapability`) — **3** |
| jurisdiction | `requiresJurisdictionCheck` (1) · `jurisdictionCheck` (5) — **2** |
| returns | `returnsAllowed` (5) · `refundPolicy` + `nonRefundable` (3) · `extended_return_window` (`StoreCapability`) — **4** |
| coins | `acceptsPointsTender` (1 **and** 5 — the one name correctly aligned) · `coinsEarn`/`coinsRedeem` (5) · `CoinRuleSet.canRedeem`/`maxRedemptionShare` — **4** |

---

## TABLE 1 — HAVE

Researched id → existing symbol. "dup" column names the second/third spelling where one exists.

### Commerce / sell
| Researched | Existing symbol | File | dup |
|---|---|---|---|
| `sell.supportsAddToCart` | `canAddToCart` | `listing-types/capabilities.ts:97` | ×4 (above) |
| `sell.supportsBuyNow` | mechanism `buyNow` | `seed/mechanisms-seed-data.ts` | unread seed only |
| `sell.supportsOfferNegotiation` | `canMakeOffer` + `offersEnabledFor()` + `offerIsOnlyPurchasePath()` | `capabilities.ts`, `selling/selling-gate.ts` | ×3 |
| `sell.supportsAuctionBid` | `canBid` | `capabilities.ts` | no mechanism twin |
| `sell.acceptsReservePrice` | `reservePrice` — 39 refs | products schemas | — |
| `sell.acceptsAutoAcceptThreshold` | mechanism `autoAward` + `OfferRuleSet.sellerDecisionHours` | `rule-sets-seed-data.ts` | — |
| `sell.supportsPreOrder` | mechanism `preOrderWindow`, `preorder.rule.ts`, `PREORDER_MAX_DELIVERY_DAYS` | `checkout/rules/preorder.rule.ts`, `checkout/rules/_limits.ts` | — |
| `sell.acceptsCheckoutCharge` (deposit) | `resolveCaptureSplit`, `PaymentProvider.capture: immediate\|on-dispatch\|on-delivery` | `checkout/settlement.ts`, `rule-sets-seed-data.ts:42` | — |
| `sell.supportsBundle` | `bundle.rule.ts`, `CATEGORY_CHECKOUT_RULES`, `resolveBundleMemberIds`, `composite.ts` | `checkout/rules/`, `features/products/composite.ts` | — |
| `sell.supportsConfigurator` (grouped) | mechanism `groupedPurchase`, `line-members.ts`, `resolveGroupWeightG` | `checkout/line-members.ts` | — |
| `sell.supportsSurpriseReveal` | `supportsSurpriseReveal` + `clearance.rule.ts` | `capabilities.ts` | ×3 |
| `sell.isPhysical` | **conflated into `supportsShipping`** — see HALF | `capabilities.ts` | — |
| `sell.supportsWaitlist` | 10 files mention it | — | unverified wiring |
| `sell.supportsGiftCard` → **gift wrap** | `addon-registry.ts` `giftWrap` with free-text payload | `fees/addon-registry.ts` | — |

### Price
| Researched | Existing symbol | File |
|---|---|---|
| `price.supportsTierByQuantity` | ✅ **`resolveBulkDiscountPercent` + case 5 of `unitPriceFor`** | `checkout/order-math.ts:98,207` |
| `price.supportsDynamicPrice` | `lockedPrice` (offer won / drop won) as case 1 of `unitPriceFor` | `order-math.ts` |
| `price.isTaxInclusive` | `TaxRuleSet.includedInDisplayedPrice` + `ITaxProvider.onInclusive`/`onExclusive` as **two distinct methods** | `rule-sets-seed-data.ts`, `contracts/tax.ts:99` |
| `price.acceptsRoundingPolicy` | `roundRupees`, `SHIPPING_ROUND_UP_TO = 50`, `roundShippingUp` | `utils/number.formatter`, `shipping/quote.ts` |
| `price.acceptsCostBasis` | — see MISSING | |

🛑 **CLAUDE.md is STALE on `bulkDiscounts`.** It is listed under "Declared-but-UNWIRED / stored, zero readers". It now has a real reader with a documented best-tier-wins rule and malformed-row skipping. Correct the tracker.

### Promo
| Researched | Existing | File |
|---|---|---|
| `promo.supportsCoupon` | `features/promotions/` (actions, repository, schemas, api) | `features/promotions/` |
| `promo.acceptsCombinationWith` | **`coupon-stacking.ts`** | `features/promotions/actions/coupon-stacking.ts` |
| `promo.supportsLoyaltyAccrual` / `Redemption` | mechanisms `coinsEarn`/`coinsRedeem`, `resolvePointsTender`, `POINTS_EARN_PERCENT` etc. | `features/points/schemas/firestore.ts` |
| `promo.acceptsAccrualRate` / `RedemptionRatio` / `Cap` | `CoinRuleSet.earnPerRupee` / `redeemPerRupee` / `maxRedemptionShare` / `expiryMonths` / `earnedAt` | `seed/rule-sets-seed-data.ts` |

### Tender / money
| Researched | Existing | File |
|---|---|---|
`tender.acceptsMethodRules` | ✅ **`resolvePaymentMethod`** — exactly the researched `platform.disabled \|\| buyerDenied ? OFF : (listing ?? store ?? platform.default)`, with `??` documented and a 3-valued `MethodDecision` reason | `payments/method-resolution.ts:81` |
| `tender.supportsCashOnDelivery` / `CashOnPremises` / `CardOnline` | `PAYMENT_METHOD_CAPABILITIES` rows + `paymentProvidersSeedData` (phonepe/razorpay/cashfree/cod) | `payments/method-capabilities.ts`, `rule-sets-seed-data.ts` |
| `tender.supportsLoyaltyPointsTender` | `acceptsPointsTender` mechanism — see HALF | |
| `tender.supportsOfflineManualProof` | retired-but-readable (`upi_manual`), `admin:orders:payment-override` | `features/auth/permissions/constants.ts` |
| `money.supportsAuthorizeThenCapture` / `PartialCapture` | `IPaymentProvider`, `PaymentCapture`, `resolveCaptureSplit` | `contracts/payment.ts:59`, `checkout/settlement.ts` |
| `money.supportsRefund` / `PartialRefund` | `Refund`, `RefundPolicy.partialGranularity: "item"\|"amount"\|"none"`, `resolveRefundCapacity`, `refundable-base.ts` | `contracts/payment.ts:70`, `checkout/rules/types.ts:30` |
| `money.supportsRefundToAlternateTender` | ✅ **`hasReversibleCapture`** — the researched primitive by its right name | `payments/method-capabilities.ts` |
| `money.supportsChargeback` | `Dispute` (contract) + 26 files | `contracts/payment.ts:115` |
| `money.supportsSettlementSplit` | `SplitInstruction`, `settlement-split.ts`, `split.ts`, `resolveSplit`, `SettlementVendorInput` | `contracts/payment.ts:289`, `checkout/` |
| `money.supportsPayoutSchedule` | `resolvePayoutHoldDays`, `payout-base.ts`, `payouts` collection | `fees/payout-hold.ts` |
| `money.acceptsCommissionFee` / `BuyerFee` | `FeeCommissionRates`, the **documented volume taper table** | `fees/calculator.ts`, `seed/shipping-and-fees-seed-data.ts` |
| `money.isFeeTaxable` / `acceptsFeeTaxRate` | `gstPercent`, GST-on-platform-fee line | `fees/calculator.ts` |
| `money.supportsLedgerPosting` | `features/ledger/rules.ts` + the audit seam | `features/ledger/` |
| `money.requiresIdempotencyKey` | ✅ **`idempotencyKey` — 42 files, 10 direct refs.** CLAUDE.md's "missing" claim is **stale** | across `jobs/`, `payments/` |
| `money.requiresWebhookSignature` | `PaymentRuleSet.requireWebhookSignature: true` (literal `true`, not boolean — unoverridable by design) | `rule-sets-seed-data.ts:88` |
| `price`/`fee` **explainability** | ✅ **`fees/explain.ts` — `FeeDerivation`, one sentence + steps per fee line.** No researched system ships this; it is ahead of them | `fees/explain.ts` |

### Fulfil / stock
| Researched | Existing | File |
|---|---|---|
| `fulfil.supportsShipping` | `supportsShipping`, `IShippingProvider`, `ServiceabilityResult` | `capabilities.ts`, `contracts/shipping.ts` |
| `fulfil.supportsDigitalDelivery` | `hasInstantFulfillment` + mechanism `codePool` + `resolveCodeAssetForOrder` | `capabilities.ts`, `features/digital-codes/` |
| `fulfil.supportsFulfilmentDeferral` | `supportsDeferredFulfilment` + `codeDeliveryMethod` | `capabilities.ts` |
| `fulfil.supportsPartialFulfilment` / `TrackingPerParcel` | `Shipment`, `TrackingInfo`, `TrackingEvent`, `resolveParcel`, `resolveDuplicateDelivery` | `contracts/shipping.ts`, `features/shipping/parcel.ts` |
| `fulfil.acceptsFulfilmentTrigger` | **two booleans, not an enum** — see HALF | |
| `fulfil.supportsReturn` | `return_requested`/`return_in_transit`/`return_received` states + `resolveReturnAddress` + `returns.bornBy` (who pays freight) | `seed/order-flows-seed-data.ts`, `features/admin/schemas/firestore.ts:1501` |
| `fulfil.requiresSignatureAtHandover` | `ShippingRuleSet.signatureRequired` | `rule-sets-seed-data.ts` |
| `fulfil.supportsProofOfDelivery` | `protection-claims`, `resolveDisputeEtd`, `DISPUTE_TRANSIT_WINDOW_DAYS` | `features/orders/dispute-reasons` |
| `stock.supportsOnHand` / `Reserved` | ✅ `stockQuantity` / `availableQuantity`, invariant **`reserved = stockQuantity − availableQuantity`**, `resolveStockResync` | `products.repository.ts`, `features/inventory/schemas/stock-reservation.ts` |
| `stock.supportsCheckoutReservation` | `stockReservations` collection with `expiresAt` TTL + `RESERVATION_HOLDER_KINDS` + `RESERVATION_STATUSES` | `features/inventory/schemas/stock-reservation.ts` |
| `stock.supportsDerivedStock` | `componentStockPolicy: "independent" \| "derived"`, `composite.ts` | `features/products/composite.ts` |
| `stock.acceptsBinLocation` | `inventory-placements.repository.ts`, `storage-boxes.repository.ts`, `AdminStorageBoxesView` | `features/inventory/` |
| `stock.isTracked` | `showsStockQuantity` on the plugin | `listing-types/_registry.ts:90` |

### Comply
| Researched | Existing | File |
|---|---|---|
| `comply.requiresAgeVerification` | event mechanism `ageGate` | `features/events/config/event-types.ts` |
| `comply.requiresIdentityVerification` | `requiresVendorVerified`, `verified_seller`, `business-documents`, `resolveSupplierIdentity` | `capabilities.ts`, `features/business-documents/` |
| `comply.requiresJurisdictionAllowlist` | `requiresJurisdictionCheck` + `live.rule.ts` | `capabilities.ts` |
| `comply.isProhibitedForAcquirer` | ✅ **`requiresGatewayPermission` + `IPaymentProvider.acceptsRestrictedListingTypes`**, explicitly kept separate from `blockedPaymentMethods` with the reasoning written at the line | `checkout/rules/types.ts:120` |
| `comply.acceptsTaxCategory` | `TaxableItem.taxCode` (HSN), `features/tax-codes/` | `contracts/tax.ts:92` |
| `comply.requiresConsentRecord` | ✅ **`policy-consent.ts` — a CLAUSE model, capability-driven, `resolveCheckoutPolicyClauses`/`Version`, admin-editable with a fail-closed default** + `ui/consent/` cookie consent | `checkout/policy-consent.ts` |
| `comply.requiresPreCommitDisclosure` | `Disclaimer.tsx`, `content/disclaimers.ts`, `published-values.ts` token system, `returns.bornBy` disclosure | `_internal/shared/content/` |
| `comply.requiresAuditTrail` | `features/audit-log/`, `recordAdminAction()` | `features/audit-log/` |
| `comply` **two-admin threshold** | `twoAdminApproval` on payment + tax rule sets, `moneyPath` on every mechanism row | `rule-sets-seed-data.ts`, `mechanisms-seed-data.ts` |

### Ident / record / rules
| Researched | Existing | File |
|---|---|---|
| `ident.supportsPartyRole` | `Permission` union (**132 `admin:*` members**, not 120/160), `PERMISSION_GROUPS`, `EmployeeGroup` (17 presets), `ROLE_PERMISSION_BUNDLES` | `features/auth/permissions/constants.ts` (1,215 lines) |
| `ident.supportsEntitlement` | `StoreCapability` (19, closed union + `Record<…, true>` totality trick), `resolveStoreCapabilities`, `tiers.ts` basic/advanced | same + `tiers.ts` |
| `ident.supportsSoftRestriction` | ✅ **`BannedAction = KnownBannedAction \| (string & {})` + `UserSoftBan {action, target, expiresAt, bannedBy}`** — the open-slug parameterised deny row the research recommends, already shipped | `permissions/constants.ts:454-495` |
| `record.supportsStateMachine` | `ORDER_STATUS_TRANSITIONS` + `isLegalOrderTransition` + `ORDER_TERMINAL_STATUSES` | `features/orders/constants/transitions.ts:56` |
| `record.acceptsExpiry` | `LANE_CHECKOUT_WINDOW_MS`, `PAYMENT_WINDOW_MINUTES`, `resolveDueAt`, reservation `expiresAt` | `checkout/lanes.ts` |
| `record.supportsImmutableSnapshot` | add-on **snapshot** on the order (commit `37cd87789`), `lockedPrice`, policy-version hash | `fees/addon-registry.ts`, `policy-consent.ts` |
| `record.acceptsNumberingSeries` | `allocateSeriesNumber`, `features/invoicing/` | `features/invoicing/` |
| `rule.degradeConservative` | ✅ **`UNKNOWN_METHOD_CAPABILITIES` — the single best instance in the tree**, every field justified by what it costs when wrong | `payments/method-capabilities.ts` |
| `promo.requiresEligibilityRule` → **rule SET model** | `PaymentRuleSet` / `ShippingRuleSet` / `TaxRuleSet` / `OfferRuleSet` / `CoinRuleSet` / `EntryRankingRuleSet` with `publicWording` | `rule-sets-seed-data.ts`, `features/events/config/entry-ranking-rules.ts` |
| three-state flag | ✅ **`FlagValue = boolean \| "unlisted"`** + the admin control for the third state | `listing-types/feature-flags.ts` |

### Content / widget
| Researched | Existing | File |
|---|---|---|
| `block.widgetType` / `block.instance` | `WidgetDef` / `WidgetInstance` — minted stable ids, `aliases[]` for legacy derived keys | `ui/widgets/types.ts` |
| `view.region` / `block.allowedChildren` / `block.cardinality` | `WidgetRegionDef.allowedTypes`, `WidgetDef.childTypes`, `MAX_DEPTH` | `ui/widgets/types.ts`, `resolve.ts` |
| `block.lock` / `tpl.requiredElement` | `WidgetDef.removable: false` — refused **and reported**, never silently honoured | `ui/widgets/types.ts`, `resolve.ts:205` |
| `tpl.override` + field-wise merge | ✅ **`mergeStoredWithDefaults` / `applyOverride`** — sparse, field-wise, `"state" in override` three-valued, `type` never overridable | `ui/widgets/merge.ts` |
| `tpl.overrideKey` | `WidgetInstance.templateSlot` + `templateId` + `templateVersion` | `ui/widgets/types.ts` |
| `rule.degradeUnknown` (Drupal `Broken`) | `reason: "unknown-type"` + a `problems[]` entry; instance retained | `ui/widgets/resolve.ts:191` |
| `content.denormalisedCounter` | `event.stats` + recompute, `surfaceCounts` | `features/events/` |
| `cond.capabilityFlag` / `cond.permission` | `WidgetDef.requiredPermission`, `governedBy: WidgetContentTag[]`, injected `isContentVisible` | `ui/widgets/types.ts` |
| `field.*` meta | `resolveFieldUiMeta`, `fieldVisibility/{surfaceId}`, `registerFormFields`/`resolveFormFields`, `partitionRequiredRules` + `unreachableFields` | `ui/components/field-ui-meta.ts`, `contracts/form.ts`, `ui/widgets/resolve.ts:499` |
| `field.openSlug` | `BannedAction`, `PaymentMethodSlug` + `isValidPaymentMethodSlug` (regex, not enum), event `type`, `FormFieldType` cast-not-validated | 4 instances, no shared primitive |
| `seo.*` | `resolveOgImageUrl`, `robots` per route, sitemap guard that **throws** on empty | `features/…/opengraph-image`, sitemap |
| `seo.sectionOwnership` | ✅ `ownsSections: true` | site-settings |

---

## TABLE 2 — HALF (exists, but unwired / mis-scoped / partial)

| # | Primitive | What exists | What is precisely missing |
|---|---|---|---|
| H1 | **The whole mechanism catalogue** | `mechanismsSeedData` (24 rows, `requires[]`, `moneyPath`, `effect` prose), `listingTypesSeedData` (9 types × 24 flags, totality-guarded), `orderTransitionsSeedData` (`TransitionRule` with `actor`, `permission`, `requiresMechanism[]`, `blockedByMechanism[]`, `timeoutHours`, `escalatesTo`, `gates[]`, `ledger`), `refundGatesSeedData` | **ZERO runtime readers and not in `seed/manifest.ts`** — so never written to Firestore either. It is a design document in TS. Its own header says *"the migration is: capabilities.ts becomes a reader of this seed"* — that migration is the single largest unbuilt piece. The event side already did it (`event-mechanisms.ts` reads `config/event-types.ts` at runtime); the listing side did not. |
| H2 | `fulfil.acceptsFulfilmentTrigger` | `hasInstantFulfillment` + `supportsDeferredFulfilment` | **Two booleans for a 3-state config** — 4 combinations, 3 meanings, one nonsense state (`false/false` = neither instant nor deferrable). Shopify ships one enum. Collapse to `fulfil.acceptsFulfilmentTrigger: "asap" \| "on-release" \| "exact-time"`. |
| H3 | `sell.isPhysical` vs `fulfil.supportsShipping` | `supportsShipping` | **One flag, two meanings.** `classified` sets it `false` with a comment saying shipping is *"a negotiable flag, not a flow"* — i.e. the thing IS physical and the mechanism is absent. Split, or wholesale/pickup will need code. |
| H4 | `promo.supportsLoyaltyRedemption` as **tender** | `acceptsPointsTender` in registries 1 **and** 5, `resolvePointsTender` exists | `true` on **clearance only**, `false` on 8 types. The mechanism row says it makes coins *a payment METHOD that may settle the whole line*; `maxRedemptionShare: 0.2` caps it at 20%. Those two cannot both be in force — the capped-discount path is what runs. The uncapped tender path is unreachable. |
| H5 | `price.isTierMarginal` | `resolveBulkDiscountPercent` picks the **best applicable percent** (volume mode, all units at the band) | **Mode is hardcoded.** The platform fee beside it is **marginal** (`shipping-and-fees-seed-data.ts`, −10%/3 units). Two tier engines, two modes, neither declares which. Add `isTierMarginal` as config on both. |
| H6 | `record.supportsStateMachine` guards | `ORDER_STATUS_TRANSITIONS` = `Record<OrderStatus, readonly OrderStatus[]>` | **States only.** No actor, no permission, no mechanism gate, no `reasonRequired`, no `timeoutHours`/`escalatesTo`, no `gates[]`, no `ledger` — all of which `orderTransitionsSeedData` declares and nothing reads. Two state machines, one rich and dead, one live and bare. |
| H7 | `pub.*` publishing lifecycle | `resolvePublishedValues` / `resolvePublishedCopy` (token model, genuinely good), `ProductStatus`, `status-history` | No `draft/published/changed/archived` quartet, no revision store, no `isDefaultRevision` separate from `isPublished`, no diff, no scheduled publish, no `pub.release` (atomic multi-doc). |
| H8 | `block.binding` (data-driven attribute) | `RelatedScrollerConfig.source` is a **closed** `RELATED_SOURCES` vocabulary with `asRelatedScrollerConfig` narrowing | Hard-coded to 4 sources for 1 widget type. No generic `{source, args}` binding (`core/post-meta`-style), so every new data-driven widget needs code. |
| H9 | Widget registry breadth | 11 defs, 2 regions | Mocks specify **43**. `pilot-registry.ts`'s own header calls it a pilot. 2 regions against **379 `pageId`s** in the tree. |
| H10 | `view.formMode` | `form.listing` template keys in `listingTypesSeedData.templates`, `FormShell`, `resolveFormFields` | Template keys point at nothing — no form-mode registry exists. Drupal shipped view modes years before form modes and the ecosystem never caught up; here they can still ship together. |
| H11 | `field.*` type registry | `FormFieldProps.type` = **11 members**; `FormFieldType` (events) = **12**; `form-field-registry.ts` registers exactly **2** runtime renderers (`image`, `media`) | Two divergent field-type unions, neither a registry. `"file"` is in the picker and **uploads nothing** (stores `files[0].name`) — documented at `entry-form.ts`. No `money`, `measure`, `dateRange`, `openSlug`, `keyedMap`, `reference`, `geoPoint`, `color`, `rating` as *field types*. |
| H12 | `field.validate.*` compiler | `SurveyFormField.validation {minLength,maxLength,min,max,pattern}` + `checkEntryFormField` shared client+server | 5 rules only; no `in`/`unique`/`uniqueScope`/`size`/`linkContentType`. Everything else is hand-authored zod — the shape that let a hardcoded `.max(4)` beat the per-event check. |
| H13 | `stock.supportsReserved` vs `Allocated` | `reserved = stockQuantity − availableQuantity` (derived, **not stored**) + `stockReservations` rows | **Two numbers where the research says three.** `allocated` (committed order) and `reserved` (uncommitted hold) are the same anonymous gap. Saleor's open bug #19925 is exactly this conflation, and retrofitting is a data migration. `cart` and `order` are deliberately not holder kinds — so an order's hold and a reservation row are two mechanisms over the same units. |
| H14 | `money.supportsEscrowHold` | 29 files mention escrow; `resolvePayoutHoldDays` | Hold DAYS exist; staged release against a delivery event does not. |
| H15 | `comply.supportsTaxExemption` | `TaxableItem.taxCode` | No reason code, no certificate, no jurisdiction-of-validity, no `requiresTaxRegistration`/nexus, no `supportsReverseCharge`. `TaxRuleSet.onNoMatch: "block"` is the right degrade and is a literal, not a choice. |
| H16 | `tpl.*` clone/merge | `mergeStoredWithDefaults` (field-wise, correct), `templateId`/`templateVersion`/`templateSlot`, `removable: false` | **No `forkPoint` snapshot, no `fieldOwnership`, no `conflictPolicy`, no `mergeReport`, no `tombstone`, no `promoteOverride`, no propagation matrix.** A two-way merge cannot tell "the user changed it" from "upstream changed it" — Kubernetes shipped that mistake and had to add `last-applied-configuration`. `WidgetInstanceOrigin: "default"\|"overridden"\|"added"` is the right start and stops one field short. |
| H17 | `cond.group` (AND/OR/NOT) | `governedBy` AND-ed with `contentTags`; `isContentVisible` injected | **AND-only**, exactly Drupal's 15-year-old defect (#923934). No `any`/`none`, no nesting, no `summary()` so an admin cannot be told *why* something is hidden. |
| H18 | `promo.acceptsCombinationWith` | `coupon-stacking.ts` | Unverified whether it is an allowlist of discount **classes** (Shopify's `combinesWith`, where both sides must permit the other) or a boolean. If boolean, it cannot be upgraded without re-authoring every promotion row. |
| H19 | `list.indexRequirement` | `firestore-indexes.ts`, `deploy-indexes.mjs`, Sieve maps | No per-field `isSortable`/`isFacetable`/`requiresIndex` declaration, so a config-selectable sort axis can require an index that does not exist → `FAILED_PRECONDITION` → caught → `200 {items:[]}`. **This is the one place the no-deploy promise genuinely breaks, and it has already caused the invisible-entries outage.** |
| H20 | `money` add-on model | ✅ `addon-registry.ts` + `addon-availability.ts` + order-side snapshot + `resolveAddonOffers`/`resolveAddonSelection`, `AddonScope: buyer\|seller\|both`, two pricing kinds, refundability | **Four add-ons today**, and `CartStoreAddons`/order schema/`commissions.*FeeEnabled` pairs still name them individually in the places the header lists. The registry delegates the four fee functions (`81fa1d0b2`) but the schema side is not generic yet. |
| H21 | `protection` as config | `protection-config.ts`, `resolveProtectionConfig`, caps + windows | Commit `9aa78897b` says in its own subject: **"GROUNDWORK, NOT YET WIRED."** |
| H22 | `block.variation` / `tpl.pattern` | — | Absent from the stated chain `mechanism\|rule\|config → WIDGET → FEATURE → ENTITY TYPE → ENTITY`. There is no level for "same widget, different named preset" (Gutenberg variation / Prismic slice variation with its own field set) or "a saved arrangement of several widgets" (pattern). Without them every preset becomes a new type — which is how nine PDP views happened. |

---

## TABLE 3 — MISSING

### (a) Needed for the CURRENT verticals (retail + wholesale, today)

| Primitive | Why now | Note |
|---|---|---|
| `sell.requiresMinimumQuantity` · `sell.requiresQuantityIncrement` · `sell.acceptsMaximumQuantity` | mechanism `wholesaleTiers` says *"Quantity breaks and a MOQ apply. (Phase 4 — off everywhere today.)"* — MOQ/increment have **no field, no resolver, no UI**. `QuantityStepper.tsx` exists and takes no min/max/increment. | wholesale is a stated TODAY vertical |
| `price.supportsPriceList` · `price.supportsCustomerGroupPrice` · `price.supportsContractPrice` · `price.supportsChannelPrice` | `priceList`, `customerGroup`, `contractPrice` = **0 hits**. Wholesale without a negotiated account rate is not wholesale. | commercetools Standalone Prices is the model |
| `price.isTierMarginal` as config | two tier engines, two hardcoded modes (H5) | |
| `trade.supportsBuyerOrganisation` · `OrganisationHierarchy` · `requiresPurchaseApproval` · `acceptsSpendLimit` · `supportsNetTerms` · `supportsCreditLimit` · `acceptsPurchaseOrderReference` | `netTerms`, `purchaseOrder`, `requisition`, `quoteRequest` = **0 hits**; `creditLimit` = 1 | the entire B2B namespace is absent |
| `trade.supportsQuoteLifecycle` | offers exist (buyer→seller price proposal) but not a **binding, re-orderable, expiring quote** | wholesale's normal path |
| `price.acceptsCostBasis` | no margin floor is expressible | |
| `money.requiresIdempotencyKey` **on the notification/trigger loop** | `idempotencyKey` exists (42 files) but the `onOrderStatusChange` write-back → trigger → send → write loop still has no guard, and `providerMessageIds` still has no reader | already a recorded live hazard |
| `list.indexRequirement` | H19 — the no-deploy promise | |
| `cond.group` AND/OR/NOT + `summary()` | H17 | |
| **a PREDICATE registry at all** | There is no `cond.*`/predicate layer anywhere. Rule sets are **parameter bundles**, not predicates. Every condition is a hand-written `if`. The 3-valued `TRUE/FALSE/UNKNOWN` with CEL's error-absorbing `∧`/`∨` has no implementation. | This is the biggest single structural gap after H1 |
| `history.*` (purchase/behaviour) | the owner's own named example (*"disable payment methods based on history of flagged issues"*) is already in `BannedAction`'s comment as an intent, with **no predicate to evaluate it** | needs a denormalised per-user window rollup or it is the reason checkout is slow |
| `actor.isOwnerOf` / `actor.hasRelation` | **There is no ownership permission.** 132 `admin:*` strings and not one expresses "the entry owner may edit their own entry". Owner requirement #1 (inline edit/delete for owner AND admin on every card across 5 hosts) is a ReBAC requirement with no mechanism. | blocks a named owner requirement |
| `flow.transitionPermission` wired | H6 — declared in the dead seed | |
| `tender.supportsSplitTender` | `splitTender` = 0 hits. Coins + card is already two instruments on one order. | |
| `tender.supportsStoreCredit` | `storeCredit` = 0 hits. 🛑 Research warns it must be **tender, not a discount line** — a discount reduces the taxable base and silently changes GST owed. | money-path correctness |
| `fulfil.supportsPickup` / `acceptsReturnReason` / `acceptsReturnWindow` as config / `requiresRestockDecision` | `restockingFee` = 0; return states exist, reasons/window/restock decision do not | |
| `comply.supportsTaxExemption` as (reason, jurisdiction, certificate) | H15. Avalara's whole product exists because a boolean is wrong. | |

### (b) Needed for the stated MULTI-VERTICAL goal (the hospital test)

| Primitive | Why |
|---|---|
| **`book.*` entire** — `supportsSchedule`, `supportsSlot` (with FHIR's 5 statuses), `supportsAppointment`, `acceptsSlotIncrement`, `acceptsBufferBefore/After`, `acceptsBlackoutWindow`, `acceptsLeadTime`/`BookingHorizon`, `acceptsResourceCapacity`, `supportsRecurringBooking`, `acceptsRescheduleWindow`, `acceptsCancellationFeeSchedule`, `supportsCheckIn`, `acceptsNoShowPolicy`, `acceptsSecurityDeposit`, `requiresEligibility` | `appointment` = 2 hits, `rental` = 1, `booking`'s 49 hits are overwhelmingly *bookkeeping*. **This is the single largest absent namespace and it is the vertical-neutral core.** The research's key structural claim: `resolveAvailability` written to cover a count AND a slot set makes the hospital case need **zero** new mechanisms. |
| `stock.supportsLotTracking` · `supportsSerialTracking` · `requiresExpiryDate` | `lot` has 704 hits and **every one is a clearance/reveal lot, not an inventory lot**. `serialNumber` = 0, `expiryDate` = 1. Drug/implant recall is hospital-critical, and a collectibles vertical wants serials too. ⚠ NetSuite's caveat: assigning a lot/serial is **not** an inventory commitment — two primitives. |
| `stock.supportsAvailableToPromise` · `acceptsSafetyStock` · `supportsAllocationStrategy` · `supportsMultiLocation` | `availableToPromise`/`safetyStock` = 0. Multi-location placement rows exist (`inventory-placements`) with no allocation strategy over them. |
| `comply.requiresLicenceHeld` · `requiresExternalAuthorisation` | One primitive serves prescription, export licence, parental consent, prior auth, liquor licence, firearms dealer. Nothing today. |
| `comply.requiresCoolingOffPeriod` | 0 hits; EU distance selling |
| `price.supportsContractPrice` = payer contract rate | also in (a) |
| `trade.requiresPurchaseApproval` + `flow.task` + `flow.slaTimer` | commercetools Approval Rules; a hospital requisition is the same object. `flow.autoDecision` exists (`entryApproval: auto`); the human-approval half does not. |
| `field.measure` / `resolveMeasure` (UOM + case qty + conversion) | dosage; also wholesale case packs **today** |
| `i18n.*` beyond message namespaces — `fallbackLocale`, `localeOptional`, per-bundle `strategy`, `translationGroup` | |
| `content.bundle` / `content.entityKind` split | **The whole "ENTITY TYPE as a config row" level does not exist.** Listing types and event types are two hand-built instances of the pattern; there is no generic `bundle` primitive they are instances OF. Drupal's entity-type/bundle split and Shopify's metaobject definitions are the models. A hospital's `patient`/`admission`/`ward` must be bundles, not code. |
| `rel.*` — `polymorphic`, `targetAllowlist`, `backref`, `crossServiceReference` | `crossServiceReference` matters immediately: the microservice rule means every cross-host reference must resolve over HTTP, cache, and **degrade to a stub**. Today each proxy route hand-rolls that. |
| `pub.release` (atomic multi-doc publish) · `pub.revision` · `pub.isDefaultRevision` | H7 |
| `record.supportsAmendment` (order edit with a diff) | |

### (c) Probably never

`sell.supportsTryBeforeYouBuy` · `sell.supportsLayaway` (derivable: `acceptsCheckoutCharge` + `acceptsFulfilmentTrigger: on-full-payment` — do **not** build it as a mechanism) · `fulfil.supportsPickupPoint` (third-party lockers) · `fulfil.supportsDropship` · `fulfil.acceptsPackagingConstraint`/hazmat · `comply.acceptsExportDocumentation` · `money.acceptsSettlementDelay` as a tunable (Adyen-specific) · `promo.acceptsStackDepthLimit` · `bucket.*` (A/B experiment bucketing) · `stock.acceptsOverbookingAllowance` · `sell.supportsVariantAxes` as a *new* primitive (grouped/composite already covers the real need).

---

## THE UI DIFF

**Inventory**: 159 `.tsx` under `src/ui/` — ~140 in `components/`, plus `chrome/` (2), `forms/` (13), `widgets/` (5 `.ts`), `columns/`, `consent/`, `icons/`, `rich-text/`.

### Present and genuinely vertical-neutral
Layout: `Div` `Layout` `Card` `Divider` `HorizontalRule` `Semantic` `Responsive` `ResponsiveView` `HorizontalScroller` `OverflowRow` `SplitTile` `StatsGrid` `FormGrid` `Fieldset` `CollapsibleSection` `Accordion` `Details` `Tabs` `MediaTabs` `StickyToolbar` `TabBarShell` `StackedViewShell` `DetailViewShell`.
Nav: `Breadcrumb` `Menu` `Dropdown` `Pagination` `TablePagination` `StepperNav` `NavbarChevron` `TextLink` `Anchor` `SignInLink` `SkipToMain` `ViewToggle` `SortDropdown`.
Data: `Typography` `Badge` `StatusBadge` `RoleBadge` `Avatar` `AvatarDisplay` `MediaAvatar` `DataTable` (+`columns/`) `SpecTable` `SummaryCard` `ItemRow` `Progress` `ProgressBarFill` `StarRating` `RatingDisplay` `CountdownDisplay` `Skeleton` `EmptyState` `Chart`+`chart-spec` `FlowDiagram` `Kbd` `Quote` `PendingValue`.
Entry: `Input` `Textarea` `Select` `PaginatedSelect` `Checkbox` `Radio` `Toggle` `Slider` `DateInput` `OtpInput` `TagInput` `FilePickerButton` `RichTextEditor` `DescriptionField` `Repeater` `Form` `FormField` `FormActionBar` + `forms/Field*`.
Feedback/overlay: `Alert` `Toast`+`toast-context` `Spinner` `PageLoader` `NavigationLoader` `Modal` `SideModal` `Dialog`+`dialog-shell` `Drawer` `SideDrawer` `FilterDrawer` `Tooltip` `Scrim` `ConfirmDeleteModal` `UnsavedChangesModal` `LoginRequiredModal` `QuickCreateModal` `RecordDetailModal` `FallbackShell` `overlay-context` `TopBannerPortal`.
Media: `MediaImage` `MediaVideo` `MediaLightbox` `ImageGallery` `ImageLightbox` `ImageMosaic` `DetailPageGallery` `HotspotMarker` `Iframe` `Icon` `IconBox` `SiteLogo` `SiteMark` `BackgroundRenderer` `DynamicBgDiv`.
Infra: `Motion` `HandModeRow` `toolbar-collapse` `row-collapse` `tabs-overflow` `surface-tokens` `design-pack` `consent/`.

### 🛑 Commerce-contaminated — would NOT serve another vertical as named
| Component | Problem |
|---|---|
| `BaseListingCard.tsx` | "listing" is a commerce word; a hospital has records/encounters. Should be `EntityCard` with a `shape`. |
| `ListingLayout` · `ListingToolbar` · `ListingFilterDrawer` · `ListingDetailShell` · `SlottedListingView` | 5 components named for one domain. The research's `view.entityShape` rule — *one composed view per SHAPE, never per TYPE* (A19r) — says these are `CollectionLayout` / `CollectionToolbar` / `DetailShell`. |
| `GatedPrice` · `PriceDisplay` | **Price-as-widget is right; price-as-`number` is not.** Both render an amount, not a `PriceBreakdown`. Tax mode, fee lines, coins-as-liability, and `estimated: true` have nowhere to live. |
| `QuantityStepper` | exists, **takes no min/max/increment** → MOQ and case packs are unexpressible |
| `ClaimCouponButton` | a promo verb as a component |
| `VacationBanner` | seller-specific |
| `PosterCard` | event-specific |
| `AdminFilterFacets` · `ActiveFilterChips` · `FilterChipGroup` | fine, but three filter-chip components for one idea |

### Missing UI the resolvers imply (0 hits each)
**(a) today**: `QuantityStepper` with rules (above) · `MoneyInput` · `TierTable` (and it must render marginal vs volume **differently**) · `TenderSelector` (ordered, with reasons for absence — `MethodDecision` already returns the reason and nothing renders it) · `SplitTenderAllocator` · `DeliveryOptionList` + pickup picker · `FulfilmentTimeline` (N parcels × N statuses — the data exists) · `StockBadge` (3 states: available / held-elsewhere / unavailable) · `ReturnWizard` · `ExchangeSelector` · `QuoteThread` · `ApprovalQueue` · `PONumberField` · `CreditTermsNotice` · `QuickOrderPad` / CSV bulk-add / `RequisitionList` / `ReorderFromHistory` · `ExemptionCertificateForm` · `LedgerStatement` · `Combobox`/`Autocomplete` · `Popover` · `ErrorBoundary` · `VisuallyHidden` · `Timeline`.
**(b) multi-vertical**: `SlotGrid` · `DateRangePicker` · `TimePicker` · `Calendar` · `LotSerialEntry` · `MeasureInput` · `AgeGateModal` · `JurisdictionBlocker` (**must say why**) · `TreeView` · `Transfer` · `SignaturePad` · `BarcodeScannerInput` · `Captcha`.

🛑 **`DepositDisclosure` and a selling-plan/purchase-option selector are the highest-leverage missing widgets.** Shopify's purchase-option selector is the one control where subscription, pre-order, TBYB and deposit all surface — it is the single widget that most reduces per-type screens, and this tree has none.

⚠ **Block supports do not exist as a layer.** Nothing in `WidgetInstance` carries `align`, `spacing`, `typography`, `visibleIf`, `renderMode`, `headingLevel`, `loadingState`, `repeatOver`, `valueMap`, `responsiveStyles`. There is `span: "full"|"pair"|"third"|"quarter"` and `state`, and that is all. Gutenberg's `supports` accreted over six years with inconsistent storage; this is the one chance to declare the set up front. 🛑 And the repo's own lesson applies at full force: **a conditional spread into JSX is not excess-property-checked, so `tsc` cannot verify a support is wired** — every support needs a render-level assertion.

---

## THE RESOLVER DIFF

### Exists — with the unknown-value verdict

| Resolver | File | Unknown → | Verdict |
|---|---|---|---|
| `resolvePaymentMethod` | `payments/method-resolution.ts:81` | ceiling first, `??` chain, 3 named reasons | ✅ **correct, and the model for the rest.** Verified red-able by `verify-payment-method-precedence.mts` (16 cases, `??`→`\|\|` sabotage reports 2/16) |
| `capabilitiesFor` (payment) | `payments/method-capabilities.ts` | `UNKNOWN_METHOD_CAPABILITIES` — conservative on all three axes, each justified at the line | ✅ **best degrade in the tree** |
| `eventTypeHasMechanism` | `features/events/schemas/event-mechanisms.ts` | `false` for unknown type AND unknown mechanism | ✅ correct (fails closed) |
| `resolveEntryFormFields` | `features/events/schemas/entry-form.ts` | unknown field `type` survives the read, renders as text, reported by `isUnsupportedFieldType`; invalid stored regex is **skipped not failed** | ✅ correct, textbook |
| `resolveWidgetTree` | `ui/widgets/resolve.ts:125` | 11 named `WidgetBlockReason`s; `unknown-type` keeps the instance, renders nothing, pushes a `problem`; cycle + `MAX_DEPTH` guarded | ✅ correct (Drupal `Broken` equivalent) |
| `mergeStoredWithDefaults` | `ui/widgets/merge.ts` | field-wise, `"state" in override`, `type` never overridable, `findRefCollisions` | ✅ correct for a 2-way merge — **and that is the ceiling**; see H16 |
| `serviceOriginFor` | `http/service-origins.ts` | `undefined` = "this origin"; blank env value **dropped**; longest-prefix + boundary char | ✅ correct |
| `resolveSectionHref` | `next/routing/section-routes.ts` | unregistered → unchanged; `""` is **meaningful** (I own it) unlike service-origins where blank means unset | ✅ correct, and the asymmetry is documented. 🛑 Still: registering `"/"` is a catch-all — refuse it in `configureSectionRoutes`. |
| `resolveBulkDiscountPercent` | `checkout/order-math.ts:98` | malformed rows **skipped** (not clamped), `>=100` excluded, returns 0 | ✅ correct and reasoned |
| `unitPriceFor` / `lineTotalFor` | `checkout/order-math.ts` | 5 ordered cases; null `product` tolerated for a locked line | ✅ correct, but returns a **number not a breakdown** (see UI diff) |
| `resolveCheckoutPolicyClauses` | `checkout/policy-consent.ts` | `DEFAULT_CHECKOUT_POLICY_CLAUSES` **fail-closed** — an unconfigured install still gates checkout | ✅ correct |
| `getListingRule` | `checkout/rules/_registry.ts:57` | `?? CHECKOUT_RULES.standard` → `purchaseable: true`, `cartEligible: true`, `requiresShippingAddress: true`, `refundPolicy: full+partial` | 🛑 **WRONG DIRECTION on a money path.** An unknown type becomes fully purchaseable with full refunds. Research rule: money-path/semantic unknowns **refuse**. |
| `pluginFor` | `listing-types/_registry.ts:275` | `console.warn` + fall back to `standard` | ⚠ acceptable for presentation (sort options, labels), but it also supplies `isAvailable` and `cartLine` |
| **`capabilityFor`** | `listing-types/capabilities.ts:243` | `return LISTING_TYPE_CAPABILITIES[type]` — **no fallback.** An unknown stored slug returns `undefined`, and `cartRequiresShipping` does `getCap(it).supportsShipping` → **TypeError** | 🛑 **THROWS. This is the degrade rule broken in the registry the whole architecture is named after.** `cart-shipping.ts` guards `?? "standard"` for *undefined*, not for an unknown string. And `assertNever` beside it throws by design. |
| `resolveShippingCost` / `roundShippingUp` | `shipping/quote.ts` | negative clamped to 0; ₹0 stays ₹0; `blockOnMissingInput: true` on every rule set | ✅ correct |
| `resolvePublishedValues` / `resolvePublishedCopy` | `content/published-values.ts` | unknown token left **visibly unresolved** (`{{wrongKey}}`) rather than blanked — *"a blanked token reads as a sentence with a word missing, which nobody reports"* | ✅ correct, and the reasoning is the best in the file |
| `isLegalOrderTransition` | `features/orders/constants/transitions.ts:94` | unlisted transition refused + `describeIllegalTransition` | ✅ correct — but bare (H6) |
| `resolveEntryApproval` / `resolveEntryLimit` / `resolveEntryMediaLimits` / `resolveEntryRanking` | `features/events/` | per-event config with ranking `publicWording` travelling on the row | ✅ |
| `resolveFormFields` (`registerFormFields`) | `contracts/form.ts:106` | extension registry per `formKey` | ✅ |
| `resolveAddonOffers` / `resolveAddonSelection` / `addon-availability` | `fees/` | registry-driven, snapshot on the order | ✅ |
| `partitionRequiredRules` + `unreachableFields` | `ui/widgets/resolve.ts:499` | blocked widget ⇒ its `ownsFields` not required; `removable: false` refuses and reports | ✅ — this is the researched `field.requiredUnlessDefault` rule with a real mechanism |

🛑 **Three registries keyed on the same value, three different unknown behaviours**: `capabilityFor` **throws**, `getListingRule` **permits**, `eventTypeHasMechanism` **denies**. One of those is right.

### Missing resolvers (ranked)

**(a) today** — `resolveEligibility`/`resolveAccess` as a real trinary (`allowed|forbidden|neutral` with `orIf`/`andIf`, AWS-IAM ordering, explicit-deny-first — today `hasPermission` is a set membership test and ownership has no expression at all) · **`resolveCondition` / a predicate registry with 3-valued logic — does not exist in any form** · `resolvePrice` as a staged waterfall returning `PriceBreakdown` (stages 2,3-as-config,5-ordering,7,9 are scattered across `order-math`, `fees/calculator`, `coupon-discount`, `promotions/`) · `resolveAvailability` returning states (`sellable`/`atp`/`ats`) rather than a number · `resolveTenderOptions` as a *rendered* list (the decisions exist, nothing renders the reason) · `resolveMoneyPlan` (deposit + balance trigger as one object) · `resolveValidation` producing **one plan consumed by client AND server** · `resolveQuery` + index-requirement derivation · `resolveFee` scoped per-ORDER with composite=1 unit · `resolveRefundEligibility` with a gate reason string · `resolveTransition` honouring actor/permission/mechanism/gates · `resolveTemplate` specificity chain (`instance → type+viewMode → type → app → platform`) · `resolveFields` unified (three partial implementations today: `resolveFieldUiMeta`, `fieldVisibility`, `partitionRequiredRules`) · `resolveNumbering` with a re-trigger guard · `resolveQuota`/rate-limit (⚠ the recorded `enforceCheckoutValueOtpRateLimit` **writes `lastSentAt` on a read** — never write a cooldown on a read) · `resolveLineTransform` (bundle/group expansion is inlined in 3 price branches).

**(b) multi-vertical** — `resolveSchema`/bundle · `resolveTenant` as one function (`portalForPath`, `resolveCanonicalSite`, `resolveSiteConfig` are three) · `resolveLocale` (RFC 4647 Lookup truncation) · `resolveToken` (W3C DTCG `$value`/`$type`/alias/composite — `design-pack.ts` + `surface-tokens.ts` are a start; no alias resolution, no circular-reference detection) · `resolveCurrency` · `resolveFormat` (CLDR) · `resolveMeasure`/UOM · `resolveEntitlement`/subscription · `resolveJurisdiction` · `resolveApproval` (human half) · `resolveCache` (`variesBy` + `tags`) · `resolveAudience`/segment.

### 🛑 What no resolver here has, and all of them need
**A uniform `Resolution<T>` envelope** — `{value, reason, source: {level, id}, errorCode, degraded, variesBy, tags, trace}` — plus an `explainX()` twin and one admin screen that renders the trace.

Two resolvers already prove the need and solve it only locally: `MethodDecision` carries a reason (`platform_disabled` / `buyer_denied` / `not_enabled`) and **nothing renders it**; `WidgetBlockReason` carries 11 reasons and `editMode` retains blocked widgets so an editor *can* show why. Generalise that shape, don't re-derive it 15 times. OpenFeature's `reason` + `errorCode` enums are the ready-made vocabulary, and `fees/explain.ts` is proof this team already writes the hardest part (the human sentence) well.

---

## NAMING — recommendations where research and code disagree

| Keep | Drop | Why |
|---|---|---|
| **`supportsAddToCart`** | `canAddToCart` · `cartEligible` · `cartLine:"blocked"` | `can*` violates the in-force prefix rule; 4→1 |
| **`supportsOfferNegotiation`** / **`supportsAuctionBid`** | `canMakeOffer` / `canBid` | same |
| **`isPhysical`** + **`supportsShipping`** | the single overloaded `supportsShipping` | two facts (H3) |
| **`acceptsFulfilmentTrigger`** (enum) | `hasInstantFulfillment` + `supportsDeferredFulfilment` | 2 bools → 1 enum (H2); also kills the last `has*` |
| **`acceptsPointsTender`** | `coinsRedeem` as a separate mechanism | already the one aligned name — do not add `coinsAsPayment`, the seed file explicitly refused that |
| **`requiresVendorVerified`** | `verifiedSellerOnly` (mechanism) | keep the capability spelling; `verified_seller` stays as the **StoreCapability** (different subject: the store, not the listing) |
| **`"collector-drop"`** | `"collector"` (seed) | the live `ListingType` union wins; the seed is the one with no readers |
| **`capability` three-valued** | boolean | `excluded \| optional \| required` — `requires*` in the naming rule already implies it, and FHIR profiling is the model |
| **`<subject>.<question>`** for predicates (`cart.subtotalAtLeast`, `history.purchaseCountInWindow`, `actor.isOwnerOf`) | forcing `supports/requires/accepts/is` onto predicates | the four prefixes describe a **thing**; a predicate asks about a **context**. Capability-shaped predicates keep their prefix inside the namespace (`listing.supportsShipping`), so the two conventions compose |
| **`bundle`** for the config-row entity type | "entity type" used for both the storage kind and the row | Drupal's split; your "ENTITY TYPE" is a bundle, and the mapping is off by one level |

---

## THE FOUR THINGS MOST LIKELY TO SINK THE DESIGN

1. 🛑 **The mechanism catalogue has zero readers and is not even seeded** (H1). Five type-keyed registries, four of them live and hand-written, one of them the intended replacement and dead. The event side already did this migration correctly — copy it.
2. 🛑 **`capabilityFor` throws on an unknown type** and `getListingRule` permits one. Fix both before anything is built on top, and keep `UNKNOWN_METHOD_CAPABILITIES` as the template.
3. 🛑 **There is no predicate/condition primitive at all.** Rule sets are parameter bundles. Everything conditional is a hand-written `if`. Without a registry + 3-valued tree + per-row `onUnknown`, "a new rule is a row" is not expressible.
4. 🛑 **`tpl.forkPoint` + `tpl.fieldOwnership` are the missing merge primitives** (H16), and `list.indexRequirement` is the one place the no-deploy promise breaks (H19). Both are data-migration-class to retrofit; both are cheap to design in now.