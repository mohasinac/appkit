# appkit — Component / Util / Constant Index

> **Living document.** Update after every task that adds, renames, or removes an entry.
> **Before creating anything new** — search this file first. If it's here, reuse it.
> Import paths shown relative to `appkit/src/`. Consumer apps import via `@mohasinac/appkit`, `@mohasinac/appkit/client`, or `@mohasinac/appkit/ui`.

## Index

- [UI Primitives](#ui-primitives--appkitsrcuicomponents)
- [Admin Feature Components](#admin-feature-components--appkitsrcfeaturesadmincomponents)
- [Seller Feature Components](#seller-feature-components--appkitsrcfeaturessellercomponents)
- [Account / User Feature Components](#account--user-feature-components--appkitsrcfeaturesaccountcomponents)
- [Other Feature Views](#other-feature-views)
- [Hooks](#hooks--appkitsrcfeatureshooks)
- [Repositories](#repositories--appkitsrcrepositories)
- [Utilities](#utilities--appkitsrcutils)
- [Constants](#constants--appkitsrcconstants)

---

## UI Primitives — `appkit/src/ui/components/`

Import: `import { X } from "@mohasinac/appkit/ui"` (or `/client` for client-only)

| Name | File | What it does |
|------|------|-------------|
| `Accordion` | `Accordion.tsx` | Collapsible disclosure panel |
| `ActiveFilterChips` | `ActiveFilterChips.tsx` | Displays active filter pills with remove buttons |
| `Alert` | `Alert.tsx` | Inline alert / info / warning / error banner |
| `Avatar` | `Avatar.tsx` | Circular user avatar with fallback initials |
| `AvatarDisplay` | `AvatarDisplay.tsx` | Avatar + display name + role combo |
| `BackgroundRenderer` | `BackgroundRenderer.tsx` | Renders image/video/color/gradient backgrounds (used in carousel) |
| `Badge` | `Badge.tsx` | Small status/label pill with color variants |
| `BaseListingCard` | `BaseListingCard.tsx` | Base card shell used by product/auction/preorder cards |
| `BulkActionBar` | `BulkActionBar.tsx` | Sticky bar with bulk action buttons (shown when rows selected) |
| `BulkActionsBar` | `BulkActionsBar.tsx` | Alias/variant of BulkActionBar |
| `Button` | `Button.tsx` | Primary action button — mutations/forms only, never navigation |
| `Card` | `Card.tsx` | Generic surface card with optional header/footer |
| `Checkbox` | `Checkbox.tsx` | Controlled checkbox input |
| `ConfirmDeleteModal` | `ConfirmDeleteModal.tsx` | Modal asking "Are you sure?" before destructive action |
| `CountdownDisplay` | `CountdownDisplay.tsx` | Live countdown timer for auctions |
| `DashboardStatsCard` | `DashboardStatsCard.tsx` | Single stat tile (number + label + icon) |
| `DescriptionField` | `DescriptionField.tsx` | Styled read-only description display field |
| `DetailViewShell` | `DetailViewShell.tsx` | Shell for detail pages (header + tabs + content) |
| `Div` | `Div.tsx` | Semantic div wrapper with design-system props |
| `Divider` | `Divider.tsx` | Horizontal rule separator |
| `Drawer` | `Drawer.tsx` | Bottom/side drawer panel |
| `Dropdown` | `Dropdown.tsx` | Floating dropdown menu |
| `DynamicSelect` | `DynamicSelect.tsx` | Async searchable select that fetches options from API |
| `EmptyState` | `EmptyState.tsx` | Empty list / zero-results placeholder with icon + CTA |
| `FilterDrawer` | `FilterDrawer.tsx` | Mobile-friendly filter panel that slides in |
| `FlowDiagram` | `FlowDiagram.tsx` | Horizontal step-flow diagram |
| `Form` | `Form.tsx` | Form wrapper with accessible submit handling |
| `FormField` | `FormField.tsx` | Label + input + error message wrapper |
| `FormGrid` | `FormGrid.tsx` | Responsive 1/2/3-column form layout grid |
| `HorizontalScroller` | `HorizontalScroller.tsx` | Drag-scrollable horizontal card row |
| `IconButton` | `IconButton.tsx` | Icon-only button with accessible label |
| `ImageGallery` | `ImageGallery.tsx` | Thumbnail strip + main image viewer |
| `ImageLightbox` | `ImageLightbox.tsx` | Full-screen image zoom overlay |
| `InlineCreateSelect` | `InlineCreateSelect.tsx` | DynamicSelect + "+ Create new" option that opens SideDrawer (`renderCreateForm`) or QuickFormDrawer (`createFields`+`onCreateSubmit`) |
| `Input` | `Input.tsx` | Text/number/email/password input |
| `ItemRow` | `ItemRow.tsx` | Single row item with label/value/action |
| `Layout` | `Layout.tsx` | Container/Stack/Row/Grid/Section/Main layout primitives |
| `ListingLayout` | `ListingLayout.tsx` | Public listing page layout (sidebar filters + main grid) |
| `ListingToolbar` | `ListingToolbar.tsx` | Sticky search + sort + filter bar for listing pages |
| `ListingViewShell` | `ListingViewShell.tsx` | Shell wrapping list pages with toolbar + content |
| `Menu` | `Menu.tsx` | Context/action menu (used in RowActionMenu) |
| `Modal` | `Modal.tsx` | Centred dialog overlay |
| `NavigationLoader` | `NavigationLoader.tsx` | Top progress bar during route transitions |
| `PageLoader` | `PageLoader.tsx` | Full-page centered loading state (spinner + "Loading…"); 15s timeout shows "Something went wrong" + Refresh button; replaces all `loading.tsx` skeletons (X5) |
| `Pagination` | `Pagination.tsx` | Page number nav bar |
| `PasswordStrengthIndicator` | `PasswordStrengthIndicator.tsx` | Visual password strength meter |
| `PriceDisplay` | `PriceDisplay.tsx` | Formats paise → ₹ with strike-through sale price |
| `Progress` | `Progress.tsx` | Linear progress bar |
| `Radio` | `Radio.tsx` | Radio input group |
| `RatingDisplay` | `RatingDisplay.tsx` | Star rating display (read-only) |
| `ResponsiveView` | `ResponsiveView.tsx` | Conditionally renders children based on breakpoint |
| `RichTextEditor` | `RichTextEditor.tsx` | WYSIWYG rich text editor (Tiptap-based) |
| `RoleBadge` | `RoleBadge.tsx` | User role pill (admin / seller / buyer) |
| `RowActionMenu` | `RowActionMenu.tsx` | Per-row ⋮ action menu (edit / delete / status) |
| `Select` | `Select.tsx` | Native/custom select dropdown |
| `Semantic` | `Semantic.tsx` | Semantic HTML wrappers (Section, Article, Main, Aside, Nav, Header, Footer) |
| `SectionTabs` | `SectionTabs.tsx` | Tab bar for section/page-level tab switching |
| `SideDrawer` | `SideDrawer.tsx` | Slide-in panel from right for create/edit forms |
| `SideModal` | `SideModal.tsx` | Fixed-width side panel modal |
| `Skeleton` | `Skeleton.tsx` | Shimmer placeholder for loading states |
| `SkipToMain` | `SkipToMain.tsx` | Accessibility skip-to-content link |
| `Slider` | `Slider.tsx` | Range slider input |
| `SlottedListingView` | `SlottedListingView.tsx` | Admin/seller listing scaffold with columns, search, sort, pagination, row actions |
| `SortDropdown` | `SortDropdown.tsx` | Sort-by dropdown selector |
| `Spinner` | `Spinner.tsx` | Loading spinner |
| `StackedViewShell` | `StackedViewShell.tsx` | Mobile-optimised stacked panel shell |
| `StarRating` | `StarRating.tsx` | Interactive star rating input |
| `StatsGrid` | `StatsGrid.tsx` | Grid of DashboardStatsCards |
| `StatusBadge` | `StatusBadge.tsx` | Order/product/auction status coloured badge |
| `StepperNav` | `StepperNav.tsx` | Multi-step progress indicator |
| `SummaryCard` | `SummaryCard.tsx` | Summary metric card with label + value |
| `TabStrip` | `TabStrip.tsx` | Horizontal tab strip (lightweight, no panel) |
| `TablePagination` | `TablePagination.tsx` | Pagination bar sized for data tables |
| `Tabs` | `Tabs.tsx` | Full tab component with panels |
| `TagInput` | `TagInput.tsx` | Free-form tag entry field |
| `Textarea` | `Textarea.tsx` | Multi-line text input |
| `TextLink` | `TextLink.tsx` | Inline text hyperlink (navigation only, uses ROUTES.*) |
| `Toast` | `Toast.tsx` | Toast notification (use via `useToast` hook) |
| `Toggle` | `Toggle.tsx` | On/off toggle switch |
| `Tooltip` | `Tooltip.tsx` | Hover tooltip wrapper |
| `Typography` | `Typography.tsx` | Heading / Text / Label / Caption / Span primitives |
| `UnsavedChangesModal` | `UnsavedChangesModal.tsx` | Modal warning when navigating away with unsaved form state |
| `ViewToggle` | `ViewToggle.tsx` | Grid/list view toggle button pair |

---

## Admin Feature Components — `appkit/src/features/admin/components/`

Import: `import { X } from "@mohasinac/appkit"`

| Name | File | What it does |
|------|------|-------------|
| `AdminListingScaffold` | `AdminListingScaffold.tsx` | Base scaffold for all admin listing pages (search/sort/filter/pagination wired); props: `renderRowActions` (per-row ⋮ menu), `actionsSlot` (toolbar right-side buttons) |
| `AdminDashboardView` | `AdminDashboardView.tsx` | Admin home dashboard with stats + quick actions |
| `AdminSidebar` | `AdminSidebar.tsx` | Left navigation sidebar for admin area |
| `AdminTopBar` | `AdminTopBar.tsx` | Top bar with breadcrumbs for admin pages |
| `AdminPageHeader` | `AdminPageHeader.tsx` | Page-level header with title + action buttons |
| `AdminFilterBar` | `AdminFilterBar.tsx` | Admin-specific filter bar wrapper |
| `DashboardStats` | `DashboardStats.tsx` | Stats grid for admin dashboard |
| `QuickActionsPanel` | `QuickActionsPanel.tsx` | Admin quick-action shortcut panel |
| `DrawerFormFooter` | `DrawerFormFooter.tsx` | Save/Cancel footer for SideDrawer forms |
| `FormShell` | `features/shell/FormShell.tsx` | Full-viewport edit overlay — sticky top/bottom bars, left section nav, dirty-state confirm dialog, `previewSlot` preview toggle (UX4) |
| `QuickFormDrawer` | `features/shell/QuickFormDrawer.tsx` | 40%-width right-anchored drawer; auto-generates form from `fields: QuickFieldDef[]`; used for quick actions |
| `StepForm` | `features/shell/StepForm.tsx` | Multi-step wizard (renders inside FormShell body); step indicator + per-step validate gate |
| `DataTable` | `DataTable.tsx` | Generic data table (prefer SlottedListingView for full CRUD tables); supports `renderRowActions` prop for per-row ⋮ menu |
| `QuickEditMenu` | `features/admin/components/QuickEditMenu.tsx` | ⋮ row action menu where each action can open a `QuickFormDrawer`; use in `renderRowActions` for inline quick-edit |
| `AdminProductsView` | `AdminProductsView.tsx` | Admin products listing (list page) |
| `AdminProductEditorView` | `AdminProductEditorView.tsx` | Admin product create/edit form (3-mode: standard/auction/preorder) |
| `AdminCouponsView` | `AdminCouponsView.tsx` | Admin coupons listing |
| `AdminCouponEditorView` | `AdminCouponEditorView.tsx` | Admin coupon create/edit form |
| `AdminBlogView` | `AdminBlogView.tsx` | Admin blog posts listing |
| `AdminBlogEditorView` | `AdminBlogEditorView.tsx` | Admin blog post create/edit with RichTextEditor |
| `AdminFaqsView` | `AdminFaqsView.tsx` | Admin FAQs listing — RowActionMenu (Edit→/admin/faqs/[id]/edit, Delete→ConfirmDeleteModal) (A5/VA5) |
| `AdminFaqEditorView` | `AdminFaqEditorView.tsx` | Admin FAQ create/edit page — dedicated route /admin/faqs/new + /admin/faqs/[id]/edit; fields: question, slug, answer (RichText), category, tags, order, priority, 4 visibility toggles (A5/VA5) |
| `AdminBrandsView` | `AdminBrandsView.tsx` | Admin brands listing |
| `AdminBrandEditorView` | `AdminBrandEditorView.tsx` | Admin brand create/edit form |
| `AdminCategoriesView` | `AdminCategoriesView.tsx` | Admin categories listing — row click + RowActionMenu navigate to dedicated editor routes (RC4) |
| `AdminCategoryEditorView` | `AdminCategoryEditorView.tsx` | Admin category create/edit form |
| `AdminCarouselView` | `AdminCarouselView.tsx` | Admin carousel slides listing |
| `AdminCarouselEditorView` | `AdminCarouselEditorView.tsx` | Admin carousel slide create/edit |
| `AdminSectionsView` | `AdminSectionsView.tsx` | Admin homepage sections listing + builder; toolbar has Reset seed data (ConfirmDeleteModal→POST /api/demo/seed) + Manage Sections buttons (I3) |
| `AdminOrdersView` | `AdminOrdersView.tsx` | Admin orders listing — RowActionMenu "Update order" → AdminOrderEditorView SideDrawer (B2/VA9) |
| `AdminOrderEditorView` | `AdminOrderEditorView.tsx` | Admin order status + tracking SideDrawer — status select (7 statuses), trackingNumber, carrier select, refundAmount (conditional), notes; PATCH /api/admin/orders/[id] (B2/VA9) |
| `AdminUsersView` | `AdminUsersView.tsx` | Admin users listing — RowActionMenu "Manage" → AdminUserEditorView SideDrawer (B1/VA10) |
| `AdminUserEditorView` | `AdminUserEditorView.tsx` | Admin user management SideDrawer — role select, isDisabled+banReason, emailVerified, adminNotes; Delete→ConfirmDeleteModal; PATCH+DELETE /api/admin/users/[uid] (B1/VA10) |
| `AdminStoresView` | `AdminStoresView.tsx` | Admin stores listing — shows storeName + ownerId (admin only); RowActionMenu: Manage→AdminStoreEditorView SideDrawer, View→public store page (VA3/VA12) |
| `AdminStoreEditorView` | `AdminStoreEditorView.tsx` | Admin store management SideDrawer — status, adminNotes, isFeatured, isVerified, suspensionReason (conditional); PATCH /api/admin/stores/[storeId] (VA12/N3) |
| `AdminReviewsView` | `AdminReviewsView.tsx` | Admin reviews listing — RowActionMenu: Approve/Reject/Feature/Unfeature/Reply(Modal)/View(ViewReviewModal); PATCH /api/admin/reviews/[id] (N2/VA11) |
| `AdminSessionsView` | `AdminSessionsView.tsx` | Admin user sessions listing — columns: user/device/browser/OS/IP(masked)/lastActivity/expires/isActive; active-only filter; Revoke→ConfirmDeleteModal→DELETE (LL11) |
| `AdminAllEventEntriesView` | `AdminAllEventEntriesView.tsx` | Admin cross-event entries listing — status filter; Confirm/Waitlist/Cancel row actions→PATCH (LL12) |
| `AdminNotificationsView` | `AdminNotificationsView.tsx` | Admin notifications listing — type filter; Resend (POST resend)+ Delete (ConfirmDeleteModal) row actions (LL13) |
| `AdminCartsView` | `AdminCartsView.tsx` | Admin carts diagnostic view — read-only; guest/auth type filter (LL14) |
| `AdminWishlistsView` | `AdminWishlistsView.tsx` | Admin wishlist insights — read-only; Firestore collectionGroup("wishlist") cross-user data (LL15) |
| `AdminBidsView` | `AdminBidsView.tsx` | Admin bids listing — RowActionMenu: Cancel bid (disabled when already cancelled/voided), ConfirmDeleteModal (variant=warning); PATCH BID_BY_ID {status:"cancelled"} (B5/VA16) |
| `AdminPayoutsView` | `AdminPayoutsView.tsx` | Admin payouts listing — store identity (storeName/storeId, no sellerId in UI), Mark paid Modal (1 field: transactionId), CSV export button GET /api/admin/payouts/export (ARCH4) |
| `AdminAdsView` | `AdminAdsView.tsx` | Admin ads/promotions listing |
| `AdminAdEditorView` | `AdminAdEditorView.tsx` | Admin ad create/edit form |
| `AdminNewsletterView` | `AdminNewsletterView.tsx` | Admin newsletter subscribers listing — RowActionMenu: Unsubscribe (disabled when already unsubscribed); Export CSV button → blob download /api/admin/newsletter/export (B6/VA14) |
| `AdminContactView` | `AdminContactView.tsx` | Admin contact submissions listing — RowActionMenu: View (→SideDrawer), Mark read, Archive, Delete; ConfirmDeleteModal for delete (B7/VA15) |
| `AdminContactEditorView` | `AdminContactEditorView.tsx` | Admin contact SideDrawer — status badge, From section, scrollable message body, mailto reply, PATCH action=read/resolved (B7/VA15) |
| `AdminReturnRequestsView` | `AdminReturnRequestsView.tsx` | Admin return requests queue — orders filtered to RETURN_REQUESTED; RowActionMenu: Approve(→REFUNDED)/Reject(→DELIVERED) each with ConfirmDeleteModal (LL16) |
| `AdminStoreAddressesView` | `AdminStoreAddressesView.tsx` | Admin store addresses — read-only overview via collectionGroup("addresses"); optional storeId filter; no mutations (LL17) |
| `AdminAnalyticsView` | `AdminAnalyticsView.tsx` | Admin analytics dashboard — revenue + orders charts, top products table; accepts startDate/endDate forwarded to Firebase Function (VA19) |
| `AdminMediaView` | `AdminMediaView.tsx` | Admin media library — upload sandbox with copy-URL button (clipboard); browse-existing grid deferred to I4 (VA18) |
| `AdminSiteView` | `AdminSiteView.tsx` | Admin site settings — 12-group tabbed form (branding/appearance/announcement/SEO/contact/watermark/fees/integrations/shipping/auctions/limits/legal); singleton doc at site_settings/global (VA8) |
| `AdminFeatureFlagsView` | `AdminFeatureFlagsView.tsx` | Admin feature flags — per-flag toggle + rollout % input (0–100, disabled when flag off); GET/PUT /api/admin/feature-flags → siteSettings.featureFlags + featureFlagRollouts (VA17) |
| `AdminNavigationView` | `AdminNavigationView.tsx` | Admin navigation CMS — drag-reorder table, inline visibility toggle, RowActionMenu (Edit→SideDrawer, Delete→ConfirmDeleteModal) (F5/VA7) |
| `AdminNavEditorView` | `AdminNavEditorView.tsx` | Admin nav item create/edit SideDrawer — 6 fields: label, href, icon, parent (DynSelect), order, visible toggle; POST/PATCH /api/admin/navigation (F5/VA7) |
| `AdminSessionsManager` | `AdminSessionsManager.tsx` | Admin session management UI |
| `BrandQuickCreateForm` | `BrandQuickCreateForm.tsx` | Inline brand create (used in InlineCreateSelect) |
| `CategoryQuickCreateForm` | `CategoryQuickCreateForm.tsx` | Inline category create (used in InlineCreateSelect) |
| `DemoSeedView` | `DemoSeedView.tsx` | Seed data panel wrapper |

---

## Seller Feature Components — `appkit/src/features/seller/components/`

| Name | File | What it does |
|------|------|-------------|
| `SellerDashboardView` | `SellerDashboardView.tsx` | Seller home dashboard |
| `SellerProductsView` | `SellerProductsView.tsx` | Seller products listing |
| `SellerAuctionsView` | `SellerAuctionsView.tsx` | Seller auctions listing |
| `SellerOrdersView` | `SellerOrdersView.tsx` | Seller orders listing |
| `SellerCouponsView` | `SellerCouponsView.tsx` | Seller coupons listing |
| `SellerOffersView` | `SellerOffersView.tsx` | Seller offers listing |
| `SellerPayoutsView` | `SellerPayoutsView.tsx` | Seller payouts listing |
| `SellerAnalyticsView` | `SellerAnalyticsView.tsx` | Seller analytics charts |
| `SellerStorefrontView` | `SellerStorefrontView.tsx` | Seller storefront edit form |
| `SellerStoreView` | `SellerStoreView.tsx` | Seller store detail |
| `SellerStoreSetupView` | `SellerStoreSetupView.tsx` | Seller onboarding store setup |
| `SellerAddressesView` | `SellerAddressesView.tsx` | Seller pickup addresses list |
| `SellerCreateProductView` | `SellerCreateProductView.tsx` | Seller create product form |
| `SellerEditProductView` | `SellerEditProductView.tsx` | Seller edit product form |
| `SellerGuideView` | `SellerGuideView.tsx` | Seller guide/help page |
| `SellerShippingView` | `SellerShippingView.tsx` | Seller shipping config form |
| `SellerPayoutSettingsView` | `SellerPayoutSettingsView.tsx` | Seller payout settings form |
| `SellerPayoutHistoryTable` | `SellerPayoutHistoryTable.tsx` | Payout history table component |
| `SellerPayoutStats` | `SellerPayoutStats.tsx` | Payout stats summary |
| `SellersListView` | `SellersListView.tsx` | Public sellers listing page |
| `CategoryInlineSelect` | `CategoryInlineSelect.tsx` | Async searchable category selector; `allowCreate` prop enables CategoryQuickCreateForm inline |
| `BrandInlineSelect` | `BrandInlineSelect.tsx` | Async searchable brand selector with inline BrandQuickCreateForm (allowCreate defaults to true) |

---

## Account / User Feature Components — `appkit/src/features/account/components/`

| Name | File | What it does |
|------|------|-------------|
| `UserAccountHubView` | `UserAccountHubView.tsx` | User account hub / dashboard |
| `ProfileView` | `ProfileView.tsx` | User profile display + edit |
| `UserAddressesView` | `UserAddressesView.tsx` | User address book list |
| `UserOrdersView` | `UserOrdersView.tsx` | User order history list |
| `UserReturnsView` | `UserReturnsView.tsx` | User return/refund requests list |
| `OrderDetailView` | `OrderDetailView.tsx` | User order detail (items/address/tracking) |
| `UserOrderTrackView` | `UserOrderTrackView.tsx` | Order tracking status view |
| `UserNotificationsView` | `UserNotificationsView.tsx` | User notifications list |
| `UserOffersView` | `UserOffersView.tsx` | User offers list |
| `BecomeSellerView` | `BecomeSellerView.tsx` | Become a seller landing page |
| `ChatList` | `ChatList.tsx` | Conversation list for messaging |

---

## Other Feature Views

| Name | Path | What it does |
|------|------|-------------|
| `WishlistView` | `features/wishlist/components/WishlistView.tsx` | User wishlist product grid |
| `WishlistToggleButton` | `features/wishlist/components/WishlistToggleButton.tsx` | Heart toggle button for wishlisting a product |
| `ProductsView` | `features/products/components/ProductsView.tsx` | Public standard products listing |
| `AuctionsView` | `features/products/components/AuctionsView.tsx` | Public auctions listing |
| `PreOrdersView` | `features/products/components/PreOrdersView.tsx` | Public pre-orders listing |
| `ProductDetailView` | `features/products/components/ProductDetailView.tsx` | Standard product detail page |
| `PreOrderDetailView` | `features/products/components/PreOrderDetailView.tsx` | Pre-order detail page |
| `BuyBar` | `features/products/components/BuyBar.tsx` | Sticky buy/bid bar on product detail |
| `ProductFeatureBadges` | `features/products/components/ProductFeatureBadges.tsx` | Featured/promoted/new/sale badges |
| `ReviewsListView` | `features/reviews/components/ReviewsListView.tsx` | Reviews listing for a product/store |
| `ReviewSummary` | `features/reviews/components/ReviewSummary.tsx` | Star rating summary + distribution |
| `EventsListView` | `features/events/components/EventsListView.tsx` | Public events listing |
| `EventDetailView` | `features/events/components/EventDetailView.tsx` | Event detail page (reference impl for render props) |
| `EventStatusBadge` | `features/events/components/EventStatusBadge.tsx` | Event status pill |
| `CategoriesListView` | `features/categories/components/CategoriesListView.tsx` | Public categories listing |
| `CategoryProductsView` | `features/categories/components/CategoryProductsView.tsx` | Products within a category |
| `CategoryTree` | `features/categories/components/CategoryTree.tsx` | Hierarchical category tree nav |
| `BreadcrumbTrail` | `features/categories/components/BreadcrumbTrail.tsx` | Category breadcrumb |
| `StoreProductsView` | `features/stores/components/StoreProductsView.tsx` | Products on a store page |
| `StoreAuctionsView` | `features/stores/components/StoreAuctionsView.tsx` | Auctions on a store page |
| `StoreReviewsView` | `features/stores/components/StoreReviewsView.tsx` | Reviews on a store page |
| `StoreNavTabs` | `features/stores/components/StoreNavTabs.tsx` | Store page tab navigation |
| `SearchView` | `features/search/components/SearchView.tsx` | Search results page |
| `SearchFiltersRow` | `features/search/components/SearchFiltersRow.tsx` | Search filter chips row |
| `SearchResultsSection` | `features/search/components/SearchResultsSection.tsx` | One result group (products/events/etc.) |
| `HomepageView` | `features/homepage/components/HomepageView.tsx` | Full homepage section renderer |
| `HeroBanner` | `features/homepage/components/HeroBanner.tsx` | Hero banner component |
| `NewsletterBanner` | `features/homepage/components/NewsletterBanner.tsx` | Newsletter subscribe banner |
| `PromoGrid` | `features/homepage/components/PromoGrid.tsx` | Promotional grid section |
| `TrustBadges` | `features/homepage/components/TrustBadges.tsx` | Trust/guarantee badges row |
| `HomepageCustomerReviewsSection` | `features/homepage/components/HomepageCustomerReviewsSection.tsx` | Homepage reviews section |
| `AboutView` | `features/about/components/AboutView.tsx` | About page |
| `ContactForm` | `features/contact/components/ContactForm.tsx` | Contact form |
| `ContactPageView` | `features/contact/components/ContactPageView.tsx` | Contact page with form + info |
| `FAQCategorySidebar` | `features/faq/components/FAQCategorySidebar.tsx` | FAQ category filter sidebar |
| `RelatedFAQs` | `features/faq/components/RelatedFAQs.tsx` | Related FAQs section |
| `ForgotPasswordView` | `features/auth/components/ForgotPasswordView.tsx` | Forgot password flow |
| `ResetPasswordView` | `features/auth/components/ResetPasswordView.tsx` | Reset password flow |
| `RegisterForm` | `features/auth/components/RegisterForm.tsx` | Registration form |
| `SocialAuthButtons` | `features/auth/components/SocialAuthButtons.tsx` | Google/Facebook OAuth buttons |
| `MediaUploadField` | `features/media/upload/MediaUploadField.tsx` | All image/file upload fields (supports upload + YouTube + external URL tabs) |
| `MediaPickerModal` | `features/media/MediaPickerModal.tsx` | Upload + URL tab media picker modal |
| `ImageUpload` | `features/media/upload/ImageUpload.tsx` | Simple image upload (used in admin editors) |
| `ImageCropModal` | `features/media/modals/ImageCropModal.tsx` | In-browser image crop |
| `MediaImage` | `features/media/MediaImage.tsx` | Image with `/api/media/` proxy URL support |
| `MediaAvatar` | `features/media/MediaAvatar.tsx` | Avatar using `/api/media/` proxy |
| `BeforeAfterGallery` | `features/before-after/components/BeforeAfterGallery.tsx` | Before/after comparison gallery |
| `WhatsAppChatButton` | `features/whatsapp-bot/components/WhatsAppChatButton.tsx` | WhatsApp chat floating button |
| `CoinsDisplay` | `features/loyalty/components/CoinsDisplay.tsx` | Loyalty coin balance display |
| `OrderFilters` | `features/orders/components/OrderFilters.tsx` | Order filter bar |
| `PreOrderBadge` | `features/pre-orders/components/PreOrderBadge.tsx` | Pre-order status badge |
| `CheckoutSuccessView` | `features/cart/components/CheckoutSuccessView.tsx` | Post-checkout success screen |
| `CheckoutAddressStep` | `features/cart/components/CheckoutAddressStep.tsx` | Checkout address selection step |

---

## Hooks — `appkit/src/features/*/hooks/`

Import: `import { useX } from "@mohasinac/appkit/client"`

| Name | Path | What it does |
|------|------|-------------|
| `useUrlTable` | `(re-exported from client)` | URL-backed pagination + sort + search state for listing pages |
| `usePendingFilters` | `(re-exported from client)` | Deferred filter state (apply-on-submit) |
| `useToast` | `(re-exported from client)` | Show success/error/info toast notifications |
| `useAuth` | `features/auth/hooks/useAuth.ts` | Current user auth state + Firebase Auth |
| `useRBAC` | `features/auth/hooks/useRBAC.ts` | Role-based access control checks |
| `useLogout` | `features/auth/hooks/useLogout.ts` | Sign out action |
| `useCart` | `features/cart/hooks/useCart.ts` | Cart state (auth + guest merged) |
| `useCartCount` | `features/cart/hooks/useCartCount.ts` | Cart item count for nav badge |
| `useGuestCart` | `features/cart/hooks/useGuestCart.ts` | localStorage guest cart |
| `useAddToCart` | `features/cart/hooks/useAddToCart.ts` | Add item to cart action |
| `useGuestCartMerge` | `features/cart/hooks/useGuestCartMerge.ts` | Merge guest cart on login |
| `useCheckout` | `features/checkout/hooks/useCheckout.ts` | Checkout flow state machine |
| `usePaymentCheckout` | `features/checkout/hooks/usePaymentCheckout.ts` | Razorpay payment integration |
| `useWishlistWithGuest` | `features/wishlist/hooks/useWishlistWithGuest.ts` | Wishlist with guest fallback |
| `useWishlistToggle` | `features/wishlist/hooks/useWishlistToggle.ts` | Toggle item in/out of wishlist |
| `useWishlist` | `features/wishlist/hooks/useWishlist.ts` | Auth user wishlist |
| `useGuestWishlist` | `features/wishlist/hooks/useGuestWishlist.ts` | localStorage guest wishlist |
| `useUserWishlist` | `features/wishlist/hooks/useUserWishlist.ts` | User wishlist data fetcher |
| `useProfile` | `features/account/hooks/useProfile.ts` | Current user profile read/update |
| `useChangePassword` | `features/auth/hooks/useAuth.ts` | Reauthenticate + change password (also exported from `client.ts`) |
| `useChangeEmail` | `features/auth/hooks/useAuth.ts` | Reauthenticate + `verifyBeforeUpdateEmail`; sends verification link to new address (also exported from `client.ts`) |
| `useSetDefaultAddress` | `features/account/hooks/useAddresses.ts` | Set an address as default (`{ addressId }`) |
| `useDeleteAddress` | `features/account/hooks/useAddresses.ts` | Delete an address (`{ id }`) |
| `useAddresses` | `features/account/hooks/useAddresses.ts` | User address list |
| `useAddressForm` | `features/account/hooks/useAddressForm.ts` | Address create/edit form state |
| `useAddressSelector` | `features/account/hooks/useAddressSelector.ts` | Address selector dropdown |
| `useNotifications` | `features/account/hooks/useNotifications.ts` | User notifications list + mark read |
| `useAccount` | `features/account/hooks/useAccount.ts` | Combined account data |
| `useAdmin` | `features/admin/hooks/useAdmin.ts` | Admin data fetching |
| `useAdminListingData` | `features/admin/hooks/useAdminListingData.ts` | Admin listing page data hook |
| `useAdminSectionsListing` | `features/admin/hooks/useAdminSectionsListing.ts` | Admin sections listing |
| `useRealtimeBids` | `features/auctions/hooks/useRealtimeBids.ts` | Live bid updates for auctions |
| `usePlaceBid` | `features/auctions/hooks/usePlaceBid.ts` | Place a bid action |
| `useAuctions` | `features/auctions/hooks/useAuctions.ts` | Auctions listing data |
| `useProducts` | `features/products/hooks/useProducts.ts` | Products listing data |
| `useProductDetail` | `features/products/hooks/useProductDetail.ts` | Single product data |
| `useRelatedProducts` | `features/products/hooks/useRelatedProducts.ts` | Related products for a product |
| `useBrands` | `features/products/hooks/useBrands.ts` | Brands list |
| `usePreOrders` | `features/pre-orders/hooks/usePreOrders.ts` | Pre-orders listing data |
| `useCategories` | `features/categories/hooks/useCategories.ts` | Categories list |
| `useCategoryTree` | `features/categories/hooks/useCategoryTree.ts` | Hierarchical category tree |
| `useCategorySelector` | `features/categories/hooks/useCategorySelector.ts` | Category dropdown selector |
| `useStores` | `features/stores/hooks/useStores.ts` | Stores listing data |
| `useStoreAddressSelector` | `features/stores/hooks/useStoreAddressSelector.ts` | Store address dropdown |
| `useSellerStore` | `features/seller/hooks/useSellerStore.ts` | Current seller's store data |
| `useSellerListingData` | `features/seller/hooks/useSellerListingData.ts` | Seller listing page data |
| `useSellerPayouts` | `features/seller/hooks/useSellerPayouts.ts` | Seller payout data |
| `useSellerStorefront` | `features/seller/hooks/useSellerStorefront.ts` | Seller storefront edit |
| `useBecomeSeller` | `features/seller/hooks/useBecomeSeller.ts` | Seller onboarding flow |
| `useOrders` | `features/orders/hooks/useOrders.ts` | Orders listing data |
| `useReviews` | `features/reviews/hooks/useReviews.ts` | Reviews data |
| `useCreateReview` | `features/reviews/hooks/useCreateReview.ts` | Submit a new review |
| `useEvents` | `features/events/hooks/useEvents.ts` | Events listing |
| `useEvent` | `features/events/hooks/useEvent.ts` | Single event data |
| `useBulkEvent` | `features/events/hooks/useBulkEvent.ts` | Bulk event actions |
| `useBlog` | `features/blog/hooks/useBlog.ts` | Blog posts data |
| `useFAQs` | `features/faq/hooks/useFAQs.ts` | FAQs data |
| `useFaqList` | `features/faq/hooks/useFaqList.ts` | FAQ listing with filters |
| `useFaqVote` | `features/faq/hooks/useFaqVote.ts` | Vote FAQ as helpful |
| `useSearch` | `features/search/hooks/useSearch.ts` | Search query + results |
| `useNavSuggestions` | `features/search/hooks/useNavSuggestions.ts` | Nav search typeahead suggestions |
| `useHomepage` | `features/homepage/hooks/useHomepage.ts` | Homepage sections data |
| `useHomepageSections` | `features/homepage/hooks/useHomepageSections.ts` | Homepage sections list |
| `useHeroCarousel` | `features/homepage/hooks/useHeroCarousel.ts` | Carousel slides data |
| `useFeaturedProducts` | `features/homepage/hooks/useFeaturedProducts.ts` | Featured products for homepage |
| `useFeaturedAuctions` | `features/homepage/hooks/useFeaturedAuctions.ts` | Featured auctions |
| `useFeaturedPreOrders` | `features/homepage/hooks/useFeaturedPreOrders.ts` | Featured pre-orders |
| `useFeaturedStores` | `features/homepage/hooks/useFeaturedStores.ts` | Featured stores |
| `useActiveAd` | `features/homepage/hooks/useActiveAd.ts` | Active ad slot fetcher |
| `useMedia` | `features/media/hooks/useMedia.ts` | Media upload/manage |
| `useNewsletter` | `features/homepage/hooks/useNewsletter.ts` | Newsletter subscribe |
| `usePayments` | `features/payments/hooks/usePayments.ts` | Payment processing |
| `useCouponValidate` | `features/promotions/hooks/useCouponValidate.ts` | Validate coupon code |
| `useLoyaltyBalance` | `features/loyalty/hooks/useLoyaltyBalance.ts` | Loyalty coin balance |
| `useBottomActions` | `features/layout/hooks/useBottomActions.ts` | Mobile bottom action bar |
| `useBeforeAfter` | `features/before-after/hooks/useBeforeAfter.ts` | Before/after gallery state |
| `useAuthEvent` | `features/auth/hooks/useAuthEvent.ts` | Auth state change events |

---

## Repositories — `appkit/src/repositories/`

Import: `import { xRepository } from "@mohasinac/appkit"` (server-only)

| Name | Instance | Collection | Notes |
|------|----------|-----------|-------|
| `userRepository` | singleton | `users` | Auth + profile reads/writes |
| `sessionRepository` | singleton | `sessions` | User session management |
| `addressRepository` | singleton | `addresses` | User shipping addresses |
| `productRepository` | singleton | `products` | Standard + auction + pre-order products |
| `orderRepository` | singleton | `orders` | Orders |
| `reviewRepository` | singleton | `reviews` | Product/store reviews |
| `bidRepository` | singleton | `bids` | Auction bids |
| `cartRepository` | singleton | `carts` | Shopping carts (auth + guest) |
| `storeRepository` | singleton | `stores` | Seller stores |
| `storeAddressRepository` | singleton | `storeAddresses` | Store pickup locations |
| `siteSettingsRepository` | singleton | `siteSettings` (singleton doc) | Global site config |
| `notificationRepository` | singleton | `notifications` | User notifications |
| `chatRepository` | singleton | (RTDB) | Real-time messages |
| `carouselRepository` | singleton | `carouselSlides` | Carousel slides |
| `homepageSectionsRepository` | singleton | `homepageSections` | Homepage section configs |
| `categoriesRepository` | singleton | `categories` | Product categories |
| `couponsRepository` | singleton | `coupons` | Discount coupons |
| `faqsRepository` | singleton | `faqs` | FAQs |
| `blogRepository` | singleton | `blogPosts` | Blog posts |
| `payoutRepository` | singleton | `payouts` | Seller payouts |
| `offerRepository` | singleton | `offers` | Buyer offers |
| `wishlistRepository` | singleton | `wishlists` | User wishlists |
| `eventRepository` | singleton | `events` | Events |
| `eventEntryRepository` | singleton | `eventEntries` | Event registrations |
| `newsletterRepository` | singleton | `newsletter` | Newsletter subscribers |
| `brandsRepository` | singleton | `brands` | Product brands |
| `productTemplateRepository` | singleton | `product_templates` | Seller product templates (create, edit, delete, list by store) |

---

## Utilities — `appkit/src/utils/`

Import: `import { x } from "@mohasinac/appkit"` or `"@mohasinac/appkit/client"`

| Name / Export | File | What it does |
|--------------|------|-------------|
| `slugify`, `toTitleCase`, `truncate`, `formatPhoneNumber` | `string.formatter.ts` | String manipulation |
| `formatPrice`, `formatPaise`, `formatNumber`, `paise`, `rupees` | `number.formatter.ts` | Number/currency formatting (paise ↔ ₹) |
| `formatDate`, `formatRelativeTime`, `formatDateRange` | `date.formatter.ts` | Date display formatting |
| `generateMediaFilename` | `id-generators.ts` | SEO slug filename generator for all media types |
| `generateOrderId`, `generateBidId`, `generateReviewId`, `generatePayoutId` | `id-generators.ts` | Semantic ID generators |
| `buildSchemaUI` | `schema-ui.ts` | Builds UI config from Firestore schema field defs |
| `convertType` | `type.converter.ts` | Type conversion helpers |
| `getCookie`, `setCookie`, `deleteCookie` | `cookie.converter.ts` | Cookie read/write |
| `isBusinessDay`, `addBusinessDays` | `business-day.ts` | Business calendar logic |
| `EventManager`, `createEventManager` | `event-manager.ts` | Pub/sub event bus |
| `pick`, `omit`, `deepMerge` | `object.helper.ts` | Object utilities |
| `chunk`, `unique`, `groupBy` | `array.helper.ts` | Array utilities |
| `buildPaginationModel`, `getPaginationRange` | `pagination.helper.ts` | Pagination math |
| `buildSortModel` | `sorting.helper.ts` | Sort state builder |
| `buildFilterModel` | `filter.helper.ts` | Filter state builder |
| `easeInOut`, `lerp` | `animation.helper.ts` | Animation math helpers |
| `hexToRgb`, `rgbToHex`, `adjustBrightness` | `color.helper.ts` | Color manipulation |
| `buildMediaField`, `isMediaField` | `media-field.ts` | Media field type guards |

---

## Constants — `appkit/src/constants/`

Import: `import { ADMIN_ENDPOINTS } from "@mohasinac/appkit"` (or `/client`)

| Name | File | Notable keys / What it does |
|------|------|-------------|
| `ADMIN_ENDPOINTS` | `api-endpoints.ts` | All `/api/admin/*` strings. Notable: `PAYOUT_BY_ID(id)` → `/api/admin/payouts/${id}`; `PAYOUTS_EXPORT` → `/api/admin/payouts/export` (CSV download); `PAYOUTS_WEEKLY` → weekly payout trigger; `NAVIGATION` → `/api/admin/navigation` |
| `STORE_ENDPOINTS` | `api-endpoints.ts` | All `/api/stores/*` route strings |
| `SELLER_ENDPOINTS` | `api-endpoints.ts` | All `/api/seller/*` / store-management route strings |
| `USER_ENDPOINTS` | `api-endpoints.ts` | All `/api/user/*` route strings |
| `ORDER_ENDPOINTS` | `api-endpoints.ts` | All `/api/orders/*` route strings |
| `PRODUCT_ENDPOINTS` | `api-endpoints.ts` | All `/api/products/*` route strings |
| `AUCTION_ENDPOINTS` | `api-endpoints.ts` | All `/api/auctions/*` route strings |
| `BID_ENDPOINTS` | `api-endpoints.ts` | All `/api/bids/*` route strings |
| `CART_ENDPOINTS` | `api-endpoints.ts` | All `/api/cart/*` route strings |
| `CATEGORY_ENDPOINTS` | `api-endpoints.ts` | All `/api/categories/*` route strings |
| `REVIEW_ENDPOINTS` | `api-endpoints.ts` | All `/api/reviews/*` route strings |
| `BLOG_ENDPOINTS` | `api-endpoints.ts` | All `/api/blog/*` route strings |
| `FAQ_ENDPOINTS` | `api-endpoints.ts` | All `/api/faqs/*` route strings |
| `EVENT_ENDPOINTS` | `api-endpoints.ts` | All `/api/events/*` route strings |
| `SEARCH_ENDPOINTS` | `api-endpoints.ts` | All `/api/search/*` route strings |
| `MEDIA_ENDPOINTS` | `api-endpoints.ts` | All `/api/media/*` route strings |
| `DEMO_ENDPOINTS` | `api-endpoints.ts` | All `/api/demo/*` strings. Notable: `SEED` → `/api/demo/seed` (POST load/delete, GET counts) |
| `ROUTES` | `appkit/src/next/routing/route-map.ts` | All page routes (ROUTES.PUBLIC.* / ROUTES.ADMIN.* / ROUTES.STORE.* / ROUTES.USER.*) |
| `ACTION_ID` | `features/products/constants/action-defs.ts` | String constants for all 11 product/listing action IDs (buy-now, add-to-cart, add-to-wishlist, remove-from-wishlist, make-offer, share, place-bid, buy-now-auction, watch-auction, reserve-now, cancel-reservation) |
| `ACTION_META` | `features/products/constants/action-defs.ts` | Metadata record for each `ActionId` — `{ id, label, variant, iconName?, requiresAuth? }` |
| `DETAIL_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered action IDs for detail page panels: `product`, `auction`, `preorder` keys |
| `MOBILE_PRIMARY_ACTIONS` | `features/products/constants/action-defs.ts` | 1–2 primary CTA IDs for mobile BuyBar per listing type |
| `LISTING_BULK_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered action IDs for BulkActionsBar per listing page (`products`, `auctions`, `preorders`, `stores`) |
| `ROW_ACTION_ID` | `features/products/constants/action-defs.ts` | String constants for 17 row/table action IDs (row-edit, row-view, row-delete, row-approve, row-reject, row-suspend, row-restore, row-manage, row-duplicate, row-export, row-track, row-cancel, row-refund, row-resend, row-reply, row-publish, row-archive) |
| `ROW_ACTION_META` | `features/products/constants/action-defs.ts` | Metadata record for each `RowActionId` — `{ id, label, iconName?, destructive?, separator? }` |
| `ADMIN_ROW_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered row action IDs per admin entity type (users, stores, products, orders, reviews, events, payouts, coupons, blog, faqs, bids) |
| `SELLER_ROW_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered row action IDs per seller entity type (products, orders, reviews, payouts, coupons, bids, addresses) |
| `USER_ROW_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered row action IDs per user entity type (orders, addresses, bids) |
| `ADMIN_BULK_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered bulk action IDs per admin listing entity (uses RowActionId values) |
| `SELLER_BULK_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered bulk action IDs per seller listing entity |
| `FORM_ACTION_ID` | `features/products/constants/action-defs.ts` | String constants for 7 form action IDs (form-submit, form-cancel, form-reset, form-save-draft, form-publish, form-delete, form-discard) |
| `FORM_ACTION_META` | `features/products/constants/action-defs.ts` | Metadata record for each `FormActionId` — `{ id, label, variant, type, iconName?, destructive? }`. Used as defaults by `FormShell` and `DrawerFormFooter`. |
| `FORM_FOOTER_PRESET` | `features/products/constants/action-defs.ts` | Named groups of FormActionIds for common footer layouts: `drawerEdit`, `drawerEditDelete`, `contentEditor`, `modalForm`, `settingsForm` |
| `DASHBOARD_QUICK_ACTION_ID` | `features/products/constants/action-defs.ts` | String constants for 17 dashboard quick action IDs (admin/seller/user shortcut buttons) |
| `DASHBOARD_QUICK_ACTION_META` | `features/products/constants/action-defs.ts` | Metadata record for each `DashboardQuickActionId` — `{ id, label, variant, iconName?, routeKey? }` |
| `DASHBOARD_QUICK_ACTIONS` | `features/products/constants/action-defs.ts` | Ordered quick action IDs per dashboard type: `admin`, `seller`, `user` |
