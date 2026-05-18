# asciiDiagrams.md — appkit component & flow reference

ASCII diagrams for non-trivial components and architectural flows. Updated alongside source changes per the per-session refactor checklist in `prompt.md`.

## Index

- [S-STORE Foundation](#s-store-foundation) — 14-collection store-extensions feature
- [QuickCreateModal](#quickcreatemodal) — slide-over with semantic `onSave(doc)` contract
- [FormShell splitPreview](#formshell-splitpreview) — desktop 60/40 form + live-preview layout
- [SellerProductsView](#sellerproductsview) — toolbar + cards + filter-drawer split
- [SellerBidsView grouped](#sellerbidsview-grouped) — collapsible per-auction sections
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
