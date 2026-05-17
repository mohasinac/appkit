"use client";

// Client-only public exports

// Provider registration — pure contract modules with zero server dependencies.
// Exported here so consumers can import registration functions from
// @mohasinac/appkit/client without pulling in firebase-admin or other server code.
export {
  registerClientAuthProvider,
  getClientAuthProvider,
  type IClientAuthProvider,
} from "./contracts/client-auth";
export {
  registerClientRealtimeProvider,
  getClientRealtimeProvider,
  type IClientRealtimeProvider,
  type RealtimeSnapshot,
  type Unsubscribe,
} from "./contracts/client-realtime";
export {
  registerClientSessionAdapter,
  getClientSessionAdapter,
  type IClientSessionAdapter,
  type AdapterAuthUser,
  type AuthUnsubscribe,
} from "./contracts/client-session";

// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ConfirmDeleteModal - Component for confirm delete modal.
export { ConfirmDeleteModal } from "./ui/components/ConfirmDeleteModal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// Drawer - Component for drawer.
export { Drawer } from "./ui/components/Drawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FilterDrawer - Component for filter drawer.
export { FilterDrawer } from "./ui/components/FilterDrawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// Modal - Component for modal.
export { Modal } from "./ui/components/Modal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// SideDrawer - Component for side drawer.
export { SideDrawer } from "./ui/components/SideDrawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// SideModal - Component for side modal.
export { SideModal } from "./ui/components/SideModal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// UnsavedChangesModal - Component for unsaved changes modal.
export { UnsavedChangesModal } from "./ui/components/UnsavedChangesModal";
// [CLIENT-ONLY]-Cannot run in SSR mode — uses browser-only APIs (window.location).
// LoginRequiredModal - Modal prompting unauthenticated users to log in.
export { LoginRequiredModal } from "./ui/components/LoginRequiredModal";
export type { LoginRequiredModalProps } from "./ui/components/LoginRequiredModal";
// isAuthError - Detects auth/authorization errors from server actions or fetch responses.
export { isAuthError } from "./utils/auth-error";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useToast - React hook for use toast.
export { useToast } from "./ui/components/Toast";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useAuth - React hook for use auth.
export { useAuth } from "./react/contexts/SessionContext";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useCamera - React hook for use camera.
export { useCamera } from "./react/hooks/useCamera";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useClickOutside - React hook for use click outside.
export { useClickOutside } from "./react/hooks/useClickOutside";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useContainerGrid - React hook for use container grid.
export { useContainerGrid } from "./react/hooks/useContainerGrid";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useGesture - React hook for use gesture.
export { useGesture } from "./react/hooks/useGesture";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useKeyPress - React hook for use key press.
export { useKeyPress } from "./react/hooks/useKeyPress";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaQuery - React hook for use media query.
export { useMediaQuery } from "./react/hooks/useMediaQuery";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// usePullToRefresh - React hook for use pull to refresh.
export { usePullToRefresh } from "./react/hooks/usePullToRefresh";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useSwipe - React hook for use swipe.
export { useSwipe } from "./react/hooks/useSwipe";
// [CLIENT-ONLY]-Cannot run in SSR mode — uses IntersectionObserver.
// useInfiniteScroll - IntersectionObserver primitive for cursor-based listings (Q6 — S13).
export { useInfiniteScroll } from "./react/hooks/useInfiniteScroll";
export type {
  UseInfiniteScrollOptions,
  UseInfiniteScrollResult,
} from "./react/hooks/useInfiniteScroll";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useTheme - React hook for use theme.
export { useTheme } from "./react/contexts/ThemeContext";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useUnsavedChanges - React hook for use unsaved changes.
export { useUnsavedChanges } from "./react/hooks/useUnsavedChanges";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useVisibleItems - React hook for use visible items.
export { useVisibleItems } from "./react/hooks/useVisibleItems";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FirebaseClientAuthProvider - Component for firebase client auth provider.
export { FirebaseClientAuthProvider } from "./providers/firebase-client/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FirebaseClientRealtimeProvider - Component for firebase client realtime provider.
export { FirebaseClientRealtimeProvider } from "./providers/firebase-client/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// EventFormDrawer - Component for event form drawer.
export { EventFormDrawer, EventParticipateView, EventPollWidget } from "./features/events/index";
export type { EventParticipateViewProps } from "./features/events/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// BottomSheet - Shared export for bottom sheet.
export { BottomSheet } from "./features/layout/index";
export { ImageUpload } from "./features/media/index";
export type { ImageUploadProps } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ImageCropModal - Component for image crop modal.
export { ImageCropModal } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// VideoTrimModal - Component for video trim modal.
export { VideoTrimModal } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaAbort - React hook for use media abort.
export { useMediaAbort } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaCleanup - React hook for use media cleanup.
export { useMediaCleanup } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaCrop - React hook for use media crop.
export { useMediaCrop } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaTrim - React hook for use media trim.
export { useMediaTrim } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaUpload - React hook for use media upload.
export { useMediaUpload } from "./features/media/index";

