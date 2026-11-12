# THE PRIMITIVE CATALOGUE

**Authoritative, deduplicated vocabulary. This replaces every ad-hoc flag name in the tree.**
Inputs: four research reports (Shopify · commercetools · Vendure · Saleor · Medusa · Spree · Stripe · Adyen · Avalara · eBay · FHIR · Odoo/NetSuite · Drupal · Gutenberg · AEM · Sanity · Contentful · Strapi · Payload · Directus · Prismic · Builder.io · Plasmic · Kubernetes SSA · Cedar · XACML · Keycloak · Zanzibar/SpiceDB · Oso · OPA · CEL · Unleash · LaunchDarkly · Flagsmith · OpenFeature · Grafana · Algolia · Novu · Polaris/Radix/MUI/Ant/Carbon/Primer/Mantine/Chakra/Atlassian) + a measured diff against `D:\proj\letitrip.in\appkit\src`.

---

## 0 · HOW TO READ THIS — the rules the catalogue is built on

### 0.1 The prefix IS the kind

| Prefix | Kind | Needs code? | Test |
|---|---|---|---|
| **`supports*`** | **mechanism** | **yes — this is the only reason to write code** | "if nobody implements this, nothing happens" |
| **`requires*`** | **rule** | the *evaluator* once, then never | "it answers yes/no and can block" |
| **`accepts*`** | **config** | **no** | "it only parameterises a mechanism or rule that already exists" |
| **`is*`** | **fact / mode** | no (a reader, sometimes) | "it describes what this thing *is*; often a 3-state enum, not a boolean" |

🛑 **`can*` and `has*` are banned.** Five live keys violate this (`canAddToCart`, `canBid`, `canMakeOffer`, `hasInstantFulfillment`, plus `showsStockQuantity`); the rename is all-or-nothing, grep-to-zero, one commit.

### 0.2 A mechanism never arrives alone — catalogue by CLUSTER

`supportsRental` is useless without `accepts BufferBefore`, `supportsTimeSlotCapacity`, `supportsEscrowHold`. **1 mechanism + N rules + M configs.** A catalogue of mechanisms alone looks complete and is unusable. Every mechanism row below names its cluster where it is non-obvious.

### 0.3 Capability is THREE-VALUED, never a boolean

`excluded | optional | required` — from FHIR profiling (a profile may set `max:0` to exclude, `1..1` to require, or `mustSupport` to mean "handle it if present"). `requires*` in the naming rule already implies you knew this. A boolean cannot distinguish *"the type permits COD"* from *"the type mandates COD"*, and a type allowlist needs both.
**Intersection, not cascade**: an instance can never grant a capability its type excludes.

### 0.4 Degrade direction, declared PER NAMESPACE — not globally

A single uniform degrade cannot be conservative for both polarities (`false` is safe for a grant, catastrophic for a deny).

| Namespace | Unknown value → | Rationale |
|---|---|---|
| `commerce` (price/offer/discount) | **refuse the operation**, mark `degraded` | never undercharge, never guess a price |
| `money` | **refuse** — never 0, never "no fee", never silently zero-rate tax | the most expensive possible degrade |
| `fulfilment` | **no option offered** (block checkout, "no rates for this address") | never fall through to free shipping |
| `inventory` | **unavailable** | refuse the sale, do not oversell |
| `trust` / `access` | **deny** | fail closed |
| `claim` | **not eligible** + a reason string | |
| `schedule` | **permissive on structure only**: no slot grid ⇒ still bookable (FHIR explicitly sanctions an Appointment with no Slot). Everything else denies. | the one sanctioned permissive degrade |
| `content` (structural) | fall back along the specificity chain; render an **admin-only labelled stub**; never blank the page | Drupal `Broken` plugin |
| `ui` (cosmetic) | **ignore the knob**, render the default | CSS dropping an invalid declaration |
| `data` | **no cache** (correct and slow); unknown filter **dropped and reported**, never silently widened | |

🛑 **FHIR's modifier rule is the dividing line**: an unknown *extension* may be ignored; an unknown ***modifier*** that changes the meaning of the element **must refuse**. Cosmetic → ignore. Structural → fall back. Semantic/money → refuse. Safety → deny.
🛑 **Never DROP an unknown value you cannot interpret — preserve it on write** (protobuf unknown-field preservation). A newer config edited by an older deploy must not lose fields.

### 0.5 Status legend

`have` = a live runtime reader exists · `half` = exists but unwired, mis-scoped, or two-booleans-for-three-states · `missing` = 0 implementation.
💰 = money path (conservative degrade mandatory, two-admin approval candidate).
🌐 = vertical-neutral · 🛒 = commerce-only.

### 0.6 The composition chain, corrected

The stated chain has no level for *"same widget, different named preset"* or *"a saved arrangement of several widgets"*. Gutenberg and Prismic both needed them; without them every preset becomes a new type — **which is exactly how nine PDP views happened.**

```
mechanism | rule | config  →  WIDGET  →  VARIATION  →  PATTERN / TEMPLATE
                                                            ↓
                                      FEATURE  →  BUNDLE (="entity type")  →  ENTITY
```

🛑 And the level naming is **off by one**. Drupal's split: *entity type* (storage, id space, repository — adding one is a release) vs *bundle* (a config row declaring a field set + allowlists). Drupal ships ~8 entity types and 15 years of verticals are bundles. **Your "ENTITY TYPE" is a BUNDLE.** Call it that, or two sessions will build two things. `content.supportsEntityKind` is the release-level primitive; `content.supportsBundle` is the row.

---

# 1 · THE CATALOGUE

