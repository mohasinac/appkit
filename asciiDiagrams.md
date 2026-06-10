# asciiDiagrams.md — appkit component & flow reference

ASCII diagrams for non-trivial components and architectural flows. Updated alongside source changes per the per-session refactor checklist in `prompt.md`.

## Index

- [Strict-0 Audit Model](#strict-0-audit-model) — all audits hard-fail on any violation; per-line suppression markers replace baseline drift
- [S-STORE Foundation](#s-store-foundation) — 14-collection store-extensions feature
- [BottomActions + BulkActionBar](#bottomactions--bulkactionbar) — mobile vs desktop action bars
- [Toast Audit Pattern](#toast-audit-pattern) — async handler error propagation + audit script
- [QuickCreateModal](#quickcreatemodal) — slide-over with semantic `onSave(doc)` contract
- [FormShell splitPreview](#formshell-splitpreview) — desktop 60/40 form + live-preview layout
- [SellerProductsView](#sellerproductsview) — toolbar + cards + filter-drawer split
- [SellerBidsView grouped](#sellerbidsview-grouped) — collapsible per-auction sections
- [Standard SellerView DataTable pattern](#standard-sellerview-datatable-pattern-w4w5) — correct DataTable/useBulkSelection/RowActionMenu/ConfirmDeleteModal API
- [StepForm inside StackedViewShell](#stepform-inside-stackedviewshell-w6w7) — multi-step store/admin settings forms
- [MarketplaceBundleCard](#marketplacebundlecard-w3) — 2x2 collage + BaseListingCard wrapper
- [Vacation Banner](#vacationbanner) — store-paused notice flow
- [Event Participate flow](#event-participate-flow) — auth gate, no-form redirect, Skeleton default, submit timeout
- [Search suggestions + `?q=` carry-through](#search-suggestions--q-carry-through) — page hits + listing-page redirect with query
- [Listing API sieve fallback](#listing-api-sieve-fallback) — Function-first / repo-fallback with full Sieve, no in-memory drop

---

## Strict-0 Audit Model

Every audit in `scripts/audit-*.mjs` and `appkit/scripts/audit-*.mjs` runs in strict zero-tolerance mode. There is no `BASELINE` constant, no baseline-drift tolerance branch, and no per-rule baseline. Any violation `> 0` fails the audit, which fails the Stop hook and `npm run check`.

```
                  ┌──────────────────────┐
                  │  npm run check       │
                  └──────────┬───────────┘
                             │ fail-fast, in order
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  check:types          check:audits          check:lint
  (tsc both repos)     (all audits)        (eslint src + appkit/src)
        │                    │                    │
        └────── all 3 must exit 0 ────────────────┘
                             │
                             ▼
                  every audit prints "clean ✓"
                  (no BASELINE / no tolerance)
```

### Per-line suppression markers

Legitimate dynamic patterns get an explicit marker at the site of the decision, each with a brief reason:

| Marker | Audit | Use for |
|---|---|---|
| `// audit-inline-style-ok: <reason>` | `audit-inline-styles` | dynamic `backgroundImage: url(...)`, computed percentages/timings, z-index var expressions, pass-through style props |
| `// toast-handled-by-hook` | `audit-toast-coverage` | wrapper around hook that owns the toast (e.g. `useEntityDelete`) |
| `// toast-intentionally-silent — <reason>` | `audit-toast-coverage` | data loaders / refetch / background ops with inline-error state |
| `// reexport-from-internal-ok` | `audit-appkit-reexports` | star-exports from `_internal/` that are intentional public API |
| `// audit-sieve-views-ok` | `audit-sieve-constants-views` | unavoidable raw sort/filter literal in a view |

### Adding a new check

```
1. Write the audit script under scripts/ or appkit/scripts/
2. Use the canonical exit pattern:
     if (violations.length === 0) {
       console.log("audit-X: clean ✓");
       process.exit(0);
     }
     // ... print details ...
     process.exit(1);
3. Add an npm script entry: "audit:X": "node scripts/audit-X.mjs"
4. Wire into check:audits in package.json
5. (Optional) Add to scripts/claude-hooks/check-on-stop.mjs if fast enough
```

Do not introduce a `BASELINE` constant. If a legitimate dynamic pattern is not yet captured by an existing suppression marker, add a new marker name to that audit (5–10 lines of code) rather than tolerating a non-zero baseline.

---

## BottomActions + BulkActionBar

```
Desktop (lg+):                          Mobile (< lg):

┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│  ListingToolbar                  │    │  ListingToolbar                  │
├──────────────────────────────────┤    ├──────────────────────────────────┤
│  BulkActionBar  (dropdown)       │    │  (no BulkActionBar)              │
│  "3 selected" [Actions ▾]        │    │                                  │
│   └─ Delete · Export · ...       │    │                                  │
├──────────────────────────────────┤    ├──────────────────────────────────┤
│                                  │    │                                  │
│  DataTable / Cards               │    │  DataTable / Cards               │
│                                  │    │                                  │
│                                  │    ├──────────────────────────────────┤
│                                  │    │  BottomActions (fixed bottom)    │
│                                  │    │  "3 selected" [Clear] [Delete]   │
└──────────────────────────────────┘    └──────────────────────────────────┘

Architecture:

  BottomActionsProvider (in AppLayoutShell)
       │
       ▼
  useBottomActions(config?)   ← called per-view, sets actions via context
       │
       ▼
  BottomActionsBar (lg:hidden, fixed bottom z-40)
       ├── page mode:  actions[]  (route-specific CTAs)
       └── bulk mode:  selectedCount + onClearSelection + actions[]

Hook call pattern in every view with bulk selection:

  useBottomActions(
    selection.selectedCount > 0
      ? { bulk: { selectedCount, onClearSelection, actions: [...] } }
      : {}
  );

52 views migrated. BulkActionBar kept for desktop — both coexist.

Deleted legacy:
  ✗ BulkActionsBar  (96-line fixed-bottom, zero imports pre-migration)
  ✗ StickyBottomBar  (Cart/Wishlist mobile bar → useBottomActions)
  ✗ BuyBar           (product detail mobile CTA → useBottomActions)
```

## Toast Audit Pattern

```
Every useCallback(async ...) in "use client" files must have:

  ┌─────────────────────────────────────────────────────┐
  │  const handler = useCallback(async () => {          │
  │    try {                                            │
  │      const res = await fetch(url, { ... });         │
  │      if (!res.ok) {                                 │
  │        const body = await res.json()                │
  │                       .catch(() => null);           │
  │        throw new Error(                             │
  │          (body as { error?: string })?.error        │
  │            ?? "Fallback message"                    │
  │        );                                           │
  │      }                                              │
  │      showToast("Success message.", "success");      │
  │    } catch (err) {                                  │
  │      showToast(                                     │
  │        err instanceof Error                         │
  │          ? err.message                              │
  │          : "Fallback error.",                       │
  │        "error"                                      │
  │      );                                             │
  │    }                                                │
  │  }, [..., showToast]);                              │
  └─────────────────────────────────────────────────────┘

Server error propagation:
  createRouteHandler returns { success: false, error: "message" }
  Client parses: (body as { error?: string })?.error ?? fallback

Audit script: scripts/audit-toast-coverage.mjs
  - Scans all "use client" files for useCallback(async ...) blocks
  - "error" = has await, no try/catch, no dispatch, no showToast
  - "warn"  = has try/catch but no showToast
  - Baseline (12 known): data loaders + background ops (intentionally silent)
  - Exit 1 on errors or NEW warnings; 0 when only baseline
```

## S-STORE Foundation

```
appkit/src/features/store-extensions/
├── schemas/
│   ├── firestore.ts  ── 11 collections:
│   │     payoutMethods · shippingConfigs · analyticsCards · analyticsAlerts
│   │     storeCategories · listingTemplates · moderationQueue · reports
│   │     itemRequests · storeWhatsAppConfig · storeGoogleConfig
│   └── rbac.ts       ── 3 RBAC:  roleOverrides · customRoles · adminNotifications
├── repository/
│   ├── store-extensions.repositories.ts  ── 11 BaseRepository subclasses
│   └── rbac.repositories.ts              ── 3 RBAC repositories
└── index.ts          ── barrel re-export

appkit/firebase/base/firestore.indexes.json
└── +32 composite indexes for the 14 collections

appkit/src/seed/store-extensions-seed-data.ts
└── 70+ sample docs, picsum.photos imagery, exported through seed/index.ts

Consumer-side
└── src/components/dev/SeedPanel.tsx
    └── COLLECTION_META: FieldDef[] + slugPattern + piiFields + uiPath for all 14
```

## QuickCreateModal

```
┌───────────────────────────────────────────────┐
│  Header   Title          [×]                  │  <- Heading + close
├───────────────────────────────────────────────┤
│                                               │
│  <children />   (mini-form fields only)       │  <- caller renders
│                                               │
├───────────────────────────────────────────────┤
│  ↗ Add more details        [Cancel] [Save]    │  <- builtin actions
└───────────────────────────────────────────────┘

Props: { isOpen, title, onSave, onSaved(doc), onCancel, children,
         fullPageHref?, isSaving?, saveDisabled? }

onSave async → resolved value passed to onSaved(doc) so caller can auto-select.
"Add more details" opens fullPageHref in a NEW TAB — preserves caller context.
```

## FormShell splitPreview

```
Desktop (lg+):                      Mobile (< lg):

┌────────────────┬───────────┐      ┌──────────────────┐
│  form fields   │  preview  │      │   form fields    │
│                │  pane     │      │                  │
│  60% width     │  40% wid. │      │  (single column) │
│                │  sticky   │      │                  │
│                │  scroll   │      │  [👁 Preview]    │  <- toggles
└────────────────┴───────────┘      └──────────────────┘
                                    (preview-as-modal pattern)

Prop: <FormShell splitPreview previewSlot={() => <Preview …/>} />
Falls back to existing toggleable preview behavior when splitPreview is false.
```

## SellerProductsView

```
SellerProductsView   (appkit/src/features/seller/components/)
├── ListingToolbar  (+ extra: "New Listing" button)
├── TypeDropdown    (replaces TypeChips, 9 listing kinds)
├── Pagination      (sticky below toolbar)
├── BulkActionBar   (desktop lg+, when selection > 0)
├── useBottomActions (mobile <lg, when selection > 0)
├── view === "grid" | "list":
│     SellerProductsCards   (extracted — sub-150-line threshold)
└── view === "table":
      DataTable + renderRowActions [Edit · Duplicate · Delete]

Sub-components (extracted from main file):
- SellerProductsCards.tsx           grid + list card variants
- SellerProductsFilterDrawer.tsx    8 filter keys
- seller-products-styles.ts         INPUT_CLS / FILTER_LABEL_CLS / KIND_BADGE_VARIANT
                                    / CARD_GRID_CLS / CARD_LIST_CLS / CARD_BORDER

Row click → public detail (/products/[id] or /auctions/[id] or /pre-orders/[id]).
Edit accessed only via "..." action menu.
Duplicate uses POST /api/store/products/[id]/duplicate.
```

## SellerBidsView grouped

```
SellerBidsView
├── ListingToolbar
├── BulkActionBar  (desktop lg+, Cancel selected)
├── useBottomActions (mobile <lg, Cancel selected)
└── ?grouped !== "0":
      ┌──────────────────────────────────────────────┐
      │ ▾ Charizard 1st Edition · 4 bids             │  <- collapsible header
      ├──────────────────────────────────────────────┤
      │  DataTable (bids for this auction)           │
      └──────────────────────────────────────────────┘
      ┌──────────────────────────────────────────────┐
      │ ▸ Hot Wheels Banana Camaro · 2 bids          │  <- collapsed
      └──────────────────────────────────────────────┘

    ?grouped === "0":
      Flat DataTable (no grouping).
```

## Standard SellerView DataTable pattern (W4/W5)

```
SellerXxxView  (appkit/src/features/seller/components/)
├── useUrlTable({ defaults: { sort: DEFAULT_SORT } })
├── useSellerListingData<Response, Row>({ queryKey, endpoint, mapRows, ... })
├── useBulkSelection({ items: rows, keyExtractor: (r) => r.id })
│     └── selectedIds / selectedCount / clearSelection / setSelectedIds
│
├── ListingToolbar
│     ├── search + commitSearch (table.set)
│     ├── sort: SortOptions[]
│     └── extra: <Button>New X</Button>
│
├── BulkActionBar (desktop lg+, when selectedCount > 0)
├── useBottomActions (mobile <lg, mirrors BulkActionBar actions)
│
└── DataTable
      columns: DataTableColumn<Row>[]  (render: (item) => ReactNode, NOT cell:)
      data={rows}                      (NOT rows=)
      keyExtractor={(r) => r.id}
      selectable={bulkActions.length > 0}
      selectedIds={selection.selectedIds}
      onSelectionChange={(ids) => selection.setSelectedIds(ids)}
      actions={(row) => (
        <RowActionMenu actions={[
          { label: "Edit", onClick: () => handleEdit(row.id) },
          { label: "Delete", destructive: true, onClick: () => setDeleteTargetId(row.id) },
        ]} />
      )}

ConfirmDeleteModal props:
  isOpen / onClose (NOT onCancel) / onConfirm / title / message (NOT description) / isDeleting (NOT isLoading)

New SellerView components added (S-page-form-audit-sweep):
  SellerStoreCategoriesView  — SideDrawer create/edit inline
  SellerTemplatesView        — SideDrawer + Clone row action (NOT "Duplicate")
  SellerPayoutMethodsView    — card view, Set as Default + Delete row actions
  SellerShippingConfigsView  — DataTable, Set as Default row action
  SellerGoogleReviewsView    — settings form + live review feed (Google Reviews split out of SellerStorefrontView)
  SellerBundlesView          — pre-filtered listingType=bundle
  SellerClassifiedView       — pre-filtered listingType=classified
  SellerDigitalCodesView     — pre-filtered listingType=digital-code
  SellerLiveView             — pre-filtered listingType=live
```

## StepForm inside StackedViewShell (W6/W7)

```
Pattern: StackedViewShell wrapper → StepForm inside sections[]

<StackedViewShell portal="admin|seller" title={...} sections={[<div key="content">...</div>]}>
  <StepForm<DraftType>
    steps={steps}          // StepDef<DraftType>[] — each has label + render({ values, onChange }) + validate?
    values={draft}
    onChange={update}      // React.useCallback((partial) => setDraft(prev => ({...prev, ...partial})))
    onComplete={() => { saveMutation.mutate(); }}
    formId="unique-id"     // localStorage step persistence
    currentStep={currentStep}
    onStepChange={setCurrentStep}
    completeLabel={isEdit ? "Save Changes" : "Create X"}
    isLoading={isLoading}
  />
</StackedViewShell>

Multi-step forms added (S-page-form-audit-sweep):
  SellerStorefrontView    — 4 steps: Store Identity / Branding / Policies / Contact & Visibility
  SellerShippingView      — 3 steps: Method / Pickup Address / Rules
  SellerPayoutSettingsView — 3 steps: Payout Method / Tax Info / Preferences
  AdminBlogEditorView     — 4 steps: Content / Media / SEO & Tags / Publish (+ live preview pane)
  AdminEventEditorView    — 4 steps: Details / Media / Settings / Raffle & Spin
                            Step 4 locked indicator when type ≠ raffle|spin_wheel
                            FormFieldBuilder extracted as standalone component (audit-code-quality threshold)
```

## MarketplaceBundleCard (W3)

```
MarketplaceBundleCard  (appkit/src/features/products/components/)
  Follows same pattern as MarketplacePrizeDrawCard

  <BaseListingCard>
    image area:
      bundleItemDetails.length >= 2 → 2x2 collage (up to 4 images) with +N overflow badge
      bundleItemDetails.length < 2  → single display.coverImage fallback
    body:
      title / price / store name
      badge: "X items" bundle count
      status badge
    <BaseListingCard.Checkbox> for bulk selection
  </BaseListingCard>

  Props: variant="grid"|"list", href, onSelect, isSelected
  Used in: CategoryBundlesListing (replaces internal BundleCard), SellerBundlesView card mode
```

## VacationBanner

```
<VacationBanner storeName message returnDate className />

Renders an <Alert variant="warning"> with:
  • Store-paused headline
  • Optional seller message
  • Optional return date (formatted via toLocaleDateString)
  • "New orders are paused; you can still wishlist items." sub-line

Drop-in on:
  - product detail pages   (gate add-to-cart)
  - checkout pages         (block fresh orders)
  - store profile/about    (header banner)

Source of truth: StoreDocument.{isVacationMode, vacationMessage, vacationReturnDate}.
```

---

## Event Participate flow

```
URL: /events/[id]/participate
         |
         v
+------------------------------------------------------------+
| participate/page.tsx (server)                              |
|                                                            |
| await getEventCached(id)                                   |
|                                                            |
| if (eventType in {POLL, SALE, OFFER}) OR not active:       |
|     redirect(ROUTES.PUBLIC.EVENT_DETAIL(id))               |
|                                                            |
| else render <EventParticipateClient event hasLeaderboard/> |
+------------------------------------------------------------+
         |
         v
+------------------------------------------------------------+
| EventParticipateClient (client)                            |
|                                                            |
| requireLogin =                                             |
|   (isSurvey  && surveyConfig?.requireLogin !== false)      |
|   || (event.type==="poll" && pollConfig?.requireLogin===true) |
|                                                            |
| NOTE: hasLeaderboard is intentionally NOT in this rule.    |
|       Coupling auth to a UX affordance forced login walls  |
|       on free sale / offer / raffle events. See cluster #1 |
|       in plan the-events-are-having-snappy-otter.md.       |
|                                                            |
| if (requireLogin && !user) return renderLoginRequired()    |
|                                                            |
| if (event.type === "spin_wheel") return <SpinWheelView/>   |
|                                                            |
| handleSubmit:                                              |
|   const ctl = new AbortController();                       |
|   const tId = setTimeout(() => ctl.abort(), 15_000);       |
|   try { fetch(..., { signal: ctl.signal }) }               |
|   catch AbortError -> toast("Submission timed out")        |
|   finally { clearTimeout(tId); setIsLoading(false) }       |
|                                                            |
| return <EventParticipateView                               |
|          isLoading={isLoading}                             |
|          renderForm={pollOrSurveyOrFeedbackForm}           |
|          renderAction={submitOrLimitMessage}               |
|          renderSuccess={successPanel}                      |
|        />                                                  |
+------------------------------------------------------------+
         |
         v
+------------------------------------------------------------+
| EventParticipateView (appkit)                              |
|                                                            |
| if (isLoading) {                                           |
|   if (renderSkeleton) return renderSkeleton()              |
|   return <Skeleton x3 stack>      <-- replaced bare        |
|                                       "Loading..." string  |
| }                                                          |
|                                                            |
| if (renderAuthGate) return renderAuthGate()                |
| if (isSubmitted && renderSuccess) return renderSuccess()   |
| return <Div>{info}{form}{action}</Div>                     |
+------------------------------------------------------------+

Guards (audits):
  - audit-auth-gate-derivation blocks `requireLogin = ... || hasX`
  - audit-spinner-defaults blocks bare "Loading..." in view components
```

---

## Search suggestions + `?q=` carry-through

```
User types "auc" in nav search
         |
         v
+--------------------------------------------------+
| useNavSuggestions (debounce 250ms)               |
| GET /api/search/suggestions?q=auc                |
+--------------------------------------------------+
         |
         v
+--------------------------------------------------+
| /api/search/suggestions/route.ts                 |
|                                                  |
| PAGE_SUGGESTIONS table (8 destinations):         |
|   Auctions / Products / Pre-orders / Stores /    |
|   Categories / Blog / Events / FAQs              |
|   each: { title, subtitle, url, keywords[] }     |
|                                                  |
| pageHits = PAGE_SUGGESTIONS                      |
|   .filter(p => p.title.toLowerCase().includes(q) |
|              || p.keywords.some(k=>k.includes(q)))|
|   .slice(0, 3)                                   |
|   .map(p => ({ type: "page", ...p }))            |
|                                                  |
| return [ ...pageHits,    <-- pages FIRST         |
|          ...products,                            |
|          ...categories,                          |
|          ...blog,                                |
|          ...events ]                             |
+--------------------------------------------------+
         |
         v
+--------------------------------------------------+
| Search.tsx — handleSuggestionClick(record)       |
|                                                  |
| if (record.type === "page" && query.trim()) {    |
|   const sep = record.url.includes("?") ? "&":"?";|
|   router.push(`${record.url}${sep}q=${enc(q)}`); |
|   return;                                        |
| }                                                |
| router.push(record.url);  <-- detail records     |
+--------------------------------------------------+
         |
         v
URL becomes /auctions?q=auc
         |
         v
Listing page useUrlTable() reads ?q= and pre-fills
toolbar input + applies the sieve immediately.

Detail-page record types (product / category / blog / event)
intentionally do NOT carry the query — they target a single
resource, not a listing.
```

---

## Listing API sieve fallback

```
GET /api/products?q=blue-eyes&inStock=true&pageSize=20
         |
         v
+--------------------------------------------------+
| /api/products/route.ts                           |
|                                                  |
| 1. Parse params                                  |
| 2. if (pageSize > 50) return 400                 |
|    (CLAUDE.md Rule #6 — Hobby Fluid cap)         |
| 3. Build:                                        |
|    filtersBase = base filters (status, types,    |
|                  listingType, store, brand, etc.)|
|    filters     = sieveAnd(                       |
|                    filtersBase,                  |
|                    q ? CONTAINS_CI(title, q),    |
|                    inStock ? GT(stock, 0),       |
|                    dateFromClause, dateToClause, |
|                    features[0] if single)        |
+--------------------------------------------------+
         |
         v
+--------------------------------------------------+
| Try listingProcessor Firebase Function FIRST     |
| (FIREBASE_FUNCTION_LISTING_URL)                  |
|   upstream = callListingProcessor("products",    |
|                { filters, sorts, page, pageSize })|
+--------------------------------------------------+
         |
         |  on Function failure (cold start / 401 / network)
         v
+--------------------------------------------------+
| Local repo FALLBACK                              |
|                                                  |
| productRepository.list({                         |
|   filters,              <-- FULL sieve, not the  |
|   sorts,                    base subset. Same    |
|   page, pageSize        })  predicate the Function|
|                             would have applied.  |
|                                                  |
| Sieve adapter (db-firebase/sieve.ts) pushes      |
| every clause it can into Firestore .where().     |
| NO in-memory .filter() over fetched docs.        |
+--------------------------------------------------+
         |
         v
+--------------------------------------------------+
| Catch (error) — recoverable DB errors:           |
|   FAILED_PRECONDITION / index error -> empty +   |
|     warning "run: firebase deploy --only         |
|     firestore:indexes"                           |
|   PERMISSION_DENIED -> empty + rules warning     |
+--------------------------------------------------+

Guards (audits):
  - audit-root-cause blocks new in-memory filtering patterns
  - audit-listing-pagesize blocks new pageSize > 50 caps
  - audit-sieve-constants blocks raw "==" / "@=" literals

Note: prompt.md Rule #7 — no workarounds, no fallbacks that
silently drop predicates. Both the Function path and the repo
path receive the SAME `filters` value; they only differ in
where the Sieve adapter runs (Function vCPU vs. Vercel Lambda).
```