// Client-side context providers
export { SessionProvider, useSession } from "./react/contexts/SessionContext";
export type { SessionProviderProps } from "./react/contexts/SessionContext";
export { ThemeProvider } from "./react/contexts/ThemeContext";
export { useUrlTable } from "./react/hooks/useUrlTable";
export type { UseUrlTableOptions } from "./react/hooks/useUrlTable";

// Client-safe constants, UI primitives, and views
export { ROUTES, PUBLIC_ROUTES, PROTECTED_ROUTES, AUTH_ROUTES } from "./constants/index";
export { Container, Grid, Row, Stack } from "./ui/components/Layout";
export { Div } from "./ui/components/Div";
export { Main, Section } from "./ui/components/Semantic";
export { Badge } from "./ui/components/Badge";
export { Button } from "./ui/components/Button";
export { Checkbox } from "./ui/components/Checkbox";
export { Input } from "./ui/components/Input";
export { OtpInput } from "./ui/components/OtpInput";
export type { OtpInputProps } from "./ui/components/OtpInput";
export { DateInput, DateRangeInput } from "./ui/components/DateInput";
export type { DateInputProps, DateRangeInputProps } from "./ui/components/DateInput";
// FormShell + context-aware fields (SB-UNI-Y-1)
export type { FormShellProps, FormShellStep, FormShellContextValue } from "./ui/forms";
export { FormShell, useFormShell } from "./ui/forms";
export type { FieldInputProps } from "./ui/forms";
export { FieldInput } from "./ui/forms";
export type { FieldSelectProps } from "./ui/forms";
export { FieldSelect } from "./ui/forms";
export type { FieldCheckboxProps } from "./ui/forms";
export { FieldCheckbox } from "./ui/forms";
export { Select } from "./ui/components/Select";
export type { SelectOption, SelectProps } from "./ui/components/Select";
export { Heading } from "./ui/components/Typography";
export { Label, Text } from "./ui/components/Typography";
export { TextLink } from "./ui/components/TextLink";
export type { TextLinkProps } from "./ui/components/TextLink";
export { Textarea } from "./ui/components/Textarea";
export { GlobalError } from "./next/components/GlobalError";
export { AppLayoutShell, LocaleSwitcher, useDashboardNav, BottomActionsProvider, DashboardNavProvider, LayoutClient, ListingLayout } from "./features/layout/index";
export type { AppLayoutShellProps, AppLayoutShellSidebarLink, AppLayoutShellSidebarSection, DashboardNavState, MainNavbarItem, LayoutClientProps, ListingLayoutProps, ListingLayoutLabels } from "./features/layout/index";
export { Search } from "./features/search/components";
export type { SearchLabels, SearchProps, SearchQuickLink, SearchRouterAdapter, SearchResourceType, SearchResourceTypeOption } from "./features/search/components";
export { ToastProvider, SkipToMain, NavigationLoader } from "./ui/index";
export type { NavigationLoaderProps } from "./ui/index";
export { ZodSetup } from "./validation/ZodSetup";
export type { ZodSetupProps } from "./validation/ZodSetup";
export { AdminSidebar } from "./features/admin/components/AdminSidebar";
export type { AdminSidebarProps, AdminNavItem, AdminNavGroup } from "./features/admin/components/AdminSidebar";
export { AdminDashboardView, AdminAnalyticsView, AdminListingScaffold, AdminPrizeDrawsView, useAdminListingData, toRecordArray, toStringValue, toRelativeDate, toRupees } from "./features/admin/index";
export type { AdminDashboardViewProps, AdminAnalyticsViewProps, AdminAnalyticsViewLabels, AdminPrizeDrawsViewProps } from "./features/admin/index";
export { ADMIN_ENDPOINTS } from "./constants/index";
export { UserSidebar } from "./features/account/components/UserSidebar";
export type { UserSidebarProps, UserNavItem, UserNavGroup } from "./features/account/components/UserSidebar";
export { CouponsIndexListing } from "./features/promotions/components/CouponsIndexListing";
export type { CouponsIndexListingProps } from "./features/promotions/components/CouponsIndexListing";
export { NotificationBell } from "./features/account/components/NotificationBell";
export { NotificationPreferencesPanel } from "./features/account/components/NotificationPreferencesPanel";
export type { NotificationPreferencesPanelProps } from "./features/account/components/NotificationPreferencesPanel";
export { AuctionBidsTable } from "./features/auctions/components/AuctionBidsTable";
export type { AuctionBidsTableProps, AuctionWithBids } from "./features/auctions/components/AuctionBidsTable";
export { ProtectedRoute, AuthStatusPanel, ForgotPasswordView, LoginForm, RegisterForm, ResetPasswordView, VerifyEmailView } from "./features/auth/index";
export type {
	AuthGuardUser,
	ForgotPasswordViewProps,
	LoginFormProps,
	LoginFormValues,
	RegisterFormProps,
	RegisterFormValues,
	ResetPasswordViewProps,
	VerifyEmailViewProps,
} from "./features/auth/index";
export { useLogout, useLogin, useGoogleLogin, useRegister, useForgotPassword, useResetPassword, useVerifyEmail, useChangePassword, useChangeEmail } from "./features/auth/index";
export type { LoginCredentials, RegisterData, ForgotPasswordData, ResetPasswordData, VerifyEmailData, ChangePasswordData, ChangeEmailData } from "./features/auth/index";
export { CartView, CartItemRow, CartSummary, CartDrawer, CheckoutView, CheckoutSuccessView, CheckoutAddressStep, useGuestCart, useCartCount, useAddToCart, useCart, useGuestCartMerge, useCartQuery } from "./features/cart/index";
export type { CartItem, CartItemMeta, CartData, GuestCartItem } from "./features/cart/index";
export { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress, useAddress } from "./features/account/index";
export type { Address, AddressFormData } from "./features/account/index";
export { AddressBook, AddressCard, AddressForm } from "./features/account/index";
export type { AddressCardAddress, AddressCardProps } from "./features/account/index";
export { useProfile, useUpdateProfile } from "./features/account/index";
export { CategoryProductsView, CategoriesListView } from "./features/categories/index";
export type { CategoryItem } from "./features/categories/index";
export { MediaImage } from "./features/media/index";
export { ReviewsListView } from "./features/reviews/index";
export { StoreSidebar, SellerSidebar } from "./features/seller/components/SellerSidebar";
export type { StoreNavItem, StoreNavGroup, SellerNavItem } from "./features/seller/components/SellerSidebar";
export { StoreProductsView, StoreAboutView } from "./features/stores/index";
export type { StoreProductItem, StoreAboutViewProps, StoreDetail } from "./features/stores/index";
export { SearchView } from "./features/search/index";
export type { SearchViewProps } from "./features/search/index";
export { UserSettingsView } from "./features/account/index";
export type { UserSettingsViewProps, UserSettingsViewLabels } from "./features/account/index";
export { AdSlot } from "./features/homepage/components/AdSlot";
export { useActiveAd } from "./features/homepage/hooks/useActiveAd";
export type { ActiveAdRecord, ActiveAdCreative } from "./features/homepage/hooks/useActiveAd";
export {
  registerAdSlot,
  registerAdSlots,
  unregisterAdSlot,
  clearAdRegistry,
  setAdConsentGranted,
  isAdConsentGranted,
  isAdSlotRenderable,
} from "./features/homepage/ad-registry";
export type { AdSlotId, AdProvider, AdSlotConfig } from "./features/homepage/ad-registry";
export { WishlistView, useGuestWishlist, useWishlistWithGuest } from "./features/wishlist/index";
export type { WishlistViewProps, GuestWishlistItem, WishlistItem, WishlistResponse, WishlistProductData, EnrichedWishlistItem } from "./features/wishlist/index";
export { WishlistCapWatcher } from "./features/wishlist/components/WishlistCapWatcher";
export { useWishlistCount, useWishlistCountWithLimit, WISHLIST_CAP_EVENT } from "./features/wishlist/hooks/useWishlistCount";
export type { WishlistCapEventDetail } from "./features/wishlist/hooks/useWishlistCount";
export {
  getGuestWishlistItems,
  addToGuestWishlist,
  removeFromGuestWishlist,
  isInGuestWishlist,
  clearGuestWishlist,
  getGuestWishlistCount,
  getGuestWishlistByType,
} from "./features/wishlist/utils/guest-wishlist";
export { InteractiveProductCard } from "./features/products/index";
export type { InteractiveProductCardProps } from "./features/products/index";
export { CompareOverlay } from "./features/products/components/CompareOverlay";
export type {
  CompareOverlayProps,
  CompareOverlayLabels,
  CompareProductLike,
} from "./features/products/components/CompareOverlay";
export { COMPARE_MAX_ITEMS } from "./features/products/constants/action-defs";