## 1.1 `commerce.*` — how a party commits to acquire, and at what price

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `commerce.supportsAddToCart` | M | line accumulates, commit later | — | **have** | 🛒 |
| `commerce.supportsBuyNow` | M | bypass cart, single-line commit | — | half (seed only) | 🛒 |
| `commerce.supportsOfferNegotiation` | M | buyer proposes a price; cluster: `acceptsAutoAcceptThreshold`, `acceptsReservePrice`, `acceptsDecisionWindow`, `isAutoAwarded` | 💰 | **have** | 🛒 |
| `commerce.supportsAuctionBid` | M | ascending bid with proxy bidding | 💰 | half — flag exists, **no mechanism twin; the seed re-spelled bidding as offers** | 🛒 |
| `commerce.acceptsReservePrice` | C | hidden floor below which it does not sell | 💰 | have (39 refs) | 🛒 |
| `commerce.acceptsAutoAcceptThreshold` | C | ≥X auto-accepts, <Y auto-declines (eBay `BestOfferAutoAcceptPrice`) | 💰 | half | 🛒 |
| `commerce.isAwardMode` | C | `highest-at-close` \| `seller-discretion` (today's `autoAward`) | 💰 | have | 🛒 |
| `commerce.supportsQuoteRequest` | M | cart → RFQ → **binding, expiring, re-orderable-while-valid** quote (commercetools QuoteRequest→Quote) | 💰 | **missing** (0 hits) | 🌐 |
| `commerce.supportsDeferredPurchase` | M | **the parent abstraction** — payment and fulfilment deliberately decoupled (Shopify deferred purchase options) | 💰 | half | 🌐 |
| `commerce.supportsPreOrder` | M | sell before stock exists, fulfil on release | 💰 | **have** | 🛒 |
| `commerce.supportsBackorder` | M | sell past zero on-hand (Vendure: a **negative** out-of-stock threshold) | 💰 | missing | 🛒 |
| `commerce.supportsRecurringPurchase` | M | subscription = **billing policy + delivery policy + pricing policy, three separate objects** | 💰 | missing | 🌐 |
| `commerce.supportsInstalmentPlan` | M | scheduled part-payments against one commitment (the retired EMI, done properly) | 💰 | half (retired, ~160 refs) | 🌐 |
| `commerce.acceptsCheckoutCharge` | C | **deposit**: `fixed` amount or `percentage` taken at commit (Shopify `checkoutCharge`) · = a hospital co-pay | 💰 | half (`resolveCaptureSplit`) | 🌐 |
| `commerce.acceptsBalanceChargeTrigger` | C | when the remainder is taken: `exact-time` \| `time-after-checkout` \| `on-fulfilment` \| `none` | 💰 | missing | 🌐 |
| `commerce.supportsBundle` | M | one sellable composed of fixed components | 💰 | **have** | 🛒 |
| `commerce.supportsConfigurator` | M | buyer-composed line, components chosen at purchase (today's grouped purchase) | 💰 | **have** | 🛒 |
| `commerce.supportsVariantAxes` | M | one product, N SKUs along option axes | — | **excluded — see §6** | 🛒 |
| `commerce.supportsGiftCard` | M | sells a stored-value **instrument**, not goods | 💰 | missing | 🛒 |
| `commerce.supportsSurpriseReveal` | M | correctly shaped today; cluster: `requiresCancelLockedByReveal` | 💰 | **have** | 🛒 |
| `commerce.supportsWaitlist` | M | demand captured, no stock, no charge | — | half (10 mentions, wiring unverified) | 🌐 |
| `commerce.supportsRental` | M | sold for a window and **comes back**; cluster: the whole `schedule.*` namespace + `money.supportsEscrowHold` | 💰 | missing | 🌐 |
| `commerce.supportsReservation` | M | a slot is held; nothing moves | — | missing | 🌐 |
| `commerce.isPhysical` | C(fact) | has mass/dimensions → drives weight/dimension/gift-wrap **field visibility** (BigCommerce removes those exact 6 fields for `digital`) | — | **half — conflated into `supportsShipping`** | 🛒 |
| `commerce.requiresMinimumQuantity` | R+C | MOQ | — | **missing** (mechanism row says *"Phase 4 — off everywhere"*; no field, no resolver) | 🌐 |
| `commerce.acceptsQuantityIncrement` | C | case / pack multiples | — | **missing** — `QuantityStepper` has `min`/`max` but a **hardcoded ±1 step** | 🌐 |
| `commerce.acceptsMaximumQuantity` | C | per-order cap | — | half (`max` prop exists, no config source) | 🌐 |
| **PRICING** | | | | | |
| `commerce.supportsTierByQuantity` | M | volume bands | 💰 | **have** — `resolveBulkDiscountPercent`, best-tier-wins, malformed rows skipped. 🛑 **CLAUDE.md's "stored, zero readers" is STALE** | 🌐 |
| `commerce.isTierMarginal` | C | `graduated` (each unit at its own band) vs `volume` (all units at the reached band) — Stripe `tiers_mode` | 💰 | **half — mode is HARDCODED in both tier engines, and they disagree**: bulk discount is volume, the platform fee is marginal | 🌐 |
| `commerce.acceptsTierScope` | C | tier applies per line item, to the whole quantity, once the minimum is reached (commercetools) | 💰 | missing | 🌐 |
| `commerce.supportsPriceList` | M | a named, scoped, date-valid price set keyed by SKU × currency × country × group × channel (commercetools Standalone Prices) | 💰 | **missing (0 hits)** | 🌐 |
| `commerce.supportsCustomerGroupPrice` | R | buyer group selects the price | 💰 | **missing (0)** | 🌐 |
| `commerce.supportsContractPrice` | M | per-account negotiated rate, the outcome of a quote · **= a hospital payer contract rate** | 💰 | **missing (0)** | 🌐 |
| `commerce.supportsChannelPrice` | R | price varies by channel / location | 💰 | missing | 🌐 |
| `commerce.isTaxInclusive` | C | **3 values**: `inclusive` \| `exclusive` \| `unspecified` (Stripe `tax_behavior`). `unspecified` degrades to **exclusive** — over-collect and refund, never under-collect | 💰 | half (`includedInDisplayedPrice`, boolean) | 🌐 |
| `commerce.acceptsCurrency` | C | | 💰 | have | 🌐 |
| `commerce.acceptsValidityWindow` | C | `validFrom` / `validUntil` on a price or rule | 💰 | have (various) | 🌐 |
| `commerce.acceptsRoundingPolicy` | C | where rounding happens and in whose favour | 💰 | half (`roundRupees`, `SHIPPING_ROUND_UP_TO`, hardcoded) | 🌐 |
| `commerce.supportsDynamicPrice` | M | resolver-computed: winning bid, rental duration × rate, demand | 💰 | half (`lockedPrice`) | 🌐 |
| `commerce.acceptsCostBasis` | C | cost, for a margin floor | 💰 | **missing** | 🌐 |
| **PROMOTION** | | | | | |
| `commerce.supportsCoupon` | M | code-gated discount | 💰 | **have** | 🌐 |
| `commerce.supportsAutomaticDiscount` | M | eligibility only, no code | 💰 | half | 🌐 |
| `commerce.isDiscountClass` | C | `product` (lines) \| `order` (subtotal) \| `shipping` (delivery cost) | 💰 | missing | 🌐 |
| `commerce.acceptsCombinationWith` | C | 🛑 **an ALLOWLIST OF CLASSES, never a boolean** — two discounts combine only when **each permits the other's class** (Shopify `combinesWith`) | 💰 | **half** — `coupon-stacking.ts` exists; if it is a boolean it cannot be upgraded without re-authoring every promotion row | 🌐 |
| `commerce.acceptsApplicationOrder` | C | product → order (against the revised subtotal) → shipping | 💰 | half (implicit) | 🌐 |
| `commerce.supportsDiscountAction` | M | 🛑 **a SECOND catalogue beside the rules** (Spree's split): whole-order adjustment · per-line adjustment · **per-quantity adjustment** · free shipping | 💰 | half | 🌐 |
| `commerce.acceptsUsageLimit` / `commerce.acceptsPerPartyLimit` | C | total and per-customer redemption caps | 💰 | half | 🌐 |
| `commerce.supportsLoyaltyAccrual` | M | earn | 💰 | have | 🌐 |
| `commerce.acceptsAccrualRate` / `acceptsRedemptionRatio` / `acceptsRedemptionCap` | C | 1 coin per ₹1 · 10 coins = ₹1 · `maxRedemptionShare` | 💰 | have | 🌐 |
| **TRADE / WHOLESALE — the entire namespace is absent, and it is TODAY's vertical** | | | | | |
| `commerce.supportsBuyerOrganisation` | M | a buying entity with locations and members (commercetools Business Unit / Shopify Company) | 💰 | **missing (0)** | 🌐 |
| `commerce.supportsOrganisationHierarchy` | M | rules **inherit down** the tree | 💰 | **missing (0)** | 🌐 |
| `commerce.requiresPurchaseApproval` | R+M | **Approval Rule** (predicate on currency · country · amount, with requester and approver *roles*) → **Approval Flow** on match; approver tiers; rules inherit · **= a hospital purchase requisition** | 💰 | **missing** | 🌐 |
| `commerce.acceptsSpendLimit` | C | per member / per location | 💰 | missing | 🌐 |
| `commerce.supportsNetTerms` | M | pay after delivery; Shopify's eight: Net 7/15/30/45/60/90 **from placement**, **due-on-fulfilment** (after *all* items), **fixed date** | 💰 | **missing (0)** | 🌐 |
| `commerce.supportsCreditLimit` | M | AR exposure cap; **order release gated on it** | 💰 | **missing (1 ref)** | 🌐 |
| `commerce.acceptsPurchaseOrderReference` | C | buyer's PO number on the order | — | **missing (0)** | 🌐 |
| `commerce.supportsRequisitionList` | M | saved / recurring order templates | — | **missing (0)** | 🌐 |
| `commerce.acceptsMinimumOrderValue` | C | per store / per buyer org | 💰 | half | 🌐 |
| `commerce.supportsCatalogRestriction` | R | the buyer sees **only** an assigned catalogue (commercetools Product Selection) | — | missing | 🌐 |
| `commerce.supportsProductTailoring` | M | per-buyer name / description / images over a shared product | — | missing | 🌐 |

## 1.2 `money.*` — instruments and rails. **Every row degrades to the conservative side.**

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `money.supportsCardOnline` | M | | 💰 | have | 🌐 |
| `money.supportsCashOnDelivery` | M | collected at handover — 🛑 **no gateway transaction exists to reverse** | 💰 | have | 🛒 |
| `money.supportsCashOnPremises` | M | pay at counter / pickup (seeded default-off, seller-liftable — a **floor**) | 💰 | have | 🌐 |
| `money.supportsBankTransfer` | M | | 💰 | half | 🌐 |
| `money.supportsInvoiceNetTerms` | M | the tender twin of `commerce.supportsNetTerms` | 💰 | missing | 🌐 |
| `money.supportsStoreCredit` | M | 🛑 **TENDER, NOT A DISCOUNT LINE.** A discount reduces the taxable base; tender does not. Implementing it as a discount **silently changes the GST owed** | 💰 | **missing (0)** | 🌐 |
| `money.supportsGiftCardRedemption` | M | code-redeemed instrument | 💰 | missing | 🛒 |
| `money.acceptsPointsTender` | M | coins as a settling instrument | 💰 | **half — unreachable.** `true` on clearance only; the mechanism row says coins may *settle the whole line* while `maxRedemptionShare: 0.2` caps it at 20%. The capped-discount path is what runs | 🌐 |
| `money.supportsSplitTender` | M | one record settled by N instruments **with a declared application order** (credit → card → cash) | 💰 | **missing (0)** — and coins + card is already two instruments on one order | 🌐 |
| `money.supportsOfflineManualProof` | M | screenshot / UTR — **registered-and-disabled**: entry closed, read paths kept | 💰 | have (correct pattern) | 🛒 |
| `money.requiresMandate` | R | stored-credential consent before any later charge (Stripe mandates / RBI e-mandate) | 💰 | missing | 🌐 |
| `money.acceptsMethodRules` | C | ✅ **already settled**: `platform.disabled \|\| buyerDenied ? OFF : (listing ?? store ?? platform.default)` — two platform fields (ceiling **and** floor), `??` never `\|\|` | 💰 | **have — the model for every other resolver** | 🌐 |
| **RAILS** | | | | | |
| `money.supportsAuthorizeThenCapture` | M | two-step | 💰 | have | 🌐 |
| `money.supportsPartialCapture` | M | capture less than authorized (short ship) | 💰 | have | 🌐 |
| `money.supportsMultipleCapture` | M | several captures per auth — **required by partial fulfilment; the two are coupled** | 💰 | half | 🌐 |
| `money.acceptsAuthorizationValidity` | C | after expiry you must **re-authorize, not capture** | 💰 | missing | 🌐 |
| `money.supportsRefund` / `money.supportsPartialRefund` | M | with `partialGranularity: item \| amount \| none` | 💰 | have | 🌐 |
| `money.supportsRefundToAlternateTender` | R | ✅ `hasReversibleCapture` → rename `isReversibleCapture`. **Refund rail ≠ payment rail** — the COD lesson | 💰 | **have** | 🌐 |
| `money.supportsChargeback` | M | dispute lifecycle, evidence window, **reversal of an already-settled payout** | 💰 | half (contract + 26 files) | 🌐 |
| `money.supportsSettlementSplit` | M | one capture divided across balance accounts **at authorization**, commissions assigned per account (Adyen for Platforms) | 💰 | have | 🛒 |
| `money.acceptsSettlementDelay` | C | days before payout | 💰 | **excluded — see §6** | 🛒 |
| `money.supportsEscrowHold` | M | funds held until a delivery event, **staged release** | 💰 | **half** — hold *days* exist (`resolvePayoutHoldDays`); staged release against an event does not | 🛒 |
| `money.supportsPayoutSchedule` | M | | 💰 | have | 🛒 |
| `money.acceptsCommissionFee` / `money.acceptsBuyerFee` | C | ₹10→₹5 buyer, 5%→2.5% seller, **marginal per 3 units, per ORDER, composite = 1 unit** | 💰 | have (documented taper + no-cliff guard) | 🛒 |
| `money.isFeeTaxable` / `money.acceptsFeeTaxRate` | C | +18% GST on fees | 💰 | have | 🌐 |
| `money.supportsLedgerPosting` | M | double-entry statement; what audit reads | 💰 | have | 🌐 |
| `money.requiresIdempotencyKey` | R | 🛑 **non-negotiable.** CLAUDE.md says "missing" — **STALE**, 42 files carry it. What is genuinely missing is the guard on the **write→trigger→send→write** loop and a reader for `providerMessageIds` | 💰 | **half** | 🌐 |
| `money.requiresWebhookSignature` | R | literal `true`, deliberately not a boolean — unoverridable by design. ✅ Keep it that way | 💰 | **have** | 🌐 |
| `money.requiresServerResolvedAmount` | R | a posted `chargedRate` / amount is **ignored**; the server re-resolves and charges its own number | 💰 | have (shipping) / half (elsewhere) | 🌐 |
| `money.acceptsNumberingSeries` | C | invoice/order series per jurisdiction. ⚠ its write-back is what creates the trigger loop | 💰 | have | 🌐 |
| `money.supportsFeeExplanation` | M | ✅ `FeeDerivation` — one sentence + steps per fee line. **No researched system ships this; it is ahead of them.** Generalise it to every resolver | 💰 | **have** | 🌐 |

## 1.3 `fulfilment.*`

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `fulfilment.supportsShipping` | M | carrier movement (the **mechanism** half of today's overloaded flag) | — | have | 🛒 |
| `fulfilment.supportsDigitalDelivery` | M | electronic issue (code pool) | — | have | 🌐 |
| `fulfilment.supportsPickup` | M | BOPIS — needs **per-location** enablement + pickup hours + a pickup service | — | **missing** | 🌐 |
| `fulfilment.supportsLocalDelivery` | M | own fleet, radius-bounded | — | missing | 🛒 |
| `fulfilment.supportsServiceAtPremises` | M | provider travels to the party (field service, home visit) | — | missing | 🌐 |
| `fulfilment.supportsMultiLocationSplit` | M | one record fulfilled from N locations, cascading when one cannot cover | — | missing | 🌐 |
| `fulfilment.supportsPartialFulfilment` | M | some lines/quantities now; **requires `money.supportsMultipleCapture`** | 💰 | have | 🌐 |
| `fulfilment.acceptsFulfilmentTrigger` | C | 🛑 **`asap` \| `on-release` \| `exact-time` \| `on-full-payment` — ONE enum.** Replaces `hasInstantFulfillment` + `supportsDeferredFulfilment`: 4 boolean combinations, 3 meanings, one nonsense state | 💰 | **half** | 🌐 |
| `fulfilment.supportsFulfilmentDeferral` | M | waits for an explicit human release | — | have | 🌐 |
| `fulfilment.supportsTrackingPerParcel` | M | N parcels, each carrier + status (the multi-shipment case, proven at send time) | — | have | 🌐 |
| `fulfilment.requiresFulfilmentConstraint` | R | must/must-not group; must ship from location X | — | missing | 🌐 |
| `fulfilment.supportsReturn` | M | 🛑 **THREE objects, not one** (Shopify): `Return` = the party's **intent** → `ReverseFulfillmentOrder` = the **work** → `ReverseDelivery` = the **parcel**. Collapsing them is why most RMA builds cannot represent a partially-received return | 💰 | **half** — states + `returns.bornBy` exist; the three-object split does not | 🌐 |
| `fulfilment.acceptsReturnReason` | C | Shopify's ten — note **`unknown` is a member**, i.e. the enum itself degrades | — | missing | 🌐 |
| `fulfilment.acceptsReturnWindow` | C | days, basis `delivered \| dispatched` | 💰 | half (`extended_return_window` as a store capability) | 🌐 |
| `fulfilment.acceptsRestockingFee` | C | a **percentage per return line** | 💰 | **missing (0)** | 🛒 |
| `fulfilment.requiresRestockDecision` | R | does the unit rejoin saleable stock — a `defective` return must not | — | **missing** | 🌐 |
| `fulfilment.supportsExchange` | M | exchange lines sit on the return beside the inbound items; the outbound FO is created **at return processing** | 💰 | missing | 🌐 |
| `fulfilment.requiresSignatureAtHandover` | R | carrier adult signature | — | have | 🌐 |
| `fulfilment.supportsProofOfDelivery` | M | OTP / photo / signature | 💰 | half | 🌐 |
| `fulfilment.requiresShippingAddress` | R | (keep as the **rule** reading `commerce.isPhysical` ∧ chosen method) | — | have | 🛒 |
| `fulfilment.supportsDropship` | M | delegated to a service that **owns its own location** | — | **excluded — §6** | 🛒 |
| `fulfilment.supportsPickupPoint` | M | third-party locker | — | **excluded — §6** | 🛒 |
| `fulfilment.acceptsPackagingConstraint` | C | hazmat class, ground-only, labelling | — | **excluded — §6** | 🛒 |
| `fulfilment.acceptsDispatchSla` | C | `dispatchSlaHours`, **business-hours aware** or every weekend breaches | — | half | 🌐 |
| `fulfilment.supportsDeliveryPromise` | M | predicted delivery date surfaced pre-commit (the owner's "shipment prediction") | — | **missing** | 🌐 |

## 1.4 `inventory.*`

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `inventory.isTracked` | C | **three-valued**: `none` \| `at-product` \| `at-variant` (BigCommerce) | — | half (`showsStockQuantity`, boolean) | 🌐 |
| `inventory.supportsOnHand` | M | physical units present; ≥ 0 | — | have | 🌐 |
| `inventory.supportsAllocated` | M | assigned to a **committed record** | 💰 | **half** | 🌐 |
| `inventory.supportsReserved` | M | held for an **uncommitted** checkout, with a TTL | 💰 | **half** | 🌐 |
| — | | 🛑 **THREE NUMBERS FROM DAY ONE.** Today `reserved = stockQuantity − availableQuantity` is one derived gap doing both jobs. Saleor keeps them separate **and still has open bug #19925 where enabling reservations made allocations be ignored.** Retrofitting the third number is a data migration | 💰 | | |
| `inventory.acceptsOutOfStockThreshold` | C | `saleable = onHand − allocated − threshold`; **negative = backorder allowed** (Vendure, verbatim) | 💰 | missing | 🌐 |
| `inventory.acceptsSafetyStock` | C | buffer withheld from sale | 💰 | **missing (0)** | 🌐 |
| `inventory.supportsCheckoutReservation` | M+C | eager hold for a configured duration | 💰 | have (`stockReservations` + `expiresAt`) | 🌐 |
| `inventory.supportsAllocationStrategy` | M | which location serves a line; cascade when one cannot cover | — | **missing** (placement rows exist, no strategy over them) | 🌐 |
| `inventory.supportsMultiLocation` | M | | — | half | 🌐 |
| `inventory.supportsAvailableToPromise` | M | forward-looking: uncommitted + planned receipts − commitments − safety stock. **`ATS = ATP − channel buffer`; two different answers, storefront needs ATS, fulfilment needs ATP** | 💰 | **missing (0)** | 🌐 |
| `inventory.supportsLotTracking` | M | **one number across many units** · hospital-critical (drug/implant recall) | — | **missing** — 🛑 all 704 `lot` hits are **clearance/reveal lots, not inventory lots** | 🌐 |
| `inventory.supportsSerialTracking` | M | **one number per single unit**. ⚠ NetSuite: assigning a lot/serial is **not** an inventory commitment — two primitives | — | **missing (0)** | 🌐 |
| `inventory.requiresExpiryDate` | R | perishables, pharma, certificates | — | **missing (1)** | 🌐 |
| `inventory.supportsDerivedStock` | M | availability computed from components — Kit BOM vs **Phantom BOM** | 💰 | **have** (`componentStockPolicy`) | 🌐 |
| `inventory.supportsTimeSlotCapacity` | M | availability is **per window**, not a count — the bridge to `schedule.*` | — | **missing (0)** | 🌐 |
| `inventory.acceptsOverbookingAllowance` | C | commitments beyond capacity | 💰 | **excluded — §6** | 🌐 |
| `inventory.acceptsBinLocation` | C | | — | have | 🌐 |
| `inventory.supportsStockResync` | M | recompute from source; the counter-drift repair path | — | have | 🌐 |

## 1.5 `content.*` — bundles, fields, templates, publishing

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `content.supportsEntityKind` | M | the storage mechanism: id space, repository, write hooks, PII policy. **Adding one is a release** | — | have (implicit) | 🌐 |
| `content.supportsBundle` | M+C | 🛑 **your "ENTITY TYPE" — a config row declaring a field set + allowlists over one entityKind.** Listing types and event types are two hand-built instances; **there is no generic primitive they are instances OF** | — | **missing** | 🌐 |
| `content.acceptsBundleAllowlist` | R+C | the whole *"a type is only an allowlist"* idea | — | half | 🌐 |
| `content.acceptsCapabilitySet` | R+C | the `supports/requires/accepts/is` table bound to a bundle, **three-valued per key** | — | half (5 divergent registries) | 🌐 |
| `content.supportsCollection` / `content.supportsSingleton` | M | many instances vs exactly one (site settings, homepage) | — | have / half | 🌐 |
| `content.supportsComponent` | M+C | reusable named field-group, nestable, not independently addressable (Sanity `object` / Strapi component) | — | missing | 🌐 |
| `content.supportsRepeater` | M+C | ordered **homogeneous** list of a component | — | have (`Repeater`) | 🌐 |
| `content.supportsBlockList` | M+C | ordered **heterogeneous** list of allowlisted block types — **the page-builder field** (Strapi `dynamiczone`) | — | half (widget regions) | 🌐 |
| `content.acceptsFieldStorage` | M+C | field definition at **entityKind** scope: schema, encryption, blind index, search index → the **platform** level | — | half (PII registry) | 🌐 |
| `content.acceptsFieldInstance` | R+C | the same field re-declared **per bundle**: label, help, widget, required, default, cardinality — **may NARROW ONLY** (Drupal: *"put settings at the instance level whenever possible"*, and cardinality is restrictable-not-raisable) | — | half | 🌐 |
| `content.supportsTree` | M+C | self-parent + materialised path + depth cap | — | have | 🌐 |
| `content.acceptsOrdering` | C | explicit child weight, separate from any sortable field | — | have | 🌐 |
| `content.acceptsSlug` | C | routable identity + uniqueness scope | — | have | 🌐 |
| `content.supportsSlugHistory` | M | retired slugs retained so old URLs redirect | — | half | 🌐 |
| `content.supportsTag` | M+C | cross-bundle free label, not a reference | — | have | 🌐 |
| `content.supportsEnvironment` | M+C | a named data realm (`(default)` / `dev-db`) selected per deployment | — | have | 🌐 |
| **FIELD TYPES** — one registry: storage shape + widget + formatter + validator + PII policy per type | | | | | |
| `content.supportsFieldType` | M | **the registry itself.** 🛑 Today: `FormFieldProps.type` = 11 members, events' `FormFieldType` = 12, **two divergent unions**, and `form-field-registry.ts` registers exactly **2** runtime renderers. `"file"` is in the picker and **uploads nothing** (stores `files[0].name`) | — | **half** | 🌐 |
| — text | | `text` · `textLong` · `richText` (**store as Portable-Text JSON, never markup**) · `markdown` · `code` · `slug` · `id` (regex/min/max) · `password` · `secret` (**write-only**) · `email` · `phone` · `url` | — | mixed | 🌐 |
| — numeric | | `integer` · `bigInteger` · `decimal` · `float` · `percent` · **`money`** (amount + currency as ONE value) · **`measure`** (value + unit) · `rating` (value + scale) · **`unitQuantity`** (qty + UOM) | 💰 | `money`/`measure`/`unitQuantity` **missing** | 🌐 |
| — temporal | | `date` · `time` · `dateTime` · **`dateRange`** · `duration` · `timezone` · **`recurrenceRule`** (iCal RRULE) | — | `dateRange`/`recurrenceRule` **missing (0)** | 🌐 |
| — choice | | `boolean` · `enumSingle` · `enumMulti` · 🛑 **`openSlug`** — a validated **open** slug: unknown members accepted, degraded, surfaced on an admin screen | — | **half — 4 hand-rolled instances (`BannedAction`, `PaymentMethodSlug`, event `type`, `FormFieldType`), no shared primitive** | 🌐 |
| — reference | | `reference` · `referenceList` · `polymorphicReference` · **`crossServiceReference`** | — | missing as field types | 🌐 |
| — media | | `image` · `imageList` · `file` · `video` · `audio` · `mediaFocalPoint` · **`mediaOrientation`** (the owner's owed portrait/landscape flag lives **here, at the field** — not on `event.type`, and it generalises to blogs/products/stores) | — | half | 🌐 |
| — structured | | `json` · **`keyedMap`** (map keyed by an open slug — `store.paymentMethods`; *"a map, not named booleans"* is a recurring decision, so name it once) · `array` · `blockList` | — | half | 🌐 |
| — spatial / misc | | `geoPoint` · `geoArea` · `address` (structured, PII-registered) · `color` · `language` · `icon` | — | missing | 🌐 |
| — presentational (**no storage**) | | `group` · `tabs` · `row` · `collapsible` · `uiNote` — Payload's category; adopt the name | — | half | 🌐 |
| `content.acceptsListModifier` | C | **list-ness is a MODIFIER** (`list.<type>`), not N new types. Shopify's refusal set is a good default: boolean, id, json, language, money, multi-line text, rich text | — | missing | 🌐 |
| **FIELD META (the rule layer on an instance)** | | | | | |
| `content.requiresField` | R+C | required | — | have | 🌐 |
| `content.requiresDefaultWhenHidden` | R | 🛑 **your own standing rule**: a required field may be hidden **only** if a default is supplied. Enforce in the resolver, not at render | — | **have** (`partitionRequiredRules` + `unreachableFields`) | 🌐 |
| `content.acceptsFieldDefault` | C | static value **or** a resolver | — | half | 🌐 |
| `content.acceptsCardinality` | C | min/max occurrences; **instance may lower, never raise** | — | missing | 🌐 |
| `content.requiresValidation` | R+C | **named** rules compiled to a validator: `in` · `unique` · `uniqueScope` · `size` · `range` · `regexp` · `linkContentType` · `dependentRequired` · `if/then/else`. 🛑 **Never hand-authored zod** — that is exactly how a hardcoded `.max(4)` silently beat the per-event check | — | **half** — 5 rules (`minLength/maxLength/min/max/pattern`), shared client+server ✅ | 🌐 |
| `content.isImmutable` / `content.isWriteOnce` / `content.isReadOnly` | C | | — | missing | 🌐 |
| `content.acceptsFieldAccess` | R+C | per-field read/write permission, independent of bundle permission | — | missing | 🌐 |
| `content.acceptsFieldVisibility` | R+C | admin-togglable presence in a form/display | — | have (`fieldVisibility/{surfaceId}`) | 🌐 |
| `content.acceptsConditionalDisplay` | R+C | show/hide/enable/disable on sibling values (JSON Forms `effect: SHOW\|HIDE\|ENABLE\|DISABLE` + a `condition {scope, schema}`) | — | half | 🌐 |
| `content.isLocalized` | C | per-field localisation opt-in | — | missing | 🌐 |
| `content.acceptsPiiPolicy` | R+C | `encrypt` \| `blindIndex` \| `tokensIndex` \| `plaintext`, declared on the field in a registry, applied by **exactly one** write hook | — | have (hard-won) | 🌐 |
| `content.isIndexed` / `content.isSortable` / `content.isFacetable` | C | 🛑 **declares the QUERY AXES this field offers** — which is what makes the index requirement derivable | — | **missing** | 🌐 |
| `content.acceptsTier` | C | `system` (never relaxable) vs `config` (a clone may relax) | — | missing | 🌐 |
| **VIEW / FORM / TEMPLATE** | | | | | |
| `content.supportsViewMode` | M+C | a named **read** presentation of a bundle (`full`, `teaser`, `card`, `og`) | — | half | 🌐 |
| `content.supportsFormMode` | M+C | 🛑 **the symmetric WRITE twin. Ship it WITH view modes.** Drupal shipped them years apart and the ecosystem never caught up. Your *"entry forms are per-event config"* requirement **is** a form-mode requirement | — | **half** — `templates["form.listing"]` keys point at nothing | 🌐 |
| `content.acceptsDisplay` | C | bundle + mode → ordered components, each with formatter/widget settings | — | half | 🌐 |
| `content.acceptsFallbackChain` | R | un-customised mode resolves `mode → parentMode → default`. **Drupal only does one hop; do the chain** | — | missing | 🌐 |
| `content.isEntityShape` | C | 🛑 **one composed view per SHAPE, never per TYPE** (A19r) | — | half | 🌐 |
| `content.supportsVariation` | M+C | 🛑 **a named preset of attributes + inner blocks over ONE widget/bundle, optionally with its own extra field set** (Gutenberg variations; Prismic slice variations are stronger). **Most of your "7 listing types" are variations, not types** | — | **missing** | 🌐 |
| `content.supportsPattern` | C | **unsynced** — copied at insert, no link afterwards | — | missing | 🌐 |
| `content.supportsSyncedPattern` | M+C | **synced** — a live reference (Builder symbol / Figma component) | — | missing | 🌐 |
| `content.supportsTemplateType` | M+C | a template for a template — copied once, **static** reference afterwards (AEM) | — | missing | 🌐 |
| `content.supportsTemplate` | M+C | the live upstream object a clone tracks | — | half | 🌐 |
| `content.acceptsTemplateStructure` | R+C | which widgets exist and how they nest — **PROPAGATES to existing clones** | — | half | 🌐 |
| `content.acceptsTemplatePolicy` | R+C | the supports allowlist, constraints, required elements — **PROPAGATES immediately** | — | half | 🌐 |
| `content.acceptsInitialContent` | C | seed values — **NEW instances only** | — | missing | 🌐 |
| `content.requiresTemplateElement` | R+C | an element a clone **cannot remove**; merged into every clone on update | — | **have** (`removable:false` — refused **and reported**, never silently honoured ✅) | 🌐 |
| `content.acceptsOverrideKey` | C | 🛑 **an author-stable key on every overridable node.** Without it merge is impossible — and worse, overrides silently reset. Figma, Gutenberg and Kubernetes converged on this independently | — | half (`templateSlot`) | 🌐 |
| `content.acceptsOverride` | C | the clone's **sparse patch**, keyed by overrideKey, stored on the clone (RFC 7386) | — | **have** (`mergeStoredWithDefaults` — field-wise, `"state" in override` three-valued, `type` never overridable ✅) | 🌐 |
| `content.acceptsForkPoint` | C | 🛑 **the upstream snapshot at clone time. Required for a three-way merge.** A two-way merge cannot tell *"the user changed it"* from *"upstream changed it"* and therefore **cannot delete anything** — Kubernetes shipped that mistake and had to add `last-applied-configuration` | — | **missing** | 🌐 |
| `content.acceptsFieldOwnership` | C | 🛑 per-node record of **which actor last set this value** (upstream / clone author / seed) — k8s Server-Side Apply `managedFields` | — | **missing** (`WidgetInstanceOrigin` is the right start, one field short) | 🌐 |
| `content.acceptsMergeStrategy` | R+C | per node: `replace` \| `merge` \| `appendByKey` \| `pin` | — | missing | 🌐 |
| `content.acceptsConflictPolicy` | R+C | `upstreamWins` \| `cloneWins` \| **`flagForReview` (default)** — k8s reports rather than resolves | — | missing | 🌐 |
| `content.acceptsUpgradeChannel` | R+C | per clone: `track` \| `pin` \| `manualReview` | — | missing | 🌐 |
| `content.supportsTombstone` | M | a node removed upstream keeps the clone's override **retained but inert**, so an upstream re-add restores the author's edit | — | missing | 🌐 |
| `content.supportsRevertToDefault` | M+C | drop a clone's overrides for one node or all | — | missing | 🌐 |
| `content.supportsPromoteOverride` | M+C | push a clone's edit **upstream** (Figma "push overrides to main component") — **escalation: does this exist? It needs its own approval flow** | — | missing | 🌐 |
| `content.supportsMergeReport` | M | 🛑 a readable diff of what an upstream update changed in this clone **and what it refused to change**. Silent merges are undetectable | — | missing | 🌐 |
| **PUBLISHING** | | | | | |
| `content.isPublicationState` | C | **four states**: `draft` · `published` · **`changed`** (published with newer unpublished edits — most systems omit it and you need it) · `archived` | — | half | 🌐 |
| `content.isDefaultRevision` | R+C | 🛑 **which revision is SERVED — a SEPARATE boolean from `isPublished`.** Collapsing them is a known Drupal-level design error | — | missing | 🌐 |
| `content.supportsRevision` | M | immutable snapshot + author + timestamp | — | half (`status-history`) | 🌐 |
| `content.supportsAutosave` / `acceptsVersionCap` / `supportsRestore` / `supportsDiff` | M/C | | — | missing | 🌐 |
| `content.supportsPreview` | M+C | tokened read of the draft | — | half | 🌐 |
| `content.acceptsScheduledPublish` | C | and unpublish | — | missing | 🌐 |
| `content.supportsRelease` | M+C | 🛑 **publish N documents ATOMICALLY as one change set** (Contentful Releases) | — | missing | 🌐 |
| `content.requiresPublishGate` | R+C | named checks before publish (brand-leak differential, index coverage, required-field completeness) | — | have (as a human process) | 🌐 |
| `content.supportsPublishedValueTokens` | M | ✅ `resolvePublishedValues` — unknown token left **visibly unresolved** (`{{wrongKey}}`), because *"a blanked token reads as a sentence with a word missing, which nobody reports"*. **The best degrade reasoning in the tree** | — | **have** | 🌐 |
| **SEO** | | | | | |
| `content.acceptsSeoMeta` | C | title · description · image · canonical · og · twitter | — | have | 🌐 |
| `content.supportsSeoGenerator` | M+C | **derive** from content rather than author (`generateTitle`/`Description`/`Image`/`URL`) | — | half | 🌐 |
| `content.acceptsRobotsDirective` | R+C | 🛑 **explicit PER BUNDLE / PER SECTION, never silently inherited** — a root-layout `noindex` on a content app is catastrophic and nothing errors | — | have (measured outage) | 🌐 |
| `content.supportsStructuredData` | M+C | JSON-LD assembled from fields, not authored | — | half | 🌐 |
| `content.acceptsSitemapInclusion` | R+C | 🛑 an **empty** sitemap must THROW, not publish | — | have | 🌐 |
| `content.acceptsRedirect` | M+C | 308 permanent vs 307 temporary, **ordered before locale middleware** | — | have | 🌐 |
| `content.isSectionOwner` | C | ✅ `ownsSections: true` — a host that OWNS a section is not governed by another host's visibility flags | — | **have** | 🌐 |
| `content.isRenderable` | C | whether a bundle is a routable page at all (Shopify `renderable`/`onlineStore`) | — | missing | 🌐 |
| **I18N** | | | | | |
| `content.acceptsLocale` / `acceptsDefaultLocale` / `acceptsFallbackLocale` | C | per-locale fallback **chain** | — | half | 🌐 |
| `content.acceptsLocaleOptional` | R+C | *"allow required fields to be empty for this locale"* — a **per-locale relaxation of a required rule** (Contentful) | — | missing | 🌐 |
| `content.isLocalizationStrategy` | R+C | **per-bundle**: `fieldLevel` (one doc, per-locale values) vs `documentLevel` (one doc per locale + a join). Sanity deliberately ships both — **escalation** | — | missing | 🌐 |
| `content.acceptsMessageNamespace` | M+C | 🛑 UI strings per **namespace**, loaded per app — *add the namespace, never the catalogue* (the 163-brand-hit lesson) | — | have | 🌐 |

## 1.6 `participation.*` — entries, votes, prizes, giveaways

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `participation.supportsEntry` | M | a party submits a record against a parent entity | — | have | 🌐 |
| `participation.acceptsEntryForm` | C | 🛑 **per-event field definitions** — text, select, number, media. *"3 photos + 1 video + a 100-word note"* is **one event's form**, not the shape of every form | — | **have** (`resolveEntryFormFields` — textbook degrade ✅) | 🌐 |
| `participation.acceptsEntryLimit` | C | 1–5 per party; slot ids `<eventId>:<uid>:<slot>` already support N | — | have | 🌐 |
| `participation.requiresEntryMedia` | R+C | min/max per kind. ⚠ the 4th declared-but-unwired instance: it refused **every** submission while the form offered no way to attach one | — | have (now) | 🌐 |
| `participation.acceptsEntryApproval` | C | `auto` \| `manual` — unknown degrades to **manual** | — | have | 🌐 |
| `participation.supportsVote` | M | one party expresses preference on one entry | — | have | 🌐 |
| `participation.acceptsVotePolicy` | C | one-per-party, window, weight, whether dislike renders | — | half | 🌐 |
| `participation.acceptsRanking` | C | ✅ `entryRanking` rule set with `tieBreak` **and `publicWording`**, so artwork and mechanic cannot drift. **The best convention in the codebase — generalise `publicWording` to every rule set** | — | **have** | 🌐 |
| `participation.supportsLeaderboard` | M | a materialised ranked view with a refresh policy | — | half | 🌐 |
| `participation.supportsPrize` | M | an award resolvable to a **listing, a coupon, or points** — one mechanism, three payload kinds | 💰 | half | 🌐 |
| `participation.acceptsEntryFee` | C | paid entry; cluster: `money.*` | 💰 | half | 🌐 |
| `participation.requiresEligibility` | R | may this party enter (age, region, prior wins, account standing) | — | half | 🌐 |
| `participation.supportsEntryOwnerEdit` | M | 🛑 **owner requirement #1** — inline edit/delete for the entry owner **and** admins, on the card, across all hosts. Requires `access.requiresOwnership` which **does not exist** | — | **missing** | 🌐 |
| `participation.supportsGiveawayDraw` | M | random selection with a seed and an audit record | 💰 | half | 🌐 |
| `participation.acceptsCounterRecompute` | R+C | 🛑 a denormalised counter **must** ship a decrement path AND a recompute. `event.stats` drifted; `surfaceCounts` wrote dotted keys through `.set()` and **never fired once** | — | have (fixed) | 🌐 |

## 1.7 `claim.*` — a party asserts something went wrong, and it is adjudicated

Split deliberately from `fulfilment.supportsReturn`: **the movement is fulfilment; the assertion and its adjudication are a claim.** One mechanism serves returns, disputes, protection claims, warranty and support.

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `claim.supportsClaim` | M | the generic record: subject · reason · evidence · state · adjudicator | 💰 | half (4 bespoke flows) | 🌐 |
| `claim.acceptsClaimReason` | C | per-kind reason catalogue, **with an `unknown` member** | — | half | 🌐 |
| `claim.acceptsFilingWindow` | R+C | from which event, for how long | 💰 | have (`DISPUTE_TRANSIT_WINDOW_DAYS`) | 🌐 |
| `claim.requiresEvidence` | R+C | which attachments, how many, whose | — | half | 🌐 |
| `claim.supportsAdjudication` | M | decide + record who decided + reason | 💰 | half | 🌐 |
| `claim.acceptsRefundGate` | R+C | which conditions permit an automatic refund. ⚠ a gate must not be relaxed "to clear a type error" — the COD retarget lesson | 💰 | have (`refundGatesSeedData` — **declared, unread**) | 🌐 |
| `claim.acceptsLiability` | C | who bears the cost (`returns.bornBy`) — and it **must be disclosed pre-commit** | 💰 | have | 🌐 |
| `claim.supportsChargebackDefence` | M | evidence submission against an acquirer dispute | 💰 | half | 🌐 |
| `claim.supportsWarrantyClaim` | M | a post-delivery obligation with its own clock | 💰 | missing | 🌐 |
| `claim.supportsProtectionClaim` | M | platform-funded protection | 💰 | **half** — `protection-config.ts` commit says in its own subject *"GROUNDWORK, NOT YET WIRED"* | 🛒 |
| `claim.supportsSupportTicket` | M | a conversation attached to a subject | — | have | 🌐 |
| `claim.acceptsEscalation` | C | `timeoutHours` → `escalatesTo` | — | **half** (declared in the dead transition seed) | 🌐 |
| `claim.acceptsSlaTimer` | C | escalate if a state is held too long | — | missing | 🌐 |
| `claim.requiresCoolingOffPeriod` | R | statutory cancellation window | 💰 | **missing (0)** | 🌐 |

## 1.8 `trust.*` — verification, compliance, consent, disclosure, moderation

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `trust.requiresAgeVerification` | R+C | 🛑 **TWO primitives: a gate (self-attested) and a verification (third-party, against authoritative data).** FDA: verify anyone appearing under 30 | — | half (`ageGate` on events) | 🌐 |
| `trust.requiresIdentityVerification` | M+R | KYC on buyer or seller | 💰 | have | 🌐 |
| `trust.requiresVendorVerified` | R | listing-level: the seller must be verified. (Keep `verified_seller` as the **store capability** — different subject) | 💰 | have | 🌐 |
| `trust.requiresJurisdictionAllowlist` | R | origin/destination must be permitted | 💰 | have | 🌐 |
| `trust.requiresLicenceHeld` | R | a party must hold a licence. 🛑 **Liquor retailer = pharmacy = prescriber = firearms dealer: ONE primitive** | 💰 | **missing** | 🌐 |
| `trust.requiresExternalAuthorisation` | R | an authorising document must exist before fulfilment. 🛑 **Prescription = export licence = parental consent = payer prior-auth: ONE primitive** (FHIR `ServiceRequest`) | 💰 | **missing** | 🌐 |
| `trust.isProhibitedForAcquirer` | R | ✅ the **acquirer's** banned-category list, deliberately separate from the chosen-method check, *because a buyer told the wrong reason picks the wrong remedy* | 💰 | **have** | 🌐 |
| `trust.acceptsTaxCategory` | C | product tax code (HSN) | 💰 | have | 🌐 |
| `trust.supportsTaxExemption` | M+C | 🛑 **NOT a boolean.** `(reason code, certificate, jurisdiction-of-validity)`, applied at document **or line** level (Avalara entity/use codes, legally derived from the SST certificate). Avalara's whole product exists because a boolean is wrong | 💰 | **missing** | 🌐 |
| `trust.requiresTaxRegistration` | R | **nexus** — no registration in a jurisdiction, no collection | 💰 | **missing** | 🌐 |
| `trust.supportsReverseCharge` | R | liability shifts to the buyer (cross-border B2B) | 💰 | missing | 🌐 |
| `trust.requiresConsentRecord` | M | ✅ durable, versioned, auditable consent — `policy-consent.ts` is a **clause model**, capability-driven, fail-closed by default | 💰 | **have (exemplary)** | 🌐 |
| `trust.requiresPreCommitDisclosure` | R | 🛑 a fact must be shown **before** commit. Generalise it — the return-cost disclosure is one instance; repeating it per surface is the defect | 💰 | half | 🌐 |
| `trust.requiresTwoAdminApproval` | R | a second admin must confirm. Already on payment + tax rule sets, and `moneyPath` is already a field on every mechanism row | 💰 | have | 🌐 |
| `trust.requiresAuditTrail` | M | `recordAdminAction()` | 💰 | have | 🌐 |
| `trust.supportsModerationQueue` | M | human review with a decision record | — | have | 🌐 |
| `trust.acceptsModerationScore` | C | automated score + threshold | — | missing | 🌐 |
| `trust.supportsWatermark` | M+C | applied to served media; **config, per surface** | — | have (`site-settings-watermark-form`) | 🌐 |
| `trust.acceptsReputationSignal` | C | rating, review count, return rate, dispute rate — **inputs to predicates, not gates themselves** | — | half | 🌐 |
| `trust.supportsFraudSignal` | M | ip/address mismatch, velocity. ⚠ `UNKNOWN` behind a VPN — **never let it deny alone** | 💰 | missing | 🌐 |
| `trust.acceptsExportDocumentation` / `trust.requiresHazmatHandling` | C/R | | — | **excluded — §6** | 🛒 |

## 1.9 `access.*` — who may do what to which thing

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `access.supportsPermission` | M | an action slug. 🛑 **132 `admin:*` literals in a closed union → becomes a GENERATED product: `resourceType (~55) × action (~6 + specials)`.** This structurally kills the recorded ungrantable-permission defect (a permission in the union but in no preset has **no checkbox**, three times over) | 💰 | **half** | 🌐 |
| `access.supportsRole` | M+C | roles as **bundles of capabilities, held as data** | — | have | 🌐 |
| `access.acceptsPermissionGroup` | C | 22 presets / 17 employee groups | — | have | 🌐 |
| `access.acceptsMaxRolesPerUser` | C | 3 today, config | — | have | 🌐 |
| `access.requiresOwnership` | R | 🛑 **THE SINGLE LARGEST ACCESS GAP.** There is no `admin:*` string for *"the entry owner may edit their own entry"*; ownership is enforced ad hoc at every resource. Blocks owner requirement #1 across five hosts | — | **missing** | 🌐 |
| `access.supportsRelation` | M | Zanzibar-shaped tuples `(subject, relation, object)` + a `relation → permission` rewrite. ⚠ **Keep it small and local** — one-hop ownership and store/entry parentage is a `relations` collection with a composite index, **not** a distributed authorization service | — | **missing** | 🌐 |
| `access.supportsDelegation` | M | act on behalf of another party | 💰 | half (`returns.bornBy`, delegation in the current diff) | 🌐 |
| `access.isImpersonating` | C(fact) | 🛑 **gate money on this** | 💰 | missing | 🌐 |
| `access.supportsSoftRestriction` | M+C | ✅ `BannedAction = Known \| (string & {})` + `UserSoftBan {action, target, expiresAt, bannedBy}` — **the open-slug parameterised deny row, already shipped, already with expiry and lift-without-delete** | 💰 | **have (exemplary)** | 🌐 |
| `access.supportsHardRestriction` | M | | 💰 | have | 🌐 |
| `access.supportsEntitlement` | R+C | four kinds (SaaS entitlement platforms converged on these): **boolean access** · **configuration value** · **metered limit** · **credit-backed**. Maps onto coins + add-ons + `StoreCapability` | 💰 | half | 🌐 |
| `access.acceptsStoreCapability` | C | 19 today, closed union + a `Record<…, true>` totality trick ✅ | — | have | 🌐 |
| `access.acceptsTier` | C | basic / advanced gating | — | have | 🌐 |
| `access.requiresMembership` | R | access gated on an entitlement | — | have | 🌐 |
| `access.acceptsQuota` | C | `{meterKey, limit, resetPeriod, resetAnchor: calendar \| subscription}` — 🛑 **`resetAnchor` is the detail always missed and always a bug** | 💰 | half | 🌐 |
| `access.acceptsRateLimit` | C | `{key, limit, windowSeconds, scope: actor\|ip\|global}`. ⚠ **never WRITE the cooldown on a READ** — `enforceCheckoutValueOtpRateLimit` writes `lastSentAt` every call, so a fallback attempt is refused by the cooldown the first just set | — | have (with that defect) | 🌐 |
| `access.acceptsDecisionStrategy` | R+C | per gate: `unanimous` (default, **the only option on money and permission paths**) \| `affirmative` \| `consensus` (Keycloak) | 💰 | missing | 🌐 |
| `access.supportsKillSwitch` | M | 🛑 a platform-scope **forbid** that nothing overrides — marketplace-wide, per mechanism, per host. `platform.disabled` is already this; **name it once and share it** | 💰 | half | 🌐 |
| `access.acceptsRouteGate` | C | route → required permission | — | have | 🌐 |
| `access.acceptsMutableFieldAllowlist` | R+C | 🛑 **an ALLOWLIST, never a denylist**, with **dotted keys refused outright** (Firestore resolves `a.b` as a PATH in `update()`, so `"publicProfile.isPublic"` passes a naive top-level check and `"roles.0"` escapes entirely). Independently confirmed by OPA: its `WithUnsafeBuiltins` **denylist was bypassable** and was replaced by a capabilities allowlist | 💰 | have (one route) | 🌐 |

## 1.10 `schedule.*` — time and resource. **The vertical-neutral core, and the largest absent namespace.**

Measured: `appointment` = 2 hits · `timeSlot` = 0 · `recurrenceRule` = 0 · every `rrule` hit is a substring false positive (`offerRule`, `preorderRule`). **This namespace does not exist.**

🛑 **The structural claim worth acting on**: if `resolveAvailability` is written to cover a **count AND a slot set** behind one interface, the hospital case needs **zero new mechanisms**. `commerce.*` becomes a thin commerce-flavoured façade over `schedule.*` + `data.supportsRecord` + `money.*` — a cart is a *draft record with lines*, an order is a *committed record*, an appointment is a *committed record with a slot instead of a quantity*.

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `schedule.supportsSchedule` | M | a container of bookable time for a resource/party (FHIR `Schedule`) | — | **missing** | 🌐 |
| `schedule.supportsSlot` | M | a granular bookable unit **with a status**: `free` · `busy` · `busy-unavailable` · `busy-tentative` · `entered-in-error` (FHIR `Slot`) | — | **missing** | 🌐 |
| `schedule.supportsAppointment` | M | a booking that **may or may not** reference a slot — 🛑 **FHIR explicitly permits booking with no slot identified, which is a ready-made permissive degrade: no slot grid ⇒ still bookable** | — | **missing** | 🌐 |
| `schedule.acceptsSlotIncrement` | C | 15 / 30 / 60 min | — | missing | 🌐 |
| `schedule.isDurationPolicy` | C | `flexible-dates` \| `fixed-durations` \| `fixed-slots` | — | missing | 🌐 |
| `schedule.acceptsBufferBefore` / `acceptsBufferAfter` | C | prep, cleaning, inspection, turnaround | — | missing | 🌐 |
| `schedule.acceptsBlackoutWindow` | C | dates not bookable | — | missing | 🌐 |
| `schedule.acceptsLeadTime` / `acceptsBookingHorizon` | C | earliest / latest bookable | — | missing | 🌐 |
| `schedule.acceptsResourceCapacity` | C | N parties per slot (class, ward bed, table) | — | missing | 🌐 |
| `schedule.supportsRecurringBooking` | M | a series; needs `content.supportsFieldType: recurrenceRule` | — | missing | 🌐 |
| `schedule.acceptsRescheduleWindow` | C | | — | missing | 🌐 |
| `schedule.acceptsCancellationFeeSchedule` | C | fee as a function of proximity to the slot | 💰 | missing | 🌐 |
| `schedule.supportsCheckIn` / `acceptsNoShowPolicy` | M / C | | 💰 | missing | 🌐 |
| `schedule.acceptsSecurityDeposit` | C | fixed, % of total, or % of a per-item deposit value — **refundable on return, so it CONSUMES `money.supportsEscrowHold`; it is not a price** | 💰 | missing | 🌐 |
| `schedule.requiresEligibility` | R | 🛑 **may this party book this service.** FHIR `CoverageEligibilityRequest` for a hospital; *"is this buyer allowed this listing type"* for the shop. **ONE primitive — the single strongest evidence the design is vertical-neutral** | 💰 | half | 🌐 |
| `schedule.acceptsBusinessCalendar` | C | holidays + business hours, so an SLA clock is correct | — | missing | 🌐 |
| `schedule.acceptsTimezone` | C | 🛑 **explicit on every time primitive, and the clock is the SERVER's.** A client-supplied `now` is a free discount. Hospital: dosing times must be timezone-correct | 💰 | half | 🌐 |

## 1.11 `ui.*` — widget-level primitives (the catalogue of components is §4)

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `ui.supportsWidgetType` | M | the registered primitive: schema + supports + renderer. **The only UI thing that needs code** | — | **have** (`WidgetDef`, minted stable ids, `aliases[]` for legacy keys ✅) — but **11 defs against 43 in the mocks, 2 regions against 379 `pageId`s** | 🌐 |
| `ui.isWidgetKind` | C | 🛑 **FOUR kinds, not two**: `container` (ordered `children[]`) · `leaf` (`props` only) · **`slotContainer`** (NAMED regions — Card(media/title/actions), Table(columns), Tabs(tab→panel); a single `children[]` cannot express *"exactly one media slot, 0–3 actions"*) · **`provider`** (in the tree, has config, renders no box — Polaris ships **11** of these) | — | half | 🌐 |
| `ui.acceptsAllowedChildren` | R+C | | — | have | 🌐 |
| `ui.acceptsMaxChildren` | C | Shopify `max_blocks` (default 16, ceiling 50) | — | missing | 🌐 |
| `ui.requiresParent` | R+C | 🛑 **with a MESSAGE shown when violated** (Builder.io `requiresParent.message`) — the message is the part everyone forgets | — | missing | 🌐 |
| `ui.acceptsNestingDepthCap` | C | **4** — region › widget › child widget › element | — | have (`MAX_DEPTH`) | 🌐 |
| `ui.acceptsCardinality` | C | at most once per page (Gutenberg `multiple: false`) | — | missing | 🌐 |
| `ui.acceptsRegion` | C | a named composable page area | — | have (2) | 🌐 |
| `ui.acceptsSlot` | C | a named insertion point **with optional seed content** (Plasmic `slot` + `defaultValue`) | — | missing | 🌐 |
| `ui.supportsAsChild` | M | 🛑 **decide NOW**: may a widget row *merge into* its child's element rather than wrap it (Radix `asChild`/`Slot`, Builder `noWrap`, polymorphic `as`)? Without it, every *"make this card a link"* need becomes a new primitive | — | missing | 🌐 |
| `ui.supportsDataBinding` | M+C | 🛑 an attribute **sourced from data instead of authored**: `{source, args}` (Gutenberg Block Bindings — `post-meta`, `post-data`, `term-data`, `pattern-overrides`). **This is how a widget becomes data-driven with no code.** Today `RelatedScrollerConfig.source` is a **closed 4-member vocabulary for 1 widget type** | — | **half** | 🌐 |
| `ui.acceptsValueMap` | C | map a raw value to a label + colour as config (Grafana value mappings) | — | missing | 🌐 |
| `ui.acceptsRepeatOver` | C | one widget definition rendered N times over a query result (Grafana panel repeat / Plasmic repeat) | — | missing | 🌐 |
| `ui.acceptsDesignToken` | C | W3C DTCG `$value` + `$type` + aliases `{group.token}` + **composite tokens** (border, shadow, typography, gradient, transition). 🛑 Spec rules that matter: **never infer a token's type from its value**, and **detect circular references** and treat those tokens as unresolvable | — | half (`design-pack`, `surface-tokens` — no aliasing, no cycle detection) | 🌐 |
| `ui.acceptsTokenScope` | C | token sets per scope: global · per bundle · **per widget** (`settings.blocks.<name>`) | — | missing | 🌐 |
| `ui.isCeilingAndFloor` | R | 🛑 `theme.json` splits **`settings`** (what is ALLOWED — a ceiling) from **`styles`** (the DEFAULT — a floor), as two separate keys. **Independent confirmation of your payment-precedence decision; two mature systems converged on it separately. Treat it as settled.** | — | half | 🌐 |
| `ui.acceptsHandMode` | C | left/right-handed action placement | — | **have** (`HandModeRow`) | 🌐 |
| `ui.acceptsGesture` | C | swipe/long-press → action, per surface | — | missing | 🌐 |
| `ui.supportsInPlaceEdit` | M | 🛑 **edit mode on the card itself**, for the owner and for admins, on every card across every host. Needs `access.requiresOwnership` + `content.supportsFormMode` + an `editMode` render path (`resolveWidgetTree` already retains blocked widgets in edit mode ✅) | — | **missing** | 🌐 |

## 1.12 `data.*` — records, relations, query, state

| id | K | meaning | 💰 | status | 🌐 |
|---|---|---|---|---|---|
| `data.supportsRecord` | M | the generic committed document with lines | 💰 | have | 🌐 |
| `data.supportsLineItems` | M | | 💰 | have | 🌐 |
| `data.supportsStateMachine` | M | declared states + transitions + **guards**, with default checks disableable (Vendure `OrderProcess`) | 💰 | **half — TWO state machines: one live and bare (`Record<status, status[]>`), one rich and DEAD** (`orderTransitionsSeedData` declares `actor`, `permission`, `requiresMechanism[]`, `blockedByMechanism[]`, `timeoutHours`, `escalatesTo`, `gates[]`, `ledger` — **zero readers**) | 🌐 |
| `data.requiresTransitionPermission` | R | per transition, not per workflow | 💰 | **half** (declared, unread) | 🌐 |
| `data.acceptsTransitionReason` | C | `reasonRequired` on a transition | 💰 | half | 🌐 |
| `data.supportsAmendment` | M | change after commit, with a diff (commercetools order edits) | 💰 | missing | 🌐 |
| `data.supportsImmutableSnapshot` | M | ✅ a quote/invoice/order **freezes its inputs**; a later re-resolve must not change a sent number (add-on snapshot, `lockedPrice`, policy-version hash) | 💰 | **have** | 🌐 |
| `data.acceptsExpiry` | C | quotes, holds, reservations, certificates, auth windows | 💰 | have | 🌐 |
| `data.supportsAttachment` | M | proof, certificate, prescription, photo | — | have | 🌐 |
| `data.acceptsCancellationPolicy` | R+C | who may cancel, until when (clearance's *"locked by REVEAL, not confirmation"* is an instance) | 💰 | have | 🌐 |
| **RELATIONS** | | | | | |
| `data.supportsRelation` | M+C | the four cardinalities, bidirectionality declared explicitly | — | half | 🌐 |
| `data.supportsPolymorphicRelation` | M+C | one field referencing **several bundles**, bundle recorded beside the id (Directus M2A — how Directus does page builders; Shopify `mixed_reference`) | — | missing | 🌐 |
| `data.acceptsTargetAllowlist` | R+C | which bundles a reference may point at | — | missing | 🌐 |
| `data.supportsBackref` | M+C | read-only inverse, resolved not stored | — | missing | 🌐 |
| `data.supportsCrossServiceReference` | M+C | 🛑 **a reference whose target lives on ANOTHER HOST** — resolved over HTTP, cached, **degrading to a stub**. The microservice rule makes this mandatory; today every proxy route hand-rolls it | — | **missing** | 🌐 |
| `data.acceptsDisplayTemplate` | C | how a referenced item is summarised wherever it appears as a reference | — | missing | 🌐 |
| `data.acceptsReferenceBudget` | R+C | a declared cap on reference fields per bundle, because each is a query (Webflow caps at 10/20) | — | missing | 🌐 |
| **QUERY** | | | | | |
| `data.supportsQueryView` | M+C | a saved query + presentation (Drupal View) | — | half | 🌐 |
| `data.acceptsFilter` / `acceptsExposedFilter` / `acceptsContextualFilter` | R+C | fixed · visitor-controlled · taken from context (URL segment, current user, current host) | — | half | 🌐 |
| `data.acceptsSort` | R+C | with a **mandatory tie-break** | — | half | 🌐 |
| `data.acceptsFacet` | C | definition + counts | — | have | 🌐 |
| `data.acceptsPager` | C | full · mini · none · offset · infinite · cursor | — | have | 🌐 |
| `data.isEmptyBehaviour` | R+C | 🛑 **"no rows" / "not permitted" / "upstream unavailable" are THREE different renderings** (`/money-flow` already does this correctly) | — | half | 🌐 |
| `data.requiresIndexCoverage` | R+C | 🛑 **the single place the no-deploy promise genuinely breaks.** A config-selectable sort/filter axis can require a composite index that does not exist → `FAILED_PRECONDITION` → caught → **`200 {items: []}`**, indistinguishable from "no data". **Already caused the invisible-entries outage.** Rule: the config UI offers **only index-covered axes**; an uncovered axis is refused with a named reason, or served by a bounded in-memory sort over a capped page **and labelled as such**. Never silently | — | **missing** | 🌐 |
| `data.supportsUniversalSearch` | M | one query across bundles and hosts, each host answering for its own data | — | half | 🌐 |
| `data.acceptsSavedPreset` | C | user- or role-scoped saved view (Directus bookmarks) | — | missing | 🌐 |
| `data.acceptsCachePolicy` | R+C | `variesBy` + `tags`; revalidation target changes from a collection write to an API cache header when the source becomes a network hop | — | half | 🌐 |
| `data.supportsDenormalisedCounter` | M+R | with a **mandatory** decrement path and recompute | — | have (fixed) | 🌐 |
| `data.supportsComputedField` | M+C | derived at read time, never stored | — | half | 🌐 |
| `data.supportsProjection` | M | 🛑 **return a masked view, never the raw document.** Four recorded leaks of exactly this (`sellerEmailIndex`, `emailIndex`, `nameTokensIndex`, raw payout rows). **Strip by `/Index$/`, never by a map** — a map-driven strip already published `sellerTokensIndex` *in the commit that fixed that route's leak* | 💰 | have (orders) / **missing** (payouts) | 🌐 |

---

## 1.13 🛑 ONE IDEA, ONE NAME — the mandatory renames

The project's measured failure is **one idea under two-to-four names**. Five registries are keyed on listing type, each with its own vocabulary, and **two of them do not agree on the type KEYS** (`"collector-drop"` in the live union vs `"collector"` in the seed — any join silently drops that type).

| Keep | Delete these spellings | Count |
|---|---|---|
| `commerce.supportsAddToCart` | `canAddToCart` · `addToCart` · `cartEligible` · `cartLine:"blocked"` | 4→1 |
| `commerce.isPhysical` **+** `fulfilment.supportsShipping` | `supportsShipping` (overloaded) · `physicalShipping` · `ShippingRuleSet.physical` | 4→2 |
| `fulfilment.acceptsFulfilmentTrigger` | `hasInstantFulfillment` · `supportsDeferredFulfilment` · `instantFulfilment` | 3→1 |
| `commerce.supportsOfferNegotiation` | `canMakeOffer` · `offers` · `offerRule` | 3→1 |
| `commerce.supportsAuctionBid` | `canBid` — 🛑 **and ADD the missing mechanism row; the seed re-spelled bidding as offers and the capability was never updated** | 1→1 + gap |
| `commerce.supportsSurpriseReveal` | `reveal` · (keep `requiresCancelLockedByReveal` as its own rule) | 3→2 |
| `trust.requiresVendorVerified` | `verifiedSellerOnly` — keep `verified_seller` as the **store** capability (different subject) | 3→2 |
| `trust.requiresJurisdictionAllowlist` | `requiresJurisdictionCheck` · `jurisdictionCheck` | 2→1 |
| `claim.*` + `fulfilment.acceptsReturnWindow` | `returnsAllowed` · `refundPolicy`+`nonRefundable` · `extended_return_window` | 4→2 |
| `money.acceptsPointsTender` | `coinsRedeem` as a separate mechanism (the seed file **already refused** a third name — respect that) | 4→2 |
| `"collector-drop"` | `"collector"` (the seed spelling — it is the one with **zero readers**, so the live union wins) | 2→1 |
| `money.isReversibleCapture` | `hasReversibleCapture` | prefix |
| `inventory.isTracked` | `showsStockQuantity` | prefix |

---

# 2 · THE RULE CATALOGUE

## 2.1 Five primitives the project currently conflates into "rule"

🛑 **Naming these apart is the highest-value single output of this section.**

| | Primitive | Shape | Status |
|---|---|---|---|
| 1 | **PARAMETER** | a typed value (`dispatchSlaHours: 24`). No verdict. | have |
| 2 | **RULE SET** | a named, referencable **bundle of parameters** (`shipping-insured`). Edit once, every selector updates. | **have** — `rule-sets-seed-data.ts` (payment/shipping/tax/offers/coins) |
| 3 | **PREDICATE** | a **registered question** returning a verdict about a context (`cart.subtotalAtLeast`). | 🛑 **DOES NOT EXIST IN ANY FORM** |
| 4 | **POLICY** | `effect` + target scope + a predicate tree + a declared unknown-behaviour. A decision ROW. | 🛑 **does not exist** |
| 5 | **RESOLVER** | the machinery combining 2–4 into an answer **plus a trace**. | have, per-domain, ad hoc |

**Rule sets are parameter bundles, not predicates. Every condition in the tree today is a hand-written `if`.** Without #3 and #4, *"a new rule is a row"* is not expressible — this is the biggest structural gap after the dead mechanism catalogue.

## 2.2 🔴 THE EXPRESSION MODEL — decided

**A closed predicate registry with parameters, under a restricted JSON-Logic-SHAPED boolean tree, evaluated in three-valued logic.**

```
PolicyRow {
  id, label, version, schemaVersion
  effect:   "permit" | "forbid"                 // Cedar: forbid ALWAYS beats permit
  target:   { entityKind?, bundleId?, entityId?, storeId?, scope }   // INDEXABLE — fetch only candidates
  condition: ConditionNode
  onUnknown: "deny" | "allow" | "skip"          // XACML Indeterminate, resolved PER ROW
  decisionStrategy?: "unanimous" | "affirmative" | "consensus"
  publicWording: string                         // the project's own best convention
  priority, enabled
  requiresTwoAdminApproval?: boolean
}

ConditionNode =
  | { all:  ConditionNode[] }                   // Flagsmith ALL
  | { any:  ConditionNode[] }                   // Flagsmith ANY
  | { none: ConditionNode[] }                   // Flagsmith NONE  (not a loose NOT)
  | { predicate: string, params: Record<string, Json>, negate?: boolean }   // THE ONLY LEAF
```

**Why this and not the alternatives:**

| | registry + params | JSON Logic | CEL / Rego / Cedar text |
|---|---|---|---|
| admin-authorable UI | **dropdown + typed param form, finite and generatable** | needs a schema-aware tree editor | needs a syntax tutor |
| Firestore-queryable (*"which rules read purchase history?"*) | **yes — `predicateId` is an indexable field** | no, opaque blob | no, opaque string |
| per-predicate degrade direction | **yes** | 🛑 **no** | partial |
| money-path reviewability | **each predicate is ONE reviewed function with a declared data source** | arithmetic is authorable, so an admin authors the formula money depends on | same, plus a sandbox |

🛑 **The degrade row is decisive.** JSON Logic's `var` on a missing key yields `null`, and `null > 5` is uniformly `false`. But `false` is only conservative for a **grant**; for a **deny** rule `false` means **allow** — the non-conservative side on a money path. **One uniform missing-value rule cannot be conservative for both polarities.** Only a registry, where the predicate declares its own `onUnknown`, can be.

**The convergence argument:** Unleash (activation-strategy *constraints*), Flagsmith (`SegmentCondition` with 14 fixed operators), and LaunchDarkly (*clause* = attribute + op + values) are the three mature systems whose rules are authored by non-engineers — **all three chose a closed operator set over an expression language.**

## 2.3 🛑 THREE-VALUED LOGIC — what makes "degrade, never throw" structural

Every predicate returns `TRUE | FALSE | UNKNOWN`. Combine with **CEL's error-absorbing logical operators** — the single most useful finding in the research:

> *"if any of their operands uniquely determines the result (`false` for `&&`, `true` for `||`) the other operand may or may not be evaluated, and if that evaluation produces a runtime error, it will be ignored"*

```
FALSE ∧ UNKNOWN = FALSE        TRUE  ∨ UNKNOWN = TRUE
TRUE  ∧ UNKNOWN = UNKNOWN      FALSE ∨ UNKNOWN = UNKNOWN
```

These are SQL/Kleene semantics, deliberately **not** C-style short-circuit — **the result does not depend on operand order**, so an admin reordering clauses in a UI cannot change a verdict. Most unknowns never reach the top of the tree; only a genuinely load-bearing unknown hits `onUnknown`. An unknown predicate id, an unparseable row, or a failed data fetch all produce `UNKNOWN` — **never an exception**.

## 2.4 THE PREDICATE VOCABULARY

**Naming: `<subject>.<question>`, camelCase after the dot.** The four prefixes describe assertions about a **thing**; a predicate asks a question about a **context**, and the owner's own examples (`paymentRequired`, `pastPurchaseInWindow`, `regionAllowed`) use none of them. Capability-shaped predicates keep their prefix *inside* the namespace (`listing.supportsShipping`), so the two conventions compose rather than conflict. Subject namespaces make the editor groupable, let each namespace declare **one data source and one cost tag**, and make `array-contains` over `usedSubjects[]` answer *"which policies read purchase history?"*.

All return `TRUE|FALSE|UNKNOWN`.

**`actor.*`** — `isAuthenticated` · `isSelf{subjectField}` · `hasRole{roles[],mode}` · `hasPermission{permissions[],mode}` · `hasAnyPermissionMatching{prefix}` · `isInGroup{groupIds[]}` · **`isOwnerOf{objectType,objectIdFrom}`** · **`hasRelation{relation,objectType,objectIdFrom}`** · `isInSegment{segmentIds[],mode}` · `isDelegateOf{principalIdFrom,scope}` · `attributeEquals|Matches|In|IsSet{path,…}` · **`isImpersonating`** (🛑 gate money on it).

**`account.*`** — `ageAtLeast{days}` · `isVerified{kinds[]}` · `isSoftBannedFrom{action,target?}` · `isHardBanned` · `hasStandingAtLeast{tier}` · `ageOfPersonAtLeast{years,basis}` · `hasConsent{purpose,version?}` · `consentNotWithdrawnSince{purpose,days}` · `hasAcceptedAgreement{agreementId,minVersion}`.

**`history.*`** — the owner's named family, and **the one with nothing behind it today**. Parameter shape is the CDP shape (every CDP converged on **count function + window**; Adobe: *At least / At most / Exactly / Between / All* × *In last*): `purchaseCountInWindow{windowDays,min?,max?,status[],scope}` · `purchaseValueInWindow{…,minMinor,currency}` · `lastPurchaseWithin|OlderThan{days,scope}` · `isFirstPurchase{scope}` (Stripe `first_time_transaction`) · `hasPurchasedListing{ids[]|categoryIds[],withinDays?}` · `distinctOrderIntervalCount{intervalDays,min}` · `returnRateAtMost{windowDays,maxRatio,minOrders}` (🛑 `minOrders` guards a 1-of-1 return reading as 100%) · `cancellationCountAtMost{…}` (**the owner's "disable payment methods on a history of flagged issues"**) · `chargebackCountAtMost` · `disputeFreeFor{days}` · **`hasPerformedEvent{eventType,min,windowDays,propertyFilters?}`** (the escape hatch that stops this family needing a new predicate per event) · `reviewCountAtLeast` · `eventEntryCountInWindow{eventId?,min,max,windowDays}`.
⚠ **Every member is a Firestore aggregate.** It needs a **denormalised per-user window rollup maintained on order write**, or `history.*` is the reason checkout is slow — and since the project already has two recorded rollup-drift defects, **it needs a recompute path from day one.**

**`cart.*` / `order.*`** — `subtotalAtLeast|AtMost{amountMinor,currency,basis:pre|post-discount}` · `quantityAtLeast|AtMost{qty,scope:cart|line|variant|collection}` · `containsListing{ids[]|categoryIds[]|tags[],minQty}` · `containsOnly` · `containsNone` · **`allLinesSupport{capability}`** (= the strictest-wins rule: *one prepaid-only item makes its group prepaid-only*) · `sellerGroupCount{min,max}` · `weightBetween` · `dimensionsWithin` · `hasAddonSelected{addonId}` · `order.statusIn` · `order.paymentStatusIn` · `order.hasShipmentCount` · `order.ageSincePlacedWithin{hours}` · `order.isWithinReturnWindow{days,basis}` · `order.wasPaidWith{methods[]}`.

**`listing.*` / `store.*` / `stock.*`** — `listing.typeIn{types[]}` 🛑 *(exists ONLY to express an allowlist row; refused inside a mechanism's condition tree — enforced as a validation rule on the row's `scope`, and worth its own audit, because this is the one predicate that can reintroduce `listingType ===` as config)* · `listing.supportsCapability{capability}` · `listing.fieldEquals|Matches|IsSet` · `listing.priceBetween` · `listing.isPublished` · `listing.isVisibleTo{audience}` · `store.hasCapability` · `store.isVerified` · `store.hasSubscription{planId}` · `store.ratingAtLeast{min,minReviews}` · `stock.availableAtLeast{qty,policy}` · `stock.isBackorderable` · `stock.locationServes{regionFrom}`.

**`time.*`** — `withinWindow{startsAt,endsAt,timezone}` · `afterwards|before{at,timezone}` · `withinRecurring{daysOfWeek[],fromTime,toTime,timezone}` · `notOnBlackoutDate{calendarId}` · **`businessHoursElapsedAtLeast{hours,calendarId}`** (an SLA must be business-hours aware or every weekend breaches). 🛑 Explicit `timezone` on every one; **the clock is the server's**.

**`geo.*`** — **`regionAllowed{allow[],deny[],basis:shipping|billing|ip,level:country|state|pincode}`** (the owner's named example) · `countryPairIs{origin,destination}` (tax resolution is always by country pair) · `withinServiceablePincodes{setId}` · `jurisdictionRequires{requirement}` · `ipInRange{cidrs[]}` · `ipCountryMismatchesAddress` ⚠ `UNKNOWN` behind a VPN — **do not let this one deny**.

**`channel.*`** — `isOneOf{channels[]: web|mobile|app|pos|whatsapp|api}` · `appVersionAtLeast{version}` · `hostIs{hosts[]}` · **`isServerSide`** 🛑 *the money-path guard: a policy may require it and refuse to evaluate client-side* · `userAgentMatches{pattern}` (cost-capped).

**`loyalty.*` / `entitlement.*` / `quota.*`** — `loyalty.tierIn` · `loyalty.balanceAtLeast{coins}` · `loyalty.redeemableShareAtLeast{share}` · `entitlement.hasBoolean{featureKey}` · `entitlement.configAtLeast{featureKey,min}` · `entitlement.hasCredits{featureKey,min}` · `quota.usageUnder{meterKey,limit,resetPeriod,resetAnchor}` · `quota.rateUnder{key,limit,windowSeconds,scope}` · `quota.redemptionsUnder{promoId,limit,perCustomer?}`.

**`payment.*`** — `methodAllowed{method}` · `isPrepaid{method}` · `requiresCapture{method}` · **`requiredForAction{action}`** (the owner's `paymentRequired`) · `otpSatisfied{thresholdMinor}` · **`gatewaySignatureVerified`** 🛑 never configurable to false · **`amountMatchesServerQuote{tolerance:0}`** · `currencyIs{currencies[]}`.

**`content.*`** — `reviewStatusIn{statuses[]}` · `mediaCountBetween{min,max,kinds[]}` (currently hardcoded Diwali numbers) · `wordCountAtMost{max,field}` · `passesModerationScore{maxScore,provider}` · **`fieldsPresent{paths[]}`** — the one JSON Logic op worth lifting verbatim, because `missing_some(2,[…])` (*"at least 2 of these"*) has no clean predicate equivalent.

**`policy.*` (composition leaves)** — **`inSegment{segmentId}`** 🛑 *a named, reusable condition tree stored once and referenced — the single highest-leverage composition primitive, because it is what stops the same five clauses being pasted into forty rows* · `prerequisiteSatisfied{policyId,expectVariant?}` (LD prerequisites → `PREREQUISITE_FAILED`) · `always` / `never` (the explicit kill switch, and the only safe default) · **`alwaysUnknown`** 🛑 *a test fixture — it is how you PROVE `onUnknown` is wired. This project has already shipped a green checker that could not go red.*

## 2.5 COMPOSITION — two layers, deliberately

**Layer 1, inside one policy row**: `all` / `any` / `none`, Kleene three-valued, **order-independent**. `none` rather than a loose `not` — Flagsmith ships ALL/ANY/NONE for a UX reason: a negation wrapping a subtree renders as *"none of the following"*, which an admin can read; a loose `!` nested three deep cannot. `negate` on a single leaf covers the rest. **Depth cap 4** (reuse the existing closed decision).

**Layer 2, across policies**: a combining algorithm declared **per gate** (XACML's four; Keycloak's `UNANIMOUS`/`AFFIRMATIVE`/`CONSENSUS`).
🔴 **`deny-overrides` / `unanimous` is the default and the ONLY option on the money path and the permission path.** Cedar's guarantee, stated as your own rule: **deny by default, and a `forbid` always beats a `permit`.** `permit-overrides` is allowed on **display** gates only, named explicitly on the gate, never inherited.

🛑 **`forbid` subsumes three existing deny mechanisms.** `UserSoftBan {action,target,expiresAt,bannedBy}` *is* a forbid row with a condition and an expiry; `paymentMethodRules.disabled` is a platform-scope forbid; the marketplace kill switch is a third. And the settled precedence `platform.disabled ? OFF : (listing ?? store ?? platform.default)` **is exactly forbid-overrides-permit plus most-specific-permit-wins.** The model is already right — it is not named or shared.

🛑 **NO FORWARD CHAINING. No rule may write a fact another rule reads.** Drools exposes `no-loop`, `lock-on-active`, `agenda-group`, `activation-group` and `salience` *specifically because* forward chaining re-triggers — and this project **already has that exact outage shape recorded**: order write → trigger → notify → invoice write → trigger. An inference engine would institutionalise it. Evaluate **once per decision, against an immutable context snapshot**. If a second pass is ever genuinely needed, bound it at a declared max rounds with a stable fixpoint check — never `salience` tuning.

## 2.6 Two rows nothing above gives you for free

- **CONTEXT SCHEMA as a versioned row.** Unleash has declared context fields; LD has context kinds; **Cedar validates policies against a schema before deploy**. Without a declared typed context there is nothing to validate an authored rule against and nothing to populate the param editor's dropdowns. 🛑 **Validate at author time AND re-validate at read time** — a Firestore row outlives the deploy that wrote it.
- **DATA-SOURCE row per namespace**, carrying a **cost tag and a batch loader**. Unleash/LD dodge cost entirely by requiring the *caller* to pass a fully-built context. **Build the context once per decision, declare which predicates need which slices, and fetch each slice at most once.**

## 2.7 🛑 EVALUATION SAFETY — the mechanisms, by system

**Slow / unbounded**
- Non-Turing-complete by language design, so halting is a *language property*, not a timeout you remembered to configure (CEL: linear time, mutation-free, side-effect-free; JsonLogic: *no setters, no loops, no functions, no gotos, deterministic computation time*).
- 🛑 **Two-layer cost control: a STATIC worst-case estimate at compile time, PLUS actual cost accounted during evaluation, halting when exceeded** (Kubernetes CEL cost units).
- `--timeout` on evaluation (OPA defaults to **unlimited** — *the default is the trap*).
- A hard platform ceiling regardless of the declarative layer (Salesforce: 10s sync CPU).

**Concretely here**: cap nodes per tree **64**, depth **4**, param array length **256**, predicates per decision **200**, wall-clock per decision **50ms**. Exceeding any cap ⇒ `UNKNOWN` + `onUnknown`, **never a throw**. ⚠ `REGEX` is the one leaf with catastrophic-backtracking risk — length-cap the pattern, compile it **once at validation time**, refuse a nested quantifier.

**Reading data the author should not see** — the mechanism is architectural, not a check:
1. 🛑 **The author cannot fetch at all.** CEL is evaluated in-process and *cannot do joins or fetch data*; the HOST builds the context, the expression only reads it. Unleash/LD are the same by construction.
2. 🛑 **A builtin ALLOWLIST, versioned as a capabilities file.** OPA's older `WithUnsafeBuiltins` **denylist was bypassable** (the `with` keyword could mock a restricted function back into reach, GHSA-f524-rf33-2jjr) and was replaced by the capabilities allowlist — **independent confirmation of the allowlist-never-denylist rule this project learned on `PATCH /api/account/[userId]`**.
3. **A context slice is fetched only if the DECISION SUBJECT may read it, not if the AUTHOR may.** A seller authoring `history.purchaseCountInWindow` on their own listing must not make the platform read another store's order history. Each namespace declares a read scope; an out-of-scope slice is `UNKNOWN`.
4. 🛑 **A predicate returns a VERDICT, never the data it read.** `history.purchaseCountInWindow` returning the *count* to a client is the same offline oracle as the three recorded blind-index leaks.
5. **Money-path policies require `channel.isServerSide`** and are re-resolved server-side with the server's own numbers.
6. Choose fail-open vs fail-closed **explicitly** — OPA's `--strict-builtin-errors` default is the permissive one. That is what `onUnknown` is for.

**Keeping an admin-authored rule evaluatable**: validate on write against the context schema and **refuse the save** (Cedar, Salesforce formula builder put the error in the editor) · re-validate on read, unknown id → `UNKNOWN` + an **admin drift screen** (the same shape as the read-only PII CMS) · **dry-run against a sample context before activation**, showing the per-leaf verdict and which leaf decided (Keycloak's evaluator; LD's reasons `PREREQUISITE_FAILED`/`RULE_MATCH`/`TARGET_MATCH`/`FALLTHROUGH`/`OFF`/`ERROR`) · **store a decision trace** — on a money path this is not observability, it is **the record of why this buyer was charged this** · **segments** so a clause is authored once · **templates with slots** (Cedar `?principal`/`?resource`) so the admin fills a parameter, not a policy body · **`publicWording` on the row**.

---

# 3 · THE RESOLVER CATALOGUE

## 3.0 🛑 ONE ENVELOPE FOR EVERY RESOLVER — adopt before writing the first one

```
Resolution<T> = {
  value: T,
  reason: "static"|"inherited"|"targeting_match"|"split"|"cached"
        |"disabled"|"default"|"stale"|"degraded"|"error"|"unknown",
  source: { level: "instance"|"type"|"store"|"platform"|"app"|"code-default", id? },
  errorCode?: "NOT_FOUND"|"TYPE_MISMATCH"|"CONTEXT_MISSING"|"UPSTREAM_UNAVAILABLE"|"PARSE_ERROR",
  degraded?: true,
  variesBy: string[],      // cache contexts: host, locale, role, store, currency…
  tags: string[],          // cache tags for invalidation
  trace?: Step[]           // only when explainX() was called
}
```

Three reasons, each grounded in a failure already recorded here: a **degraded read looked identical to no data** (missing index → `200 {items:[]}`); **"no rows" / "not permitted" / "upstream unavailable" had to be three different answers**; and `resolvePaymentMethod` **shipped with no callers** — *a resolver you can EXECUTE and whose answer carries a reason is testable by executing it*, which is the only acceptance test that found those bugs.

🛑 **Every `resolveX()` has an `explainX()` twin, and ONE admin screen renders the trace.** AWS ships the IAM Policy Simulator for exactly this; OpenFeature puts `reason`+`variant` in every response; Grafana ships a query inspector. **Without an explainer a four-level precedence chain is unsupportable.**
Two resolvers already prove the need and solve it only locally: `MethodDecision` carries three reasons and **nothing renders them**; `WidgetBlockReason` carries 11 and edit mode retains blocked widgets so an editor *can* be told why. **Generalise that shape; don't re-derive it 15 times.** `fees/explain.ts` is proof this team already writes the hardest part — the human sentence — well.

## 3.1 The table

| # | Resolver | Inputs | Precedence rule | Unknown → | Status |
|---|---|---|---|---|---|
| 1 | `resolveIdentity` | cookie → session → user → roles → store memberships → impersonation | session cookie is authoritative | **anonymous** | half — ⚠ **must hydrate the CLIENT from the shared cookie**; Firebase client state is per-origin, which is why chrome says "Sign in" while `/api/auth/me` returns the admin |
| 2 | `resolveTenant` | host, path | **resolve portals from the PATH, never `headers()`** (headers in a root layout make every page dynamic) | the default app | **half — three functions today** (`portalForPath`, `resolveCanonicalSite`, `resolveSiteConfig`) |
| 3 | `resolveFlag` | flagKey, **typed default**, context | OpenFeature/LD order: off → prerequisites → individual targets → rules → **percentage split on a stable `targetingKey`** → fallthrough | **the caller's typed default** + errorCode, variant unset | missing — 🛑 *the best-specified degrade contract in the industry; copy the shape even for non-flag resolvers* |
| 4 | `resolveConfig` | key, `{platform,store,listing,user,host,locale}` | `platform.disabled ? OFF : (listing ?? store ?? platform.default)` — **`??` never `\|\|`**; VS Code adds one rule worth stealing: **a per-bundle-specific override beats a broader-scope non-specific setting** — decide it explicitly or two sessions implement it differently | the default on the key's registry row | half |
| 5 | `resolveCapability` | key, bundle, instance, platform, actor | `platformDisabled ? excluded : (typeAllows && (instance ?? typeDefault))` — an **INTERSECTION**, three-valued | **`false`/excluded uniformly**, `reason:"unknown"`, admin drift screen | 🛑 **`capabilityFor` RETURNS A DIRECT INDEX WITH NO FALLBACK — an unknown stored slug returns `undefined` and `cartRequiresShipping` does `getCap(it).supportsShipping` → TypeError. The degrade rule is broken in the registry the architecture is named after.** |
| 6 | `resolveAccess` | actor, action, resource, context | **explicit `forbid` first, anywhere, wins** → an explicit `permit` must exist → **implicit deny** (AWS IAM). Platform policy = SCP (narrows only), role = identity policy, store membership = resource policy, soft-bans = explicit deny. Trinary `allowed\|forbidden\|neutral` with `orIf`/`andIf` (Drupal) — ⚠ **`orIf` makes `allowed+neutral` = allowed, `andIf` makes it neutral; pick one combinator per seam and write it down** | **neutral → deny**, with a distinguishable reason | half — `hasPermission` is a set-membership test; **ownership has no expression at all** |
| 7 | `resolveCondition` | ConditionNode, context | §2 — Kleene, order-independent, per-row `onUnknown` | `UNKNOWN` → `onUnknown` | 🛑 **MISSING ENTIRELY** |
| 8 | `resolveRule` | ruleSetId, ruleKey, inputs, context | **SAP's condition technique, 1:1**: procedure = ordered steps · requirement per step (*a step that does not apply is SKIPPED, not failed*) · condition type = rule kind · **access sequence = ordered lookups, first hit wins** (listing→store→platform) · condition table = the keys a rule may key on (*declare them or you cannot index*) | the rule set's declared default, `degraded:true`, surfaced. **Unknown rule KIND in a money set → refuse** | half |
| 9 | `resolveLineTransform` | cart lines | expand/merge **FIRST** — bundle → components, configurator → kit (Shopify Cart Transform runs before everything) | no expansion, line unchanged | half — **inlined in 3 price branches** |
| 10 | `resolvePrice` | listing, variant, qty, buyerContext, cartContext | 9 ordered stages: base → **price list / contextual** → **volume breaks + quantity rules** → contract/accepted offer → promotions (**product → order → shipping**, with `combinesWith` per class) → coins (a **liability settlement**, not a discount) → fees → tax → rounding/presentment. **Most specific catalog wins; ties → the LOWEST price** (Shopify's documented tie-break — pick one or two sessions disagree) | 🛑 **no resolvable price ⇒ NOT PURCHASABLE.** Hide the buy affordance, `NOT_FOUND`. **Never 0, never the base price silently.** Unknown discount kind ⇒ skip it and mark the breakdown `degraded` so the UI refuses checkout rather than undercharges | **half — and it returns a NUMBER, not a `PriceBreakdown`** |
| 11 | `resolveAvailability` | listing, variant, qty, location, channel, **date** | capability `isTracked` → policy (continue-selling/backorder/preorder) → per-location **ATP** → channel buffer (**ATS**) → reservation TTL. 🛑 **One interface over a COUNT and a SLOT SET — this is what makes the hospital need zero new mechanisms** | **unavailable** unless the bundle declares `isTracked: none` | half (count only) |
| 12 | `resolveFulfilmentPlan` | lines, destination | group lines → pick locations → honour constraints (Shopify Order Routing + Fulfillment Constraints) | single default location | missing |
| 13 | `resolveDeliveryOptions` | cart/seller group, destination | **delivery profile → zone match → rate providers** (flat · price-based · weight-based · **carrier callback**), then filter/rename/sort. A rate appears only if the destination is in a zone **and** the required product data exists. Buyer chooses; **server re-resolves and charges its own number** | 🛑 **block checkout: "no rates for this address". NEVER free shipping.** Carrier timeout → configured static rate marked `degraded`, or refuse — **per profile, in config** | half |
| 14 | `resolveTax` | lines, origin, destination, buyer status, tax codes, date | four independent inputs (Avalara): **place of supply** (origin- vs destination-sourced, varies by jurisdiction) · **nexus/registration** (config, the engine cannot determine it) · **product taxability code** · **buyer exemption**. Provider by **country pair** | 🛑 **NEVER silently zero-rate — the most expensive possible degrade.** Either refuse ("tax cannot be determined") or apply the fallback rate and mark every number **`estimated: true` all the way to the invoice**. Per jurisdiction, in config | half |
| 15 | `resolveFee` | order, units, config | 🛑 **scope is per-ORDER**, marginal taper, **composite = ONE unit** | **refuse to quote; do not charge 0** | have |
| 16 | `resolveTenderOptions` | cart, buyer, store, listings | platform ceiling + buyer deny run **cart-wide, before any stock is touched**; store and listing run **per seller group**; **within a group every listing is checked and the STRICTEST wins** | `UNKNOWN_METHOD_CAPABILITIES` — conservative on all three axes, each justified at the line | ✅ **have — the model.** Red-able: `??`→`\|\|` sabotage reports 2/16 |
| 17 | `resolveMoneyPlan` | order, method, selling plan | authorize/capture schedule + deposit + balance trigger + split + settlement delay as **one object** | refuse | missing |
| 18 | `resolveValidation` | bundle schema + instance rules + actor | 🛑 **ONE plan consumed by BOTH client and server.** *Validation is config too* — a hardcoded `.max(4)` silently beat the per-event check | the strictest known constraint | half (`checkEntryFormField` is shared ✅, 5 rules) |
| 19 | `resolveFields` | formId/bundle, instance, actor, data-so-far | three layers: **FHIR profiling** at the type level (cardinality narrowing + `mustSupport` — ⚠ *`mustSupport` is NOT cardinality; conflating them is why "required" fields end up unfillable*) + **JSON Schema** `dependentRequired`/`if-then-else` for *required* + **JSON Forms rules** for per-instance show/hide/enable | unknown field type → **safe read-only representation, VALUE PRESERVED on round-trip**. Unknown effect → ignore, *unless* money/consent-tier → fail closed to visible+required | half — **three partial implementations** (`resolveFieldUiMeta`, `fieldVisibility`, `partitionRequiredRules`) |
| 20 | `resolveAllocation` | order, locations | **reserve** (checkout) vs **allocate** (order) are two commits over the same units | no allocation; order held | half |
| 21 | `resolveTransition` | entity, state, actor | state-machine guard honouring actor · permission · `requiresMechanism[]` · `blockedByMechanism[]` · gates · ledger | 🛑 **no transitions offered (read-only), never "all"** | half — **the rich definition exists and has zero readers** |
| 22 | `resolveRefundEligibility` | order, state, rules | gate chain | **not eligible + a reason string** | half |
| 23 | `resolveApproval` | entity, config | auto half exists (`entryApproval`); the **human** half does not (approver roles, tiers, inheritance) | **manual** | half |
| 24 | `resolveTemplate` | bundle, instanceId, viewMode, host, role, device | **a specificity chain, most specific first** — Drupal's theme suggestions are the clearest form: `node--id--mode → node--id → node--type--mode → node--type → node`. So `instance → type+viewMode → type → app → platform` | next item in the chain; **the chain ALWAYS ends at a platform default that cannot be missing**. Unknown widget type inside a resolved tree → nothing in production, a **labelled stub in admin**, `degraded` | half |
| 25 | `resolveWidgetTree` | regions, defs, instances, actor | allowlist + depth + cycle + permission + content tags | ✅ **11 named `WidgetBlockReason`s; `unknown-type` KEEPS the instance, renders nothing, pushes a `problem`** | ✅ have (Drupal `Broken` equivalent) |
| 26 | `resolveTemplateMerge` | upstream, **forkPoint**, overrides, ownership | the algorithm in §3.2 | conflict → `flagForReview` | 🛑 **the single largest missing resolver** — today's 2-way merge is correct and **is the ceiling** |
| 27 | `resolveQuery` | bundle, filters, sort, facets, pagination, actor | declare capabilities per field as **Algolia makes you**: `searchableAttributes` (**order IS relevance**), `attributesForFaceting` with `filterOnly()`/`searchable()`, `customRanking` as a tie-break, **a replica index per sort order** (a sort order is a different index, not a flag) | unknown filter → **dropped AND reported in `appliedFilters`** so the UI can say "ignored", never silently return everything. Unknown sort → default, `degraded` | 🛑 half — **and `UPSTREAM_UNAVAILABLE` must be distinguishable from an empty result; the acceptance test writes a row and reads it back** |
| 28 | `resolveRanking` | items, rule set | rule + tieBreak + `publicWording` | the set's default rule | ✅ have |
| 29 | `resolveLocale` / `resolveMessage` | requested[], available[], namespace, key | **RFC 4647 Lookup** — truncate subtags from the end (`de-CH-1996 → de-CH → de`) → default → `i-default`. Keep locale and message resolution **separate** | locale: truncate → region-neutral → default. **Key: THROW in dev/CI (next-intl's loud `MISSING_MESSAGE` is right for a build-time catch and wrong for a public page), humanised last segment in production + `degraded`.** Never a blank, never the raw dotted key to a customer | half |
| 30 | `resolveFormat` | locale, measure | CLDR + **root inheritance** | CLDR root | missing |
| 31 | `resolveCurrency` | market, buyer | presentment currency + minor units + FX snapshot + rounding | **refuse to display a converted price; show the base currency** | missing |
| 32 | `resolveMeasure` | value, unit, packaging | UOM conversion + case qty | **refuse** | missing — **wholesale needs it TODAY; hospital dosage needs it** |
| 33 | `resolveToken` | tokenPath, mode, brand, density | DTCG: `$value`/`$type`, alias `{group.token}`, composite tokens | unknown `$type` → **skip the token and let the CSS cascade keep the inherited value; do NOT infer.** Unresolvable alias → up the group chain → a hardcoded safe value. **Circular → unresolvable, detected** | half |
| 34 | `resolveMedia` | assetRef, intent{slot,aspect,orientation,dpr,formats} | instance override (**the owed portrait/landscape flag**) → slot → type → platform; origin: CDN → media host → inline. Model on **next/image** (`srcSet` from `deviceSizes`, `placeholder: blur\|empty\|dataURL`, pluggable loader) + **Drupal's REQUIRED fallback image style** — *"a safety net, not the primary solution"*. Resolve **kind** polymorphically (Hydrogen `MediaFile`): one widget, resolver picks the renderer | ✅ **a generated `data:` URI tile with no host** (`inlineMediaTile`), never a 404 chain | half — 🛑 **the render path is fixed; the PERSISTABLE path is not.** `seedPhoto()` bakes `/images/seed-tiles/<hex>.svg` into **366 call sites**, so each costs a 404 before the fallback fires |
| 35 | `resolveRoute` / `resolveCanonicalHost` | path, host, section registry, locale | 🛑 **ORDERING IS THE WHOLE RESOLVER.** Next's documented chain: `headers` → **`redirects`** → **proxy/middleware** → `beforeFiles` rewrites → filesystem → `afterFiles` → dynamic → `fallback`. **Every route trap here is a position error in that list** — `/auth/*` works as a `redirects()` entry because redirects run *before* middleware; `/media/*` broke as a rewrite because next-intl rewrote the path first. **Encode the list in the doc and TEST THE POSITION, not just the rule** | unknown section → href **unchanged and relative** to the current host. 🛑 **Never register `"/"`** — it normalises to `""`, the longest-prefix boundary check can never fire, and every local link leaves the host (measured) | ✅ have — **refuse `"/"` in `configureSectionRoutes`** |
| 36 | `resolveProvider` | capability, config | registry by capability | 🛑 **THROW AT WIRING TIME. Never fill a required slot with a stub** — blogs' `email` provider throwing is the right pattern; a Resend client with an empty key fails deep inside an HTTP layer later | have |
| 37 | `resolveNotification` | event, entity, recipients, workflow, preferences | Novu's order: **audience fan-out (a SET, not a `Record<type,audience>` — that singular map is exactly what made the seller arm a silent no-op)** → channel steps → step conditions → recipient has the identifier → **subscriber preferences at TWO levels** (global per channel + per workflow) → **critical workflows bypass both** → channel health/credential/breaker → template + **param arity and content constraints** → provider + failover → digest/throttle/quiet hours → **dedupe** | unknown channel → **drop THAT channel only, keep the rest**. 🛑 Never let a channel gate silence the whole notification. Template/arity mismatch → don't send that channel, fall through to email, log at `error` (a provider returning plain `false` is indistinguishable from an outage) | half |
| 38 | `resolveConsent` | user, purpose | | **denied** | have |
| 39 | `resolveEntitlement` | store/user, plan | | **not entitled** | half |
| 40 | `resolveQuota` | actor, action | | **deny with `retryAfter`**. ⚠ **never WRITE the cooldown on a READ** | half (with that defect) |
| 41 | `resolveJurisdiction` | listing type, buyer location | | **not permitted** | half |
| 42 | `resolveAudience` | user, segment definition | | not a member | missing |
| 43 | `resolveSeo` | entity, bundle, host | per **section**, never inherited | safe defaults; 🛑 **robots resolved per section** | half |
| 44 | `resolveNumbering` | document kind, sequence | | 🛑 **never regenerate**; and a write WE caused must not re-trigger the send | have |
| 45 | `resolveCache` | the `variesBy` + `tags` of any other resolution | | **no cache** (correct and slow) rather than wrong | missing |
| 46 | `resolveSchema` / bundle | bundleId | storage ⊕ instance cascade | the entityKind's base schema | missing |

## 3.2 `resolveTemplateMerge` — the algorithm, and the propagation matrix

```
resolve(instance):
  upstream = template@current            // structure + policy, LIVE
  base     = template@instance.forkPoint // the snapshot at clone time
  mine     = instance.overrides          // sparse, keyed by overrideKey

  for each node N in upstream, matched to base/mine BY N.overrideKey:
      upstreamChanged = upstream[N] != base[N]
      iOwn            = mine has N && fieldOwnership[N] == "clone"

      upstreamChanged && !iOwn            -> take upstream        (propagate)
     !upstreamChanged &&  iOwn            -> keep mine            (my edit survives)
      upstreamChanged &&  iOwn            -> conflictPolicy       (default: keep mine, FLAG)
      N is requiredTemplateElement        -> take upstream ALWAYS (unrelaxable)
      N.tier == "config" && iOwn relaxes  -> keep mine            (permitted relaxation)
      N absent upstream, present in mine  -> tombstone            (retained, inert)
      N.mergeStrategy == "pin"            -> keep base            (frozen)

  overlay initialContent for NEW instances only
  emit mergeReport
```

| Changed upstream | Existing clones | Source |
|---|---|---|
| **structure** (a widget added/removed/renested) | **propagate** | AEM: *"immediately applied to the resulting pages"* |
| **policy** (supports allowlist, constraints, required elements) | **propagate** | AEM: *"apply immediately to the resultant pages"* |
| a **`system`**-tier required field | **propagate, unrelaxable** | owner decision |
| a **`config`**-tier required field | **propagate, clone may relax** | owner decision |
| **initial content** (seed values) | **new instances ONLY** | AEM: *"only apply to pages created after"* |
| a node the clone has overridden | **that node's overridden keys: NO. Its unoverridden siblings: YES.** | Figma instance overrides |
| a node **removed** upstream | propagate the removal; **tombstone** the clone's override | Kubernetes |
| an **`overrideKey` renamed** upstream | 🛑 **REFUSE THE PUBLISH** — a renamed key silently orphans every clone's override, which is the exact Figma failure mode (*"if the structure, layer names or variants have changed, the update might cause the current overrides to get reset"*). **Same class as the `lotteryEntries` collection name: a data migration, not an edit** | Figma, as a defect to prevent |

🛑 **Three facts, plainly.** (1) The missing primitive is not "merge" — it is **`overrideKey` + `fieldOwnership`**; Figma and Kubernetes converged on it independently from opposite directions, Gutenberg has the key but not the ownership, **Drupal has neither, which is precisely why its Layout Builder override is a HARD FORK** (*"once a Layout Override is saved, the node will no longer be impacted by changes to the Layout Defaults"*, and the only remedy discards every customisation — **do not copy this**). (2) A two-way merge **cannot delete anything**; store `forkPoint` from day one. (3) Kubernetes SSA **reports conflicts rather than silently resolving them** — copy that.

## 3.3 Dependency DAG — build it as a DAG or you will get a cycle

```
resolveIdentity ─┐
resolveTenant ───┼→ resolveFlag → resolveConfig → resolveCapability ─┬→ resolveTemplate → resolveFields
resolveLocale ───┘                                                   ├→ resolveAccess  (gates every surface)
                                                                     └→ resolveLineTransform → resolvePrice
                                                                              ↓
                                                        resolveAvailability → resolveFulfilmentPlan
                                                                              ↓
                              resolveDeliveryOptions → resolveTax → resolveFee → resolveTenderOptions
                                                                              ↓
                                                    resolveValidation → COMMIT → resolveAllocation
                                                                              ↓
                                                    resolveTransition → resolveNotification (post-commit)

resolveToken → render   ·   resolveMedia → render   ·   resolveQuery → list surfaces   ·   resolveCache wraps all
```

🛑 **Shopify's documented Function execution order is a free, battle-tested dependency graph. Adopt it.** It encodes dependencies you would otherwise derive from failures: you cannot price a bundle before expanding it; you cannot offer a delivery option before you know which location ships it.

## 3.4 🛑 THREE REGISTRIES, SAME KEY, THREE DIFFERENT UNKNOWN BEHAVIOURS

| Resolver | Unknown type → | Verdict |
|---|---|---|
| `capabilityFor` | **TypeError** (direct index, confirmed) | 🛑 wrong |
| `getListingRule` | `?? CHECKOUT_RULES.standard` → `purchaseable: true`, `cartEligible: true`, **`refundPolicy: full+partial`** | 🛑 **WRONG DIRECTION ON A MONEY PATH** — an unknown type becomes fully purchaseable with full refunds |
| `eventTypeHasMechanism` | `false` for unknown type **and** unknown mechanism | ✅ right |

**One of those is right. Fix both others before anything is built on top, and keep `UNKNOWN_METHOD_CAPABILITIES` as the template** — every field justified at the line by what it costs when wrong.

---

# 4 · THE UI CATALOGUE

Kind: **C** container · **L** leaf · **S** slot-container (NAMED regions) · **P** provider (in the tree, config, renders no box).

## 4.1 Layout & structure
**have**: `Div`¹ `Layout` **`Card`**ˢ `Divider` `HorizontalRule` `Semantic` `Responsive` `ResponsiveView` `HorizontalScroller` `OverflowRow` `SplitTile` `StatsGrid` `FormGrid` `Fieldset`ˢ `CollapsibleSection` `Accordion` `Details` `Tabs`ˢ `MediaTabs` `StickyToolbar` `TabBarShell` `StackedViewShell` `DetailViewShell`.
**missing**: `Stack`/`Inline` as named primitives · `Grid`/`SimpleGrid`/`Wrap` · `AspectRatio` · `Bleed` · `ScrollArea` · `Splitter`/`Resizable` · `Toolbar` · `Timeline` · `Sticky`/`Affix` · `Masonry` · `OverflowList`/`Truncate` · `PageLayout`ˢ + `PageHeader`ˢ as separate primitives (Primer's split is the one to copy — **chrome is a widget tree too**, which is why chrome was adopted per-app by hand and `shopHref` rendered only on mobile).

## 4.2 Navigation
**have**: `Breadcrumb` `Menu` `Dropdown` `Pagination` `TablePagination` `StepperNav` `NavbarChevron` `TextLink` `Anchor` `SignInLink` `SkipToMain` `ViewToggle` `SortDropdown`.
**missing**: `Menubar` · `ContextMenu` · `SegmentedControl`/`ContentSwitcher` · `NavList`/`Sidebar` as config · `TableOfContents` · **`CommandPalette`/omnibox** (the dashboard decision calls for one field that navigates AND searches) · `BottomNavbar` as a widget row · `Tour`/`Spotlight`.

## 4.3 Data display
**have**: `Typography` `Badge` `StatusBadge` `RoleBadge` `Avatar` `AvatarDisplay` `MediaAvatar` **`DataTable`**ˢ (+`columns/`) `SpecTable` `SummaryCard` `ItemRow` `Progress` `ProgressBarFill` `StarRating` `RatingDisplay` `CountdownDisplay` `Skeleton` `EmptyState`ᶜ `Chart`+`chart-spec` `FlowDiagram` `Kbd` `Quote` `PendingValue`.
**missing**: `DescriptionList` · `Stat`/KPI with period-over-period delta · `Calendar` · `TreeView` · `Timeline` · `QRCode`/`Barcode` · `Clipboard`/`CopyButton` · `ColorSwatch` · `Meter` · **per-widget skeleton shapes** (Polaris ships **seven** variants, Primer four — one generic `Skeleton` is not enough; loading shape is per-widget **config**, i.e. `loadingState` in block supports).
**charts** — adopt Grafana's published taxonomy as the vocabulary: time series · bar (stacked/grouped/horizontal) · pie/donut · **stat (big number + sparkline)** · bar gauge · gauge · table · heatmap · histogram · **state timeline** · status history · candlestick · node graph · geomap · trend · flame graph; composition parts: legend · axis · tooltip · **threshold/annotation overlay** · **value mappings** · time-range picker · refresh control · drilldown link · **panel repeat over a variable**. Plus commerce/BI: funnel · sankey · treemap · radar · **waterfall** (money attribution) · pivot · cohort grid.

## 4.4 Data entry
**have**: `Input` `Textarea` `Select` `PaginatedSelect` `Checkbox` `Radio` `Toggle` `Slider` `DateInput` `OtpInput` `TagInput` `FilePickerButton` `RichTextEditor` `DescriptionField` `Repeater` `Form` `FormField` `FormActionBar` + `forms/Field*`.
**missing**: **`Combobox`/`Autocomplete`** · `MultiSelect` · `Cascader`/`TreeSelect` · `Transfer` · `PinInput` as a generic · `NumberInput` · `MaskInput` · `PhoneInput` · `InlineEdit`/`Editable` · `ToggleGroup` · `SegmentedControl` · `ColorPicker`/`ColorInput` · **`FontPicker`** and **`ColorSchemePicker`** (Shopify's section-schema input types — merchant-facing theming as a *field*) · `DatePicker`/`DateRangePicker`/`TimePicker`/`DateTimePicker` · `Dropzone` as a widget.
**mandatory here and in no design system studied**: **`QuantityStepper` with rules** (⚠ **correction to the diff: it HAS `min` and `max` — what it lacks is `increment`/step, hardcoded ±1**, so MOQ floors/ceilings are expressible and **case packs are not**) · **`MoneyInput`** (currency + minor units + tax mode) · **`MeasureInput`** (value + UOM) · **`AddressField`** (country-conditional subfields) · `Captcha`/honeypot · `SignaturePad` · `BarcodeScannerInput` · `HiddenField`/derived field (Builder `hideFromUI` — set by code, not editable).

## 4.5 Feedback & status
**have**: `Alert` `Toast`+`toast-context` `Spinner` `PageLoader` `NavigationLoader` `Skeleton` `EmptyState`.
**missing**: `Banner`/`SectionMessage` · `ProgressCircle`/`RingProgress` · `LoadingOverlay`/`Blanket` · `Result` · `Popconfirm` · **`Watermark`** as a render-time overlay widget (config exists; the widget does not) · `ExceptionList`.
🛑 Carbon documents **read-only** and **disabled** states as first-class *patterns*. Here they are **block supports**, not components.

## 4.6 Overlay
**have**: `Modal` `SideModal` `Dialog`+`dialog-shell` `Drawer` `SideDrawer` `FilterDrawer` `Tooltip` `Scrim` `ConfirmDeleteModal` `UnsavedChangesModal` `LoginRequiredModal` `QuickCreateModal` `RecordDetailModal` `FallbackShell` `overlay-context` `TopBannerPortal` `MediaLightbox` `ImageLightbox`.
**missing**: **`Popover`** · `HoverCard` · `AlertDialog` as a distinct primitive · `InlineDialog` · `AnchoredOverlay`/positioning engine · **`Quickview`** (Tailwind's ecommerce block) · `CommandPalette`.

## 4.7 Media
**have**: `MediaImage` `MediaVideo` `MediaLightbox` `ImageGallery` `ImageLightbox` `ImageMosaic` `DetailPageGallery` `HotspotMarker` `Iframe` `Icon` `IconBox` `SiteLogo` `SiteMark` `BackgroundRenderer` `DynamicBgDiv`.
**missing**: 🛑 **`MediaFile` — ONE leaf whose renderer is resolved from the asset's own type** (Hydrogen React). *The single most valuable idea in the UI research*: adding a media kind becomes a **resolver row, not a new widget**. Also `ModelViewer` (3D) · `AudioPlayer` · `DocumentViewer`/PDF · `Map` · OG-image generator as a widget · `Gallery` with thumbnails + zoom as **one** configured widget (three galleries exist today).

## 4.8 Commerce widgets
**have**: `GatedPrice` `PriceDisplay` `QuantityStepper` `ClaimCouponButton` `VacationBanner` `PosterCard` `AdminFilterFacets` `ActiveFilterChips` `FilterChipGroup`.
🛑 **`PriceDisplay` and `GatedPrice` render an AMOUNT, not a `PriceBreakdown`.** *"Price IS a widget"* is right; *price is a `number`* is not — tax mode, fee lines, coins-as-liability and `estimated: true` have **nowhere to live**.
**missing, and needed for TODAY's verticals**: `TierTable` (🛑 **must render marginal vs volume DIFFERENTLY or the number looks wrong**) · `QuantityRules` display (min/max/increment/case qty) · `PriceListBadge` ("your contract price") · `TaxModeToggle` (wholesale must show ex-tax) · `VariantPicker` · `AddToCart`/`BuyNow`/express-pay as widget rows · `StockBadge` (**three states: available / held-elsewhere / unavailable**) · `AvailabilityByLocation` · `PreorderNotice`/`BackorderNotice` · `StoreSelector`/`PickupLocator` · **`DeliveryDatePromise`** · `ShippingEstimator`/`ShippingOptionPicker` · **`TenderSelector`** (ordered, **with reasons for absence** — `MethodDecision` already returns the reason and nothing renders it) · **`SplitTenderAllocator`** · `CoinsTenderWidget` · `GiftCardField` · `CouponField`/`DiscountSummary` · `CartSummary`/`OrderSummary`/**`FeeBreakdown`**/**`TaxBreakdown`** (fee and tax lines are **rows, not strings**) · `CheckoutStepper`/`AddressForm` · **`PONumberField`** · **`CreditTermsNotice`** · **`QuickOrderPad`** / CSV bulk-add / **`RequisitionList`** / `ReorderFromHistory` · `ReviewSummary`+`RatingBreakdown`+`ReviewList`+`ReviewForm` · `Wishlist`/`Compare`/`RecentlyViewed`/`RecommendationsRail` · **`FulfilmentTimeline`** (N parcels × N statuses — **the data already exists**) · `InvoiceBlock` · **`ReturnWizard`** (the three-object model: intent → work → parcel) · `ExchangeSelector` · **`QuoteThread`** (RFQ ↔ quote, validity countdown) · **`ApprovalQueue`** · `ExemptionCertificateForm` (reason code + jurisdiction + upload) · `LedgerStatement`/`PayoutStatement` · `AgeGateModal` · **`JurisdictionBlocker`** (🛑 **must say WHY**) · `LotSerialEntry` · `SlotGrid` · `TrackingTimeline`.

🛑 **The two highest-leverage missing widgets**: **`DepositDisclosure`** (charged now vs balance, and *when*) and a **`PurchaseOptionSelector`** — Shopify's selling-plan control is the one place subscription, pre-order, try-before-you-buy and deposit all surface. **It is the single widget that most reduces per-type screens, and this tree has none.**

**🛑 Commerce-contaminated names that would NOT serve another vertical**

| Today | Should be | Why |
|---|---|---|
| `BaseListingCard` | `EntityCard` + a `shape` | a hospital has records/encounters, not listings |
| `ListingLayout` · `ListingToolbar` · `ListingFilterDrawer` · `ListingDetailShell` · `SlottedListingView` | `CollectionLayout` · `CollectionToolbar` · `CollectionFilterDrawer` · `DetailShell` | **five components named for one domain**, against the A19r rule: *one composed view per SHAPE, never per TYPE* |
| `ClaimCouponButton` | `ActionButton` with an action row | a promo verb as a component |
| `VacationBanner` · `PosterCard` | `Banner` · `MediaCard` variations | seller- and event-specific |
| 3 × filter-chip components | one | one idea, three names |

## 4.9 Utility / provider
**have**: `Motion` `HandModeRow` `toolbar-collapse` `row-collapse` `tabs-overflow` `surface-tokens` `design-pack` `consent/`.
**missing**: `ThemeProvider`/`LocaleProvider`/**`DirectionProvider`** (RTL) · `Portal` as a primitive · `FocusTrap`/`FocusManager` · `ScrollLock` · **`VisuallyHidden`** · `ClientOnly`/`NoSSR` · **`ErrorBoundary`** · `AnalyticsTracker` as a widget row · JSON-LD emitter as a widget row · `Slot`/`asChild` · an **`XCSS`-style constrained escape hatch** (Atlassian's — the *only* sanctioned raw-CSS door).

## 4.10 🛑 BLOCK SUPPORTS — the universal per-instance knob list

**Every widget row accepts these regardless of type.** Anything not on this list becomes a code change later — that is the completeness risk the owner named. Gutenberg's `supports` accreted over six years with **inconsistent attribute storage** (some write into a `style` object, some into top-level attributes, some into class names) and the migration tax is permanent. **This is the one chance to declare the set up front.**

⚠ **Today `WidgetInstance` carries `span: "full"|"pair"|"third"|"quarter"` and `state`. That is all.**

**Identity & lifecycle** — `id` · `type` · `schemaVersion` · `name`/`label` (**renaming** an instance) · `lock: {move, remove, edit}` · `multiple`/max per page · `inserter` visibility · `deprecated`/`alias` · `anchor` id + copy-link · `customClassName` · `testId`.

**Placement & composition** — `region`/`slot` · `order` · `span`/`colSpan`/`rowSpan` · `requiresParent` (**with a message**) · `allowedChildren` · `maxChildren` · `canHaveChildren` · **`noWrap`** · `nestingDepthCap` (4) · `defaultChildren`/`preset` · **`repeatOver`** · `listView`.

**Visibility & gating** — the richest group, and the one with a trap — `visible` · **`visibleIf: <ConditionNode>`** · `enabledIf` · `readonly` · **`requiredPermission`** · `audienceSegment` · `schedule: {from,to}` · `featureFlag` · `locales[]` · **per-breakpoint `deviceVisibility`** · `hideIfEmpty` · **`emptyBehaviour: hide | placeholder | message`**.
🛑 **`renderMode: "not-rendered" | "not-visible"` must be EXPLICIT and PER-INSTANCE.** Plasmic separates conditional rendering from `display:none` deliberately: `not-visible` still ships the markup (**SEO reads it; a crawler sees a price you meant to hide**), `not-rendered` costs a hydration-mismatch risk. Defaulting this per widget *type* instead of per instance is a bug factory.

**Layout** — `align` + `alignWide` · `justify` · `verticalAlignment` · `orientation` · `wrap` · `gap`/`blockGap` · `padding` · `margin` · `dimensions: {width, height, minHeight, aspectRatio}` · `position: sticky` · `overflow` · `bleed` · `zIndex`.

**Style & token** — `color: {text, background, gradient, link, button, heading}` · `colorScheme` · `typography: {fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textAlign, textTransform, textShadow}` · `border: {width, style, radius, color}` · `shadow` · `filter`/duotone · `background: {image, size, position, repeat, clip}` · `elevation` · `density` · `tone: info|success|warning|critical|accent` · `variant` · `size` · `motionPreset` · `defaultStyles`.
⚠ **Every one of these is a TOKEN REFERENCE, not a raw value** (DTCG `{group.token}`) — otherwise theming is dead on arrival.

**Responsive** — a per-breakpoint override map for any of the above · mobile-specific `order` · `mobileOnly`/`desktopOnly` (already needed once, for `SidebarLayout.mobileOnly`) · container-query opt-in.

**Accessibility** — `ariaLabel` · `role` · **`headingLevel`** (🛑 so a card's title level is config — otherwise every reuse breaks the heading outline) · `tabIndex` · `altTextRequired` · `describedBy` · `lang`/`dir` · reduced-motion respect · `visuallyHiddenLabel`.

**Data binding** — `source: {queryId | endpoint | staticValue}` · `fieldMap` · `filter`/`sort`/`limit`/`offset` · `valueMap` · `format` (number/date/currency/unit) · **`loadingState: skeleton|spinner|none|previous`** · **`errorState: hide|inline|placeholder`** · `fallbackText` · `cacheTtl`/`revalidate` · `staleWhileRevalidate`.

**Behaviour** — `action: navigate|openOverlay|submit|mutate|copy|download|share` · `href`+`target`+`rel` · `confirmBefore` · `analyticsEvent` · `optimistic` · `keyboardShortcut` · **`gesture`** · `onChangeHook`.

**Governance** — `requiredByTemplate` · `editableByRole[]` · `lockedFields[]` · `editorNotes` · `docsLink` · `icon`/`screenshot` · `allowedBundles` · **`tier: system | config`**.

**SEO contribution** — `emitsJsonLd` · `headingLevel` · `robotsContribution` · `canonicalContribution` · `ogContribution`.

**Money-path specials — no design system has these; this platform must** — `priceDisplayMode: tax_inclusive|tax_exclusive` · `currencySource` · `roundingPolicy` · **`disclosureRequired`** · `feeBreakdownVisible` · **`estimatedFlag`** (anything a resolver marked `estimated` must be able to say so).

🛑 **Two implementation rules this project already paid for.** (1) **A conditional object spread into JSX is NOT excess-property-checked, so `tsc` CANNOT verify a block support is wired** — every support needs a **render-level assertion**, not a type (22/22 was verified that way once already). (2) Gutenberg's defaults are mostly `null`/`false`: **a widget DECLARES which supports it honours, and an unsupported knob present in config must be IGNORED SILENTLY, never thrown on.**

---

# 5 · THE CROSS-CUTTING ROW SHAPE

One shared header; four specialisations. **Every registry row in the system carries the header.**

```ts
/* ── THE HEADER — on every row in every registry ─────────────────── */
RowHeader {
  id:            string          // namespaced: "commerce.supportsAddToCart"
  kind:          "mechanism" | "rule" | "config" | "fact"
  label:         string
  publicWording?: string         // what a USER is told — travels on the row so
                                 // artwork and mechanic cannot drift
  description:   string          // 🛑 describe the SHAPE of what you removed,
                                 // never its VALUE (the four-time brand leak)
  schemaVersion: number
  version:       number
  since:         string
  deprecated?:   { since: string; replacedBy: string }
  aliases?:      string[]        // legacy spellings — how a rename stays safe
  enabled:       boolean
  isMoneyPath:   boolean         // ⇒ conservative degrade, server-side only,
                                 // trace stored, two-admin candidate
  isVerticalNeutral: boolean
  onUnknown:     "deny" | "refuse" | "ignore" | "fallback" | "skip"   // §0.4
  tier:          "system" | "config"        // relaxable by a clone?
  requires:      string[]        // the CLUSTER — other primitive ids
  conflictsWith: string[]
  scope:         ("platform" | "store" | "bundle" | "instance" | "party")[]
  readScope?:    string          // whose authority a data slice is fetched under
  costTag?:      "free" | "one-read" | "aggregate" | "network"
  usedSubjects?: string[]        // indexable: "which rows read purchase history?"
  requiresTwoAdminApproval?: boolean
  docsLink?:     string
  auditNote?:    string
}

/* ── 1 · CAPABILITY BINDING (header + ) — a bundle's allowlist entry ── */
{ bundleId, primitiveId,
  state: "excluded" | "optional" | "required",   // 🛑 three-valued, never bool
  defaultValue?, instanceOverridable: boolean,
  narrowOnly: true }                             // ratchet: lower, never raise

/* ── 2 · POLICY ROW (header + )  — §2.2 ──────────────────────────── */
{ effect, target, condition, decisionStrategy, priority }

/* ── 3 · WIDGET DEF (header + ) ───────────────────────────────────── */
{ widgetKind: "container"|"leaf"|"slotContainer"|"provider",
  propsSchema, slots: Record<name, {allowedTypes[], min, max, seed?}>,
  supports: BlockSupportKeys[],        // which knobs this widget HONOURS
  bindableProps: string[], ownsFields: string[],
  requiredPermission?, governedBy: ContentTag[],
  removable: boolean, renderer }

/* ── 4 · FIELD TYPE DEF (header + ) ───────────────────────────────── */
{ storageShape, widget, formatter, validator, piiPolicy,
  acceptsListModifier: boolean,
  queryAxes: { isIndexed, isSortable, isFacetable, requiresIndex: IndexSpec[] } }

/* ── 5 · INSTANCE ROW (what a user's edit actually stores) ─────────── */
{ id, bundleId, templateId, templateVersion, forkPoint,
  overrideKey, overrides: SparsePatch,
  fieldOwnership: Record<nodeKey, "upstream"|"clone"|"seed">,
  mergeStrategy?, conflictPolicy?, upgradeChannel?,
  origin: "default"|"overridden"|"added"|"tombstoned",
  blockSupports: Partial<BlockSupports>,
  unknownFieldsPreserved: Json }       // 🛑 never DROP what you cannot read
```

🛑 **Five header fields exist specifically because a recorded defect would have been impossible with them**: `aliases[]` (half-finished renames) · `requires[]` (a mechanism shipped without its cluster — the four declared-but-unwired instances) · `onUnknown` (three registries, three unknown behaviours) · `isMoneyPath` (a permissive degrade on a refund path) · `usedSubjects[]` (*"which rules read purchase history?"* answerable by query instead of by grep).

---

# 6 · WHAT IS DELIBERATELY EXCLUDED

A catalogue is only credible with a boundary.

**Excluded because it is DERIVABLE from primitives in the catalogue — building it as a mechanism is the error**
- `supportsLayaway` = `commerce.acceptsCheckoutCharge` + `fulfilment.acceptsFulfilmentTrigger: on-full-payment`.
- `supportsTryBeforeYouBuy` = `acceptsFulfilmentTrigger: asap` + `acceptsBalanceChargeTrigger: time-after-checkout`.
- `supportsSubscriptionBox` = `supportsRecurringPurchase` + `supportsSurpriseReveal`.
- `supportsFlashSale` = `supportsAutomaticDiscount` + `acceptsValidityWindow` + `inventory.acceptsOutOfStockThreshold`.
- `commerce.supportsVariantAxes` **as a new primitive** — grouped + composite already covers the real need, and a variant axis is `content.supportsBundle` + `supportsVariation`. Adding it as a mechanism invites a second product model.

**Excluded because the vendor owns it, not us** — `money.acceptsSettlementDelay` (Adyen's 1–20 business days, 1 needs approval, cannot combine with managed payouts: read it from the provider, do not re-model it) · acquirer risk scoring · carrier rate tables · FX rate sourcing · `promo.acceptsStackDepthLimit` (Shopify's 5+1 is a platform limit, not a product decision we make).

**Excluded because a REGULATED THIRD PARTY must be in the loop** — `money.supportsEscrowHold` as a **true escrow** (Mangopay's model requires an e-money licence; what we ship is a **payout hold**, and the catalogue says so rather than implying more) · insurance underwriting · lending/BNPL origination.

**Excluded as out of scope for retail + wholesale + the hospital test** — `fulfilment.supportsDropship` · `supportsPickupPoint` (third-party lockers) · `acceptsPackagingConstraint`/hazmat (a DG desk is a different product) · `trust.acceptsExportDocumentation` (HS codes, customs) · `inventory.acceptsOverbookingAllowance` (airline/hospitality yield management) · **`bucket.*` A/B experiment bucketing** (`inPercentage`/`inVariant`/`moduloMatches` — the vocabulary is recorded above for when it is wanted, but it brings a correlated-experiment hazard: two rules sharing a `salt` bucket the SAME users together, and on a money path the stickiness attribute must be a stable server-known id, never a session id. **Not worth it before launch.**).

**Excluded as an expression tier, deliberately deferred** — a **CEL expression leaf** (`{cel: "…"}`), gated by a store capability, **for display / visibility / ranking ONLY and never on the money or permission path.** CEL is the right tier-2 choice (non-Turing-complete, linear time, mutation-free, in-process, static cost estimate + runtime cost accounting that halts). **Rego is excluded outright** — it is a query language over a document corpus needing a sidecar or WASM bundle, and the decision data here is per-request.

**Excluded as an architecture, on purpose** — **a Zanzibar.** The need is one-hop ownership plus store/entry parentage: a `relations` collection with a composite index, **not** a distributed authorization service. (Oso's own critique of Zanzibar's inflexibility is worth reading before over-committing.)
**Also excluded: forward chaining / an inference engine.** §2.5 — the project already has that exact outage shape recorded.

**Excluded because it is a PROCESS, not a primitive** — the publish gate · the tarball brand differential · the index deploy · `sync-dist-to.mjs`. They govern how a release is made, not what the platform can express.

---

# 7 · COVERAGE CHECK — the owner's named asks

| Ask | Primitives that cover it | Missing / gap |
|---|---|---|
| **Composite / bundled listings** | `commerce.supportsBundle` · `supportsConfigurator` · `inventory.supportsDerivedStock` (`componentStockPolicy`) · `resolveLineTransform` · `money.acceptsCommissionFee` (**composite = 1 unit**) | ⚠ `resolveLineTransform` is **inlined in 3 price branches**; expansion must run FIRST as its own resolver. `bundle` stays a **category type, not a listing type** |
| **Bulk / wholesale** | `supportsTierByQuantity` ✅ · `isTierMarginal` · `acceptsTierScope` · `requiresMinimumQuantity` · `acceptsQuantityIncrement` · `acceptsMaximumQuantity` · `supportsPriceList` · `supportsCustomerGroupPrice` · `supportsContractPrice` · `supportsBuyerOrganisation` · `supportsOrganisationHierarchy` · `requiresPurchaseApproval` · `acceptsSpendLimit` · `supportsNetTerms` · `supportsCreditLimit` · `acceptsPurchaseOrderReference` · `supportsRequisitionList` · `supportsQuoteLifecycle` · `resolveMeasure` | 🛑 **The entire trade namespace is 0 hits, measured.** Only `supportsTierByQuantity` is live. `QuantityStepper` has min/max and a **hardcoded ±1 step**. `isTierMarginal` is hardcoded in **two** engines that **disagree**. **This is TODAY's vertical and it is the largest have/need gap in the catalogue.** |
| **Inventory** | `supportsOnHand` ✅ · `supportsAllocated` · `supportsReserved` · `supportsCheckoutReservation` ✅ · `acceptsOutOfStockThreshold` · `acceptsSafetyStock` · `supportsAllocationStrategy` · `supportsMultiLocation` · `supportsAvailableToPromise` · `supportsLotTracking` · `supportsSerialTracking` · `requiresExpiryDate` · `supportsDerivedStock` ✅ · `acceptsBinLocation` ✅ · `supportsStockResync` ✅ | 🛑 **`allocated` and `reserved` are ONE derived gap doing both jobs. Three numbers from day one — Saleor still has an open bug on this conflation, and retrofitting is a data migration.** Lot/serial/expiry = 0 (all 704 `lot` hits are clearance lots). ATP/safety stock = 0 |
| **Shipment prediction** | `fulfilment.supportsDeliveryPromise` · `acceptsDispatchSla` · `schedule.acceptsBusinessCalendar` · `resolveDeliveryOptions` (carrier callback) | **missing.** 🛑 **A prediction must carry `estimatedFlag` through to the UI**, or a promise reads as a commitment |
| **Coupons, platform + seller scope** | `supportsCoupon` ✅ · `supportsAutomaticDiscount` · `isDiscountClass` · **`acceptsCombinationWith`** · `acceptsApplicationOrder` · `supportsDiscountAction` · `acceptsUsageLimit`/`acceptsPerPartyLimit` · Spree's **rule** catalogue (13 members) and **action** catalogue as predicate rows · `target.storeId` on the policy row = seller scope, absent = platform scope | 🛑 **`acceptsCombinationWith` must be an allowlist of CLASSES from day one** — Shopify needs **both** discounts to permit the other's class; a boolean `stackable` cannot express it and cannot be upgraded without re-authoring every promotion row. Verify `coupon-stacking.ts` now |
| **Prizes as listings / coupons / points** | `participation.supportsPrize` (**one mechanism, three payload kinds**) · `commerce.supportsCoupon` · `commerce.supportsLoyaltyAccrual` · `participation.supportsGiveawayDraw` · `money.supportsLedgerPosting` | ⚠ a prize **issues value**, so it is a money path: the draw needs `requiresIdempotencyKey` and an audit record. 🛑 `GIVEAWAY_ENTRIES_COLLECTION = "lotteryEntries"` is an identifier that outlived its words — **a backfill, not an edit** |
| **Event entry + voting + leaderboards** | `participation.*` — **the best-covered namespace**: `acceptsEntryForm` ✅ · `acceptsEntryLimit` ✅ · `requiresEntryMedia` ✅ · `acceptsEntryApproval` ✅ · `supportsVote` ✅ · `acceptsRanking` ✅ (with `publicWording`) · `supportsLeaderboard` · `acceptsCounterRecompute` ✅ | 🛑 **`supportsEntryOwnerEdit` is missing and blocks owner requirement #1.** Also owed: the **note on the card** (stored, capped, **not rendered**), a **media SLIDER** (reuse `DetailPageGallery`, do not invent a third gallery), and the entry-limit UI must **read the number** instead of assuming 1. `supportsLeaderboard` needs **`data.requiresIndexCoverage`** — the likeCount ordering is exactly what made every entry invisible |
| **Universal search** | `data.supportsUniversalSearch` · `content.isIndexed`/`isSortable`/`isFacetable` · `data.acceptsFacet` ✅ · `resolveQuery` · `data.supportsCrossServiceReference` · `data.supportsProjection` | 🛑 **`requiresIndexCoverage` is the blocker**, and the microservice rule means each host answers for its own data over HTTP with a **degrade-to-stub**. 🛑 And a PII blind index must **never** be searchable output — strip by `/Index$/` |
| **In-place edit mode** | `ui.supportsInPlaceEdit` · `access.requiresOwnership` · `access.supportsRelation` · `content.supportsFormMode` · `resolveFields` · `resolveWidgetTree` (**edit mode already retains blocked widgets so an editor can be told why** ✅) | 🛑 **Three missing primitives stack here**: ownership, form modes, and the edit affordance. This is the clearest case for the predicate registry (`actor.isOwnerOf` ∨ `actor.hasPermission`) rather than 50 hand-written checks across five hosts |
| **Watermarks / media** | `trust.supportsWatermark` (config ✅) · `content.supportsFieldType: image/video/mediaFocalPoint/mediaOrientation` · `resolveMedia` · **`MediaFile`** | ⚠ the watermark **config** exists and the render-time overlay widget does not. 🛑 `resolveMedia` fixes the **render** path; the **persistable** path (`seedPhoto()` baking seed-tile URLs into 366 call sites) is still owed, and it is **appkit's, not the shop's** |
| **Left/right-handed + gestures** | `ui.acceptsHandMode` ✅ (`HandModeRow`) · `ui.acceptsGesture` · block supports `deviceVisibility`, `mobileOnly`, per-breakpoint overrides, `keyboardShortcut` | `acceptsGesture` missing. ⚠ Hand mode must reach the **block-supports layer** (which side an action bar renders on), not just one component |
| **Role dashboards** | `access.supportsRole` ✅ · `acceptsPermissionGroup` ✅ · `content.supportsBundle` + `supportsViewMode` + `acceptsDisplay` · `ui.*` (regions, widget types, `repeatOver`, `valueMap`) · Grafana's panel taxonomy · `cond.*` predicates for per-role visibility | 🛑 **11 widget defs against 43 in the mocks; 2 regions against 379 `pageId`s.** The dashboard-as-browser decision (tab strip, **omnibox**, thin toolbar, overflow) needs `CommandPalette`, which does not exist. The dashboard shown on `employee.` resolves from the **role set** — that is `resolveAccess` + `resolveTemplate`, both half |
| **Support / disputes** | `claim.*` entire — one mechanism for returns, disputes, protection, warranty and tickets · `acceptsFilingWindow` ✅ · `acceptsRefundGate` · `supportsAdjudication` · `acceptsEscalation` · `acceptsSlaTimer` · `money.supportsChargeback` | 🛑 **four bespoke flows where there should be one `claim` record.** `refundGatesSeedData` is **declared and unread**; `protection-config.ts` says *"GROUNDWORK, NOT YET WIRED"* in its own commit subject; `acceptsEscalation` lives in the dead transition seed |
| **Marketplace kill switch** | `access.supportsKillSwitch` · the `forbid` effect · `money.acceptsMethodRules`' platform `disabled` ceiling ✅ · `content.acceptsRobotsDirective` · `data.isEmptyBehaviour` | ⚠ the mechanism exists per-domain and is **not named or shared**. 🛑 `policy.never` as an explicit leaf, and `access.acceptsDecisionStrategy: unanimous` on money gates, are what make a kill switch **unoverridable by any store** — the exact asymmetry (ceiling ≠ default) that must not be collapsed |
| **Multi-domain** (shop · events · blogs · media · audit · wiki · tools · help) | `resolveTenant` · `resolveRoute` ✅ · `content.isSectionOwner` ✅ · `data.supportsCrossServiceReference` · `resolveIdentity` (shared `__session`) · `content.acceptsMessageNamespace` ✅ · `resolveCache` (`variesBy: host`) · `ui.*` chrome as widget rows | 🛑 **`supportsCrossServiceReference` is missing and every proxy route hand-rolls it.** `resolveTenant` is three functions. `resolveIdentity` **must hydrate the client from the shared cookie** — SSO holds on the API path and the chrome still says "Sign in". `help` is a **portal**, `chat` is in neither list deliberately, `media` is API-only |
| **🏥 THE HOSPITAL TEST** | patient/admission/ward → **`content.supportsBundle`** · encounter → `data.supportsRecord` + `supportsStateMachine` · appointment → **`schedule.*`** · order-set → `supportsBundle` · formulary → `supportsPriceList` · payer contract → `supportsContractPrice` · co-pay → `acceptsCheckoutCharge` · claim → `claim.*` + `money.*` · prescription/prior-auth → **`trust.requiresExternalAuthorisation`** · prescriber licence → **`trust.requiresLicenceHeld`** · recall → **`inventory.supportsLotTracking`/`supportsSerialTracking`/`requiresExpiryDate`** · dosage → **`content.supportsFieldType: measure`** + `resolveMeasure` · consent → `trust.requiresConsentRecord` ✅ · requisition → `commerce.requiresPurchaseApproval` · clinician scoped to a ward → **`access.supportsRelation`** · eligibility → **`schedule.requiresEligibility`** (FHIR `CoverageEligibilityRequest`) · discharge summary → `money.acceptsNumberingSeries` + document | **PASSES on vocabulary, with four namespaces to build**: `schedule.*` (entirely missing), lot/serial/expiry, licence + external authorisation, and `access.supportsRelation`. 🛑 **The neutral set is LARGER than the commerce set** — which licenses the structural move: **`commerce.*` is a thin façade over `schedule.*` + `data.*` + `money.*`.** Write `resolveAvailability` to cover a count **and** a slot set and the hospital needs **zero new mechanisms.** The widgets that do NOT map (`AddToCart`) are exactly the ones a bundle's allowlist excludes — **which is the design working.** |

---

# 8 · THE FOUR THINGS MOST LIKELY TO SINK THIS, AND THE ESCALATIONS

1. 🛑 **The mechanism catalogue has ZERO readers and is not even seeded.** Five registries keyed on listing type — four live and hand-written, one (the intended replacement, 24 mechanisms × 9 types with `requires[]`, `moneyPath` and `effect` prose) **dead**, and not in `seed/manifest.ts` either. Its own header states the plan: *"capabilities.ts becomes a reader of this seed."* **The events side already did this migration correctly (`event-mechanisms.ts` reads config at runtime). Copy it.** Until then the catalogue is a design document in TypeScript, and registry 1 and registry 5 **do not even agree on the type keys**.
2. 🛑 **`capabilityFor` THROWS on an unknown type and `getListingRule` PERMITS one** (`purchaseable: true`, `refundPolicy: full+partial`). The degrade rule is broken in the registry the architecture is named after, and broken in the wrong direction on a money path. **Fix both before anything is built on top; `UNKNOWN_METHOD_CAPABILITIES` is the template.**
3. 🛑 **There is no predicate / condition primitive in any form.** Rule sets are parameter bundles; every condition is a hand-written `if`; `cond.group` is AND-only (Drupal's 15-year-old defect #923934, with no `summary()` so an admin cannot be told *why* something is hidden). Without a registry + a 3-valued tree + per-row `onUnknown`, *"a new rule is a row"* is not expressible.
4. 🛑 **`content.acceptsForkPoint` + `acceptsFieldOwnership` are the missing merge primitives, and `data.requiresIndexCoverage` is the one place the no-deploy promise genuinely breaks.** Both are **data-migration-class to retrofit and cheap to design in now.** The index one has already caused a measured outage where a degraded read was indistinguishable from no data.

**Escalate before implementing — four product decisions, not technical ones:**
- **Conflict default** when upstream and a clone both change one node: `flagForReview` (recommended, k8s-style) vs `upstreamWins` — and on a **money-path template** the conservative answer may genuinely be upstream.
- **`content.isLocalizationStrategy` — per bundle or platform-wide?** Field-level and document-level have very different cost and workflow profiles; Sanity deliberately ships both.
- **Does `content.supportsPromoteOverride` exist?** Figma has it; it is how a vendor's improvement gets back into the platform template. If yes, it needs its own approval flow.
- **`resolveConfig` specificity vs scope**: does a per-bundle-specific override beat a broader-scope non-specific setting (VS Code's language-override rule)? **Decide explicitly, or two sessions implement it differently.**

**The acceptance gate for the whole design** — write it down as the gate, not as advice:
1. `grep "listingType ===\|role ===\|paymentMethod ===\|event.type ===" ` outside the registries → **zero**.
2. A **payment method, listing type, widget type, field type and bundle the code has never heard of** can each be added by config alone, resolve through all levels, and render — **with no deploy**.
3. Every resolver is **EXECUTED** in a test and its `reason`/`source` asserted — not *"a caller exists"*. Three unwired resolvers were found exactly this way and none would have been found by review.
4. Every resolver has a **RED test**: sabotage the precedence operator (`??`→`||`) and the suite must fail. `policy.alwaysUnknown` must make a money gate **deny**.
5. **Unknown-value fuzz** at every config level for every resolver: nothing throws, no public page blanks, every money-path resolver **refuses** rather than guesses.
6. Every block support is verified by **RENDERING**, not by typecheck.
7. `explainX()` exists for every resolver and **one admin screen renders the trace**.