"use client";

// Client-only public exports

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
export { EventFormDrawer } from "./features/events/index";
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
export { Heading } from "./ui/components/Typography";
export { Label, Text } from "./ui/components/Typography";
export { Textarea } from "./ui/components/Textarea";
export { GlobalError } from "./next/components/GlobalError";
export { AppLayoutShell, LocaleSwitcher, useDashboardNav, BottomActionsProvider, DashboardNavProvider, LayoutClient } from "./features/layout/index";
export type { AppLayoutShellProps, DashboardNavState, MainNavbarItem, LayoutClientProps } from "./features/layout/index";
export { Search } from "./features/search/components";
export type { SearchLabels, SearchProps, SearchQuickLink, SearchRouterAdapter } from "./features/search/components";
export { ToastProvider, SkipToMain, NavigationLoader } from "./ui/index";
export type { NavigationLoaderProps } from "./ui/index";
export { ZodSetup } from "./validation/ZodSetup";
export type { ZodSetupProps } from "./validation/ZodSetup";
export { AdminSidebar } from "./features/admin/components/AdminSidebar";
export { UserSidebar } from "./features/account/components/UserSidebar";
export type { UserSidebarProps, UserNavItem } from "./features/account/components/UserSidebar";
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
export { useLogout } from "./features/auth/index";
export { CartView, CartItemRow, CartSummary, CartDrawer, CheckoutView, CheckoutSuccessView, useGuestCart, useCartCount, useAddToCart } from "./features/cart/index";
export type { CartItem, CartItemMeta, CartData, GuestCartItem } from "./features/cart/index";
export { CategoryProductsView, CategoriesListView } from "./features/categories/index";
export type { CategoryItem } from "./features/categories/index";
export { MediaImage } from "./features/media/index";
export { ReviewsListView } from "./features/reviews/index";
export { SellerSidebar } from "./features/seller/components/SellerSidebar";
export type { SellerNavItem } from "./features/seller/components/SellerSidebar";
export { StoreProductsView } from "./features/stores/index";
export type { StoreProductItem } from "./features/stores/index";