// Messages — RTDB-pinged Firestore conversations (D5 + VC7)
export { MessagesView } from "./features/account/components/MessagesView";
export type { MessagesViewProps, MessagesViewLabels } from "./features/account/components/MessagesView";
export { ChatList } from "./features/account/components/ChatList";
export type { ChatListProps, ChatListLabels } from "./features/account/components/ChatList";
export { ChatWindow } from "./features/account/components/ChatWindow";
export type { ChatWindowProps, ChatWindowLabels } from "./features/account/components/ChatWindow";
export { useConversations, useConversation } from "./features/messages/index";
export {
  CONVERSATIONS_COLLECTION,
  CONVERSATIONS_INDEXED_FIELDS,
} from "./features/messages/index";
export type {
  ConversationDocument,
  ConversationMessage,
  UseConversationsReturn,
  UseConversationReturn,
} from "./features/messages/index";
export {
  CONVERSATIONS_PING_PATH,
  CONVERSATIONS_PING_USER_PATH,
} from "./features/messages/hooks/useConversation";
// Product / listing actions
export { ACTION_ID, ACTION_META, DETAIL_ACTIONS, MOBILE_PRIMARY_ACTIONS, LISTING_BULK_ACTIONS } from "./features/products/index";
export type { ActionId, ActionMeta, ActionVariant } from "./features/products/index";
// Row / table actions (admin, seller, user dashboards)
export { ROW_ACTION_ID, ROW_ACTION_META, ADMIN_ROW_ACTIONS, SELLER_ROW_ACTIONS, USER_ROW_ACTIONS, ADMIN_BULK_ACTIONS, SELLER_BULK_ACTIONS } from "./features/products/index";
export type { RowActionId, RowActionMeta } from "./features/products/index";
// Form shell actions
export { FORM_ACTION_ID, FORM_ACTION_META, FORM_FOOTER_PRESET } from "./features/products/index";
export type { FormActionId, FormActionMeta } from "./features/products/index";
// Dashboard quick actions
export { DASHBOARD_QUICK_ACTION_ID, DASHBOARD_QUICK_ACTION_META, DASHBOARD_QUICK_ACTIONS } from "./features/products/index";
export type { DashboardQuickActionId, DashboardQuickActionMeta } from "./features/products/index";
// [CLIENT-ONLY] useAuthGate: pre-dispatch auth gate using ACTION_ID registry.
export { useAuthGate } from "./react/hooks/useAuthGate";
export type { UseAuthGateReturn } from "./react/hooks/useAuthGate";
// Action dispatch hook + panel store
export { useActionDispatch } from "./react/hooks/use-action-dispatch";
export type { DispatchAction, UseActionDispatchOptions } from "./react/hooks/use-action-dispatch";
export { usePanelStore } from "./stores/panel-store";
export { usePanelUrlSync } from "./react/hooks/use-panel-url-sync";
export type { PanelUrlSync } from "./react/hooks/use-panel-url-sync";
export { MakeOfferButton } from "./features/products/components/MakeOfferButton";
export type { MakeOfferButtonProps } from "./features/products/components/MakeOfferButton";
export { ProductDetailActions } from "./features/products/components/ProductDetailActions";
export type { ProductDetailActionsProps } from "./features/products/components/ProductDetailActions";
// productFeatures (FI6) — client-safe components + context
export {
  ProductFeaturesProvider,
  useProductFeatures,
} from "./features/products/components/ProductFeaturesContext";
export type { ProductFeaturesProviderProps } from "./features/products/components/ProductFeaturesContext";
export { FeatureBadge, FeatureBadgeList } from "./features/products/components/FeatureBadge";
export type {
  FeatureBadgeProps,
  FeatureBadgeListProps,
} from "./features/products/components/FeatureBadge";
export { SellerOffersPanel } from "./features/seller/components/SellerOffersPanel";
export type { SellerOffersPanelProps, SellerOfferAction } from "./features/seller/components/SellerOffersPanel";
export { UserOffersPanel } from "./features/account/components/UserOffersPanel";
export type { UserOffersPanelProps } from "./features/account/components/UserOffersPanel";
export { SellerDashboardView as StoreDashboardView, SellerDashboardView, useSellerDashboard as useStoreDashboard, useSellerDashboard } from "./features/seller/index";
export type { SellerDashboardViewProps as StoreDashboardViewProps, SellerDashboardViewProps } from "./features/seller/index";
export { SellerPayoutSettingsView, SellerShippingView, SellerReviewsView, SellerPayoutRequestView, SellerAnalyticsStats, SellerTopProducts, SellerAnalyticsView, SellerPayoutsView, SellerCouponEditorView, SellerBidsView, SellerAddressesView, SellerPreOrdersView, SellerPrizeDrawsView, PrintCenterView } from "./features/seller/components/index";
export type { SellerPayoutSettingsViewProps, SellerShippingViewProps, SellerReviewsViewProps, SellerPayoutRequestViewProps, SellerAnalyticsViewProps, SellerPayoutsViewProps, SellerCouponEditorViewProps, CouponEditorDraft, SellerBidsViewProps, SellerAddressesViewProps, SellerPreOrdersViewProps, SellerPrizeDrawsViewProps } from "./features/seller/components/index";
export type { SellerAnalyticsSummary, SellerAnalyticsTopProduct } from "./features/seller/types/index";
export { UserAccountHubView, UserOrdersView, OrderDetailView, UserNotificationsView, UserReturnsView, UserSupportView, useNotifications } from "./features/account/index";
export type { UserAccountHubViewProps, UserAccountHubViewLabels, UserOrdersViewProps, UserOrdersViewLabels, OrderDetailViewProps, OrderDetailViewLabels, UserNotificationsViewProps, UserNotificationsViewLabels, UserReturnsViewProps, UserReturnsViewLabels, UserSupportViewProps } from "./features/account/index";
export { useOrders, useOrder, OrdersList } from "./features/orders/index";
export { useCouponValidate } from "./features/promotions/hooks/useCouponValidate";
export { BlogPostView } from "./features/blog/components/BlogPostView";
export type { BlogPostViewProps } from "./features/blog/components/BlogPostView";
export { BlogCard, BlogCategoryTabs, BlogListView } from "./features/blog/components/BlogListView";
export { EventDetailView } from "./features/events/components/index";
export type { EventDetailViewProps } from "./features/events/components/index";
export type { EventDocument } from "./features/events/schemas/firestore";
export { PromotionsViewProductSection, PromotionsHero, PromotionsView } from "./features/promotions/components/index";
export type { PromotionsViewProductSectionProps } from "./features/promotions/components/index";
export { RichText } from "./ui/rich-text/RichText";
export { RichTextRenderer } from "./ui/rich-text/RichTextRenderer";
export type { RichTextRendererProps } from "./ui/rich-text/RichTextRenderer";
// Scam registry — pure data constants safe for client bundle
export {
  SCAM_TYPES,
  SCAM_CATEGORIES,
  SCAM_TYPE_LABELS,
  SCAM_CATEGORY_LABELS,
  getScamType,
  getScamTypesByCategory,
} from "./features/scams/constants/scam-types";
export type { ScamType, ScamCategory, ScamTypeDefinition, ScamCategoryDefinition } from "./features/scams/constants/scam-types";
export {
  SCAM_PLATFORM_LABELS,
  ScamPlatformValues,
} from "./features/scams/schemas/firestore";
export type { ScamPlatform } from "./features/scams/schemas/firestore";

