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

// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ConfirmDeleteModal - Component for confirm delete modal.
export { ConfirmDeleteModal } from "./ui/components/ConfirmDeleteModal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// Drawer - Component for drawer.
export { Drawer } from "./ui/components/Drawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FilterDrawer - Component for filter drawer.
export { FilterDrawer } from "./ui/components/FilterDrawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// Modal - Component for modal.
export { Modal } from "./ui/components/Modal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// SideDrawer - Component for side drawer.
export { SideDrawer } from "./ui/components/SideDrawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// SideModal - Component for side modal.
export { SideModal } from "./ui/components/SideModal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// UnsavedChangesModal - Component for unsaved changes modal.
export { UnsavedChangesModal } from "./ui/components/UnsavedChangesModal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useToast - React hook for use toast.
export { useToast } from "./ui/components/Toast";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useAuth - React hook for use auth.
export { useAuth } from "./react/contexts/SessionContext";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useCamera - React hook for use camera.
export { useCamera } from "./react/hooks/useCamera";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useClickOutside - React hook for use click outside.
export { useClickOutside } from "./react/hooks/useClickOutside";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useContainerGrid - React hook for use container grid.
export { useContainerGrid } from "./react/hooks/useContainerGrid";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useGesture - React hook for use gesture.
export { useGesture } from "./react/hooks/useGesture";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useKeyPress - React hook for use key press.
export { useKeyPress } from "./react/hooks/useKeyPress";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaQuery - React hook for use media query.
export { useMediaQuery } from "./react/hooks/useMediaQuery";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// usePullToRefresh - React hook for use pull to refresh.
export { usePullToRefresh } from "./react/hooks/usePullToRefresh";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useSwipe - React hook for use swipe.
export { useSwipe } from "./react/hooks/useSwipe";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useTheme - React hook for use theme.
export { useTheme } from "./react/contexts/ThemeContext";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useUnsavedChanges - React hook for use unsaved changes.
export { useUnsavedChanges } from "./react/hooks/useUnsavedChanges";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useVisibleItems - React hook for use visible items.
export { useVisibleItems } from "./react/hooks/useVisibleItems";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FirebaseClientAuthProvider - Component for firebase client auth provider.
export { FirebaseClientAuthProvider } from "./providers/firebase-client/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FirebaseClientRealtimeProvider - Component for firebase client realtime provider.
export { FirebaseClientRealtimeProvider } from "./providers/firebase-client/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// EventFormDrawer - Component for event form drawer.
export { EventFormDrawer, EventParticipateView, EventPollWidget } from "./features/events/index";
export type { EventParticipateViewProps } from "./features/events/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// BottomSheet - Shared export for bottom sheet.
export { BottomSheet } from "./features/layout/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ImageCropModal - Component for image crop modal.
export { ImageCropModal } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// VideoTrimModal - Component for video trim modal.
export { VideoTrimModal } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaAbort - React hook for use media abort.
export { useMediaAbort } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaCleanup - React hook for use media cleanup.
export { useMediaCleanup } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaCrop - React hook for use media crop.
export { useMediaCrop } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaTrim - React hook for use media trim.
export { useMediaTrim } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€” uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
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
export { Select } from "./ui/components/Select";
export type { SelectOption, SelectProps } from "./ui/components/Select";
export { Heading } from "./ui/components/Typography";
export { Label, Text } from "./ui/components/Typography";
export { Textarea } from "./ui/components/Textarea";
export { GlobalError } from "./next/components/GlobalError";
export { AppLayoutShell, LocaleSwitcher, useDashboardNav, BottomActionsProvider, DashboardNavProvider, LayoutClient, ListingLayout } from "./features/layout/index";
export type { AppLayoutShellProps, DashboardNavState, MainNavbarItem, LayoutClientProps, ListingLayoutProps, ListingLayoutLabels } from "./features/layout/index";
export { Search } from "./features/search/components";
export type { SearchLabels, SearchProps, SearchQuickLink, SearchRouterAdapter, SearchResourceType, SearchResourceTypeOption } from "./features/search/components";
export { ToastProvider, SkipToMain, NavigationLoader } from "./ui/index";
export type { NavigationLoaderProps } from "./ui/index";
export { ZodSetup } from "./validation/ZodSetup";
export type { ZodSetupProps } from "./validation/ZodSetup";
export { AdminSidebar } from "./features/admin/components/AdminSidebar";
export type { AdminSidebarProps, AdminNavItem, AdminNavGroup } from "./features/admin/components/AdminSidebar";
export { AdminDashboardView, AdminAnalyticsView, AdminListingScaffold, useAdminListingData, toRecordArray, toStringValue, toRelativeDate, toRupees } from "./features/admin/index";
export type { AdminDashboardViewProps, AdminAnalyticsViewProps, AdminAnalyticsViewLabels } from "./features/admin/index";
export { ADMIN_ENDPOINTS } from "./constants/index";
export { UserSidebar } from "./features/account/components/UserSidebar";
export type { UserSidebarProps, UserNavItem, UserNavGroup } from "./features/account/components/UserSidebar";
export { CouponsIndexListing } from "./features/promotions/components/CouponsIndexListing";
export type { CouponsIndexListingProps } from "./features/promotions/components/CouponsIndexListing";
export { NotificationBell } from "./features/account/components/NotificationBell";
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
export { useLogout, useLogin, useGoogleLogin, useRegister, useForgotPassword, useResetPassword, useVerifyEmail } from "./features/auth/index";
export type { LoginCredentials, RegisterData, ForgotPasswordData, ResetPasswordData, VerifyEmailData } from "./features/auth/index";
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
export { MakeOfferButton } from "./features/products/components/MakeOfferButton";
export type { MakeOfferButtonProps } from "./features/products/components/MakeOfferButton";
export { SellerOffersPanel } from "./features/seller/components/SellerOffersPanel";
export type { SellerOffersPanelProps, SellerOfferAction } from "./features/seller/components/SellerOffersPanel";
export { UserOffersPanel } from "./features/account/components/UserOffersPanel";
export type { UserOffersPanelProps } from "./features/account/components/UserOffersPanel";
export { SellerDashboardView as StoreDashboardView, SellerDashboardView, useSellerDashboard as useStoreDashboard, useSellerDashboard } from "./features/seller/index";
export type { SellerDashboardViewProps as StoreDashboardViewProps, SellerDashboardViewProps } from "./features/seller/index";
export { SellerPayoutSettingsView, SellerShippingView, SellerReviewsView, SellerPayoutRequestView, SellerAnalyticsStats, SellerTopProducts, SellerAnalyticsView, SellerPayoutsView } from "./features/seller/components/index";
export type { SellerPayoutSettingsViewProps, SellerShippingViewProps, SellerReviewsViewProps, SellerPayoutRequestViewProps, SellerAnalyticsViewProps, SellerPayoutsViewProps } from "./features/seller/components/index";
export type { SellerAnalyticsSummary, SellerAnalyticsTopProduct } from "./features/seller/types/index";
export { UserAccountHubView, UserOrdersView, OrderDetailView, UserNotificationsView } from "./features/account/index";
export type { UserAccountHubViewProps, UserAccountHubViewLabels, UserOrdersViewProps, UserOrdersViewLabels, OrderDetailViewProps, OrderDetailViewLabels, UserNotificationsViewProps, UserNotificationsViewLabels } from "./features/account/index";
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
