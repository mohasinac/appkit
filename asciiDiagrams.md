# asciiDiagrams.md — appkit component & flow reference

ASCII diagrams for non-trivial components and architectural flows. Updated alongside source changes per the per-session refactor checklist in `prompt.md`.

## Index

- [S-STORE Foundation](#s-store-foundation) — 14-collection store-extensions feature
- [QuickCreateModal](#quickcreatemodal) — slide-over with semantic `onSave(doc)` contract
- [FormShell splitPreview](#formshell-splitpreview) — desktop 60/40 form + live-preview layout
- [SellerProductsView](#sellerproductsview) — toolbar + cards + filter-drawer split
- [SellerBidsView grouped](#sellerbidsview-grouped) — collapsible per-auction sections
- [Standard SellerView DataTable pattern](#standard-sellerview-datatable-pattern-w4w5) — correct DataTable/useBulkSelection/RowActionMenu/ConfirmDeleteModal API
- [StepForm inside StackedViewShell](#stepform-inside-stackedviewshell-w6w7) — multi-step store/admin settings forms
- [MarketplaceBundleCard](#marketplacebundlecard-w3) — 2x2 collage + BaseListingCard wrapper
- [Vacation Banner](#vacationbanner) — store-paused notice flow

---

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
├── BulkActionBar   (when selection > 0)
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
├── BulkActionBar  (Cancel selected)
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
├── BulkActionBar (when selectedCount > 0 && bulkActions.length > 0)
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