// History (recently-viewed) — client hook + guest util + cap constants
export {
  useHistory,
  useHistoryMergeOnLogin,
  getGuestHistory,
  trackGuestHistory,
  removeGuestHistoryItem,
  clearGuestHistory,
  getGuestHistoryCount,
  HistoryTracker,
} from "./features/history/index";
export type {
  GuestHistoryItem,
  GuestHistoryType,
  UserHistoryItem,
  HistoryProductType,
  HistoryItemSnapshot,
} from "./features/history/index";
export type { TrackArgs as TrackHistoryArgs } from "./features/history/hooks/useHistory";
export {
  WISHLIST_MAX,
  HISTORY_MAX,
  CART_MAX_ITEMS,
} from "./constants/limits";

// SB1-G canonical listing-type accessors (pure functions, client-safe).
// SB-UNI-F 2026-05-13 — Phase 2 predicates surfaced through client barrel.
export {
  normalizeListingType,
  isAuctionListing,
  isPreOrderListing,
  isStandardListing,
  isPrizeDrawListing,
  isClassifiedListing,
  isDigitalCodeListing,
  isLiveListing,
} from "./features/products/utils/listing-type";

// SB-UNI-X4 2026-05-13 — per-type feature-flag helpers (client-safe).
export {
  isListingTypeEnabled,
  isCategoryTypeEnabled,
  enabledListingTypes,
  enabledCategoryTypes,
} from "./_internal/shared/listing-types/feature-flags";

// SB-UNI-X5 2026-05-13 — action telemetry sink (client-safe; defaults to
// a no-op + console.debug in dev).
export {
  actionTracker,
  setActionTrackerSink,
  resetActionTrackerSink,
  type ActionEvent,
  type ActionTrackerSink,
} from "./_internal/shared/listing-types/action-tracker";

// SB-UNI-S 2026-05-13 — cart-level shipping-requirement helpers (client-safe).
export {
  cartRequiresShipping,
  cartIsDigitalOnly,
  cartIsChatOnly,
} from "./_internal/shared/listing-types/cart-shipping";

// SB-UNI-W-1 2026-05-13 — CTA action registry shell (client-safe).
// Phase 7 W-2..W-4 sweeps fill the per-resource buckets surface by surface.
export {
  ACTIONS,
  action,
  act,
  canPerformAction,
  actionsForListingType,
  actionLabel,
  type ActionDef,
  type ActionKind,
  type ActionResource,
  type ActionTree,
  type ActionConfirmation,
} from "./_internal/shared/actions/action-registry";

// SB-UNI-E user-role predicates (pure functions, client-safe).
export {
  isAdminUser,
  isSellerUser,
  isModeratorUser,
  isEmployeeUser,
  isBuyerUser,
} from "./features/auth/role-predicates";

// Layout feature — client islands (unifies admin/store/user dashboard layouts).
export { DashboardLayoutClient, RoleGuard } from "./_internal/client/features/layout/index";
export type {
  DashboardLayoutClientProps,
  RoleGuardProps,
} from "./_internal/client/features/layout/index";
export type {
  LayoutBreakpoint,
  DashboardVariant,
  LayoutRole,
  SidebarNavItem,
  SidebarNavGroup,
  MainNavItem as LayoutMainNavItem,
  BrandingConfig,
  FooterConfig,
  SectionResponsive,
  SectionTheming,
  LayoutConfig,
  DashboardLayoutConfig,
} from "./_internal/shared/features/layout/index";

// Listing-type capability registry — SB-UNI X1.
export {
  LISTING_TYPE_CAPABILITIES,
  capabilityFor,
  canAddToCart,
  canBid,
  supportsShipping,
  requiresVendorVerified,
  requiresJurisdictionCheck,
  hasInstantFulfillment,
  assertNever,
} from "./_internal/shared/listing-types/capabilities";
export type { ListingTypeCapability } from "./_internal/shared/listing-types/capabilities";
export { LISTING_TYPE_REGISTRY, pluginFor } from "./_internal/shared/listing-types/_registry";
export type { ListingTypePlugin } from "./_internal/shared/listing-types/_registry";

// Media upload limits — shared by client uploaders + server sign/finalize routes.
export {
  MEGABYTE,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_VIDEO_BYTES,
  MAX_LABEL,
  MAX_BYTES,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_DOC_MIMES,
  ALLOWED_MIMES,
  ALLOWED_TYPES_LABEL,
  MIME_TO_EXT,
  PDF_MAGIC,
  VIDEO_CONVERSION_HINTS,
  classifyMime,
  isAllowedMime,
  maxBytesFor,
  getConversionHint,
} from "./_internal/shared/media/limits";
export type {
  MediaKind,
  AllowedImageMime,
  AllowedVideoMime,
  AllowedDocMime,
  AllowedMime,
} from "./_internal/shared/media/limits";

export { ScamAwarenessModal } from "./features/scams/components/ScamAwarenessModal";
export type { ScamAwarenessModalProps } from "./features/scams/components/ScamAwarenessModal";
// [CLIENT-ONLY] — Admin panel components for action/nav permission management.
export { ActionPermissionsManager } from "./features/site-settings/components/ActionPermissionsManager";
export type { ActionPermissionsManagerProps } from "./features/site-settings/components/ActionPermissionsManager";
export { NavPermissionsManager } from "./features/site-settings/components/NavPermissionsManager";
export type { NavPermissionsManagerProps, NavGroup as NavPermissionsGroup, NavItem as NavPermissionsItem } from "./features/site-settings/components/NavPermissionsManager";

// ── Classified + digital-code + live-item client views ────────────────────────
export { ClassifiedDetailView } from "./_internal/client/features/classified/ClassifiedDetailView";
export type { ClassifiedDetailViewProps } from "./_internal/client/features/classified/ClassifiedDetailView";
export { DigitalCodeDetailView } from "./_internal/client/features/digital-code/DigitalCodeDetailView";
export type { DigitalCodeDetailViewProps } from "./_internal/client/features/digital-code/DigitalCodeDetailView";
export { LiveItemDetailView } from "./_internal/client/features/live/LiveItemDetailView";
export type { LiveItemDetailViewProps } from "./_internal/client/features/live/LiveItemDetailView";

export { PhysicalLocationModal } from "./features/seller/components/PhysicalLocationModal";
export type { PhysicalLocation } from "./features/seller/components/PhysicalLocationModal";