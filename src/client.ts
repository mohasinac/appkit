"use client";

// Client-only public exports

// [CLIENT-SAFE] Error code map + display lookup — pure constants, no server deps.
// Used by useApiMutation / useApiQuery / Button surface-error to route ApiError → toast or inline field error.
export { HTTP_ERROR_CODES, mapToHttpError } from "./errors/error-mapping";
export type { HttpErrorCode, MappedError } from "./errors/error-mapping";
export { ERROR_DISPLAY_MAP, getErrorDisplay } from "./errors/error-display-map";
// toUserMessage — the only sanctioned path from a failure to user-facing copy.
// It terminates in a constant, so a thrown value's own .message never surfaces.
export { toUserMessage, GENERIC_USER_MESSAGE } from "./errors/error-display-map";
export type { ErrorDisplayEntry } from "./errors/error-display-map";
export { RazorpayUnreachableError } from "./errors/razorpay-unreachable";

// [CLIENT-SAFE] ActionResult envelope type — for typing server-action call sites.
// Re-exported from the public utils barrel to keep the _internal/ boundary
// audit clean. Same symbols, no behavioral change.
export type { ActionResult } from "./utils/action-result";
export { isOk, unwrap } from "./utils/action-result";

// [CLIENT-SAFE] Client error class + surface-error router + reporter primitives.
// Used by useApiMutation / useApiQuery and Button's async-onclick catch.
export { ApiError, isApiError } from "./client/api/ApiError";
export { surfaceError } from "./client/api/surface-error";
export type { SurfaceErrorOptions } from "./client/api/surface-error";
export {
  reportClientError,
} from "./client/observability/reportClientError";
export type { ClientErrorPayload } from "./client/observability/reportClientError";
export {
  installClientErrorReporter,
  useClientErrorReporter,
} from "./client/observability/installClientErrorReporter";
// [CLIENT-SAFE] Error-tracker registration. The consumer calls setErrorTracker
// once at bootstrap to route every trackError() — notably the `error.digest`
// captured by ErrorView / GlobalError / ErrorBoundary — into reportClientError.
// Without a registration, trackError falls back to console.error and the digest
// (the only link to the server-side error) is lost.
export {
  setErrorTracker,
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "./monitoring/error-tracking";
export type {
  ErrorTrackerFn,
  ErrorContext,
} from "./monitoring/error-tracking";

// [CLIENT-SAFE] React Query wrappers — auto-toast / auto-inline-field-error
// on failure, optional `loadingMessage` for long ops.
export { useApiMutation } from "./client/api/useApiMutation";
export type { UseApiMutationOptions } from "./client/api/useApiMutation";
export { useApiQuery } from "./client/api/useApiQuery";
export type { UseApiQueryOptions } from "./client/api/useApiQuery";

// [CLIENT-ONLY] Maintenance UI — listing + detail + dashboard + analysis runner.
// Consumed by the /admin/maintenance/* page shims.
export {
  ServerErrorsListView,
  ServerErrorDetailView,
  MaintenanceDashboardView,
  AnalysisRunnerView,
  CloudLogsListView,
} from "./_internal/client/features/maintenance";
export type {
  ServerErrorsListViewProps,
  ServerErrorDetailViewProps,
  MaintenanceDashboardViewProps,
  CloudLogsListViewProps,
} from "./_internal/client/features/maintenance";

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

// [CLIENT-ONLY] ThemeProvider — applies a theme record to `<html>` via
// `data-theme` + inline CSS-variable writes. Tracks `prefers-color-scheme`
// when the user picks `"auto"` mode. Built-in themes ship via `./tokens/themes`.
// Re-exported through the public `./theme` barrel to keep audit-appkit-reexports
// clean (no `_internal/` symbols may surface through public barrels).
export { ThemeProvider, useTheme, buildThemeRegistry } from "./theme";
export type {
  ModePreference,
  SiteSettingsThemeInput,
  ThemeContextValue,
  ThemeProviderProps,
  ThemeRegistry,
} from "./theme";

// [CLIENT-ONLY] HandModeProvider — applies the "left-hand mode" layout
// preference to `<html>` via a `data-hand` attribute so drawers/sidebars/
// close-buttons/floating CTAs flip which screen edge they dock to.
// Re-exported through the public `./hand-mode` barrel to keep
// audit-appkit-reexports clean (no `_internal/` symbols in public barrels).
export { HandModeProvider, useHandMode } from "./hand-mode";
export type {
  HandMode,
  HandModeContextValue,
  HandModeProviderProps,
} from "./hand-mode";
export {
  BUILT_IN_THEMES,
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  REQUIRED_GRADIENT_KEYS,
  REQUIRED_THEME_TOKENS,
  getDefaultBuiltInTheme,
} from "./tokens/themes";
export type {
  GradientKey,
  RequiredThemeToken,
  ThemeMode,
  ThemeRecord,
} from "./tokens/themes";

// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ConfirmDeleteModal - Component for confirm delete modal.
export { ConfirmDeleteModal } from "./ui/components/ConfirmDeleteModal";
// S-STORE — pure-UI primitives + Seller view consumed by new dashboard pages
export { EmptyState } from "./ui/components/EmptyState";
export { Skeleton } from "./ui/components/Skeleton";
// IconBox — square-icon container primitive; was exported from index.ts only,
// missing here even though CLAUDE.md documents it as a client-usable pattern.
export { IconBox } from "./ui/components/IconBox";
export type {
  IconBoxProps,
  IconBoxRounded,
  IconBoxSize,
  IconBoxTone,
} from "./ui/components/IconBox";
export { Alert } from "./ui/components/Alert";
export type { SkeletonProps } from "./ui/components/Skeleton";
export { Divider } from "./ui/components/Divider";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/components/Tabs";
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps } from "./ui/components/Tabs";
export { TabBarShell, TabBarButton, TabsNavSelect } from "./ui/components/TabBarShell";
export type { TabBarShellProps, TabBarButtonProps, TabsNavSelectProps } from "./ui/components/TabBarShell";
export { SellerProductsView } from "./features/seller/components/SellerProductsView";
export { SellerOrderDetailPanel } from "./features/seller/components/SellerOrdersView";
export { SellerPayoutDetailContent } from "./features/seller/components/SellerPayoutsView";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// Drawer - Component for drawer.
export { Drawer } from "./ui/components/Drawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FilterDrawer - Component for filter drawer.
export { FilterDrawer } from "./ui/components/FilterDrawer";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// Modal - Component for modal.
export { Modal } from "./ui/components/Modal";
export { Form } from "./ui/components/Form";
export { QuickCreateModal } from "./ui/components/QuickCreateModal";
export type { QuickCreateModalProps } from "./ui/components/QuickCreateModal";
export { VacationBanner } from "./ui/components/VacationBanner";
export type { VacationBannerProps } from "./ui/components/VacationBanner";
export { useInlineToggle, useInlineTextEdit } from "./react/hooks/useInlineRowEdit";
export type {
  InlineEditOptions,
  InlineToggleResult,
  InlineTextResult,
} from "./react/hooks/useInlineRowEdit";
export { useFormStatePreservation } from "./react/hooks/useFormStatePreservation";
export type { FormStatePreservationOptions } from "./react/hooks/useFormStatePreservation";
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
// StickyToolbar - sticky translucent bar under the AppLayoutShell header, with a client-side dismiss/collapse toggle.
export { StickyToolbar } from "./ui/components/StickyToolbar";
export type {
  StickyToolbarProps,
  StickyToolbarOffset,
  StickyToolbarTone,
  StickyToolbarPadding,
} from "./ui/components/StickyToolbar";
export { CollapsibleSection } from "./ui/components/CollapsibleSection";
export type { CollapsibleSectionProps } from "./ui/components/CollapsibleSection";
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
// useTheme — exported above alongside the registry-aware ThemeProvider.
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useUnsavedChanges - React hook for use unsaved changes.
export { useUnsavedChanges } from "./react/hooks/useUnsavedChanges";
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
// useBulkEvent - subscribes to an enqueued async job's RTDB progress channel (Async Job Primitive).
export { useBulkEvent } from "./features/events/index";
export type { UseBulkEventOptions, UseBulkEventReturn, BulkEventStatus } from "./features/events/index";
// RTDB_PATHS - realtime database path constants (e.g. RTDB_PATHS.BULK_EVENTS for useBulkEvent).
export { RTDB_PATHS } from "./providers/db-firebase/index";
// Lottery feature — client components (safe for client bundles — no server imports)
export { LotterySlotGrid } from "./_internal/client/features/lottery/LotterySlotGrid";
export { LotteryPullForm } from "./_internal/client/features/lottery/LotteryPullForm";
export { LotteryListView } from "./_internal/client/features/lottery/LotteryListView";
export { LotteryDetailView } from "./_internal/client/features/lottery/LotteryDetailView";
export { LotteryEntriesView } from "./_internal/client/features/lottery/LotteryEntriesView";
export { LotteryAdminSlotView } from "./_internal/client/features/lottery/LotteryAdminSlotView";
export { LotteryAdminEditView } from "./_internal/client/features/lottery/LotteryAdminEditView";
export { lotteryConfigWriteSchema, lotterySlotWriteSchema } from "./features/lottery/schemas/config-write";
// The SectionForm engine + its schema-derived section builder. Client-only:
// consumer forms need these and the bare package resolves to the SERVER entry.
export { SectionForm, useSectionFormNav } from "./features/shell/SectionForm";
export type { SectionDef, SectionFormProps } from "./features/shell/SectionForm";
export { buildSectionsFromSchema } from "./features/shell/build-sections";
export { reportCreateSchema } from "./features/store-extensions/schemas/report-create-form";
export { itemRequestCreateSchema } from "./features/store-extensions/schemas/item-request-create-form";
export { supportTicketCreateSchema } from "./features/support/schemas/ticket-create-form";
export type { SupportTicketCreateValues } from "./features/support/schemas/ticket-create-form";
export { analyticsCardCreateSchema, ANALYTICS_CARD_TYPES } from "./features/store-extensions/schemas/analytics-forms";
export { QuickFormDrawer } from "./features/shell/QuickFormDrawer";
export type { QuickFormDrawerProps, QuickFieldDef } from "./features/shell/QuickFormDrawer";
export type { ItemRequestCreateValues } from "./features/store-extensions/schemas/item-request-create-form";
export type { ReportCreateValues } from "./features/store-extensions/schemas/report-create-form";
export type { LotteryConfigWriteInput } from "./features/lottery/schemas/config-write";
export { PrizeDrawLotteryDetailView } from "./_internal/client/features/lottery/PrizeDrawLotteryDetailView";
export type { LotteryConfig, LotterySlot, ClientLotterySlot, ClientLotteryConfig, LotteryPricingMode, LotteryEntryStatus } from "./features/lottery/types";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// BottomSheet - Shared export for bottom sheet.
export { BottomSheet } from "./features/layout/index";
export { ImageUpload } from "./features/media/index";
export type { ImageUploadProps } from "./features/media/index";
export { AvatarUpload } from "./features/media/index";
export type { AvatarUploadProps, ImageCropData } from "./features/media/index";
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
// ThemeProvider — exported above alongside the registry-aware variant.
export { useUrlTable } from "./react/hooks/useUrlTable";
export type { UseUrlTableOptions } from "./react/hooks/useUrlTable";
export { useBulkSelection } from "./react/hooks/useBulkSelection";
export type { UseBulkSelectionOptions, UseBulkSelectionReturn } from "./react/hooks/useBulkSelection";
export { useEntityDelete } from "./react/hooks/useEntityDelete";
export type { UseEntityDeleteOptions, UseEntityDeleteReturn } from "./react/hooks/useEntityDelete";

// Client-safe constants, UI primitives, and views
// Storefront-category form schema — isomorphic (the page parses it client-side,
// the route parses the same one server-side).
export {
  storeCategoryFormSchema,
  storeCategoryCreateSchema,
  storeCategoryUpdateSchema,
  type StoreCategoryFormValues,
} from "./features/store-extensions/schemas/store-category-form";

// Payout-method + listing-template form schemas — isomorphic: the pages parse
// them client-side and the routes parse the SAME ones server-side.
export {
  payoutMethodFormSchema,
  payoutMethodCreateSchema,
  payoutMethodUpdateSchema,
  type PayoutMethodFormValues,
} from "./features/store-extensions/schemas/payout-method-form";
export {
  groupedListingFormSchema,
  groupedListingCreateSchema,
  groupedListingUpdateSchema,
  type GroupedListingFormValues,
} from "./features/grouped/schemas/grouped-listing-form";
export {
  navItemFormSchema,
  navItemCreateSchema,
  navItemUpdateSchema,
  type NavItemFormValues,
} from "./features/admin/schemas/nav-item-form";
export {
  customRoleFormSchema,
  customRoleCreateSchema,
  customRoleUpdateSchema,
  isKnownPermission,
  type CustomRoleFormValues,
} from "./features/store-extensions/schemas/custom-role-form";
// Client-only: deliberately NOT added to `features/store-extensions/index.ts`,
// which the schema registry's import chain reaches — a "use client" React tree
// re-exported from there would be pulled into every API route (the W4 trap).
export {
  SCAMMER_STATUS_LABEL,
  SCAMMER_STATUS_BADGE,
  SCAMMER_STATUS_OPTIONS,
  toScammerStatus,
} from "./features/scams/constants/scammer-status-display";
export {
  ReviewDecisionModal,
  type ReviewDecisionModalProps,
} from "./features/store-extensions/components/ReviewDecisionModal";
export {
  moderationReviewFormSchema,
  moderationReviewUpdateSchema,
  MODERATION_REVIEWER_STATUSES,
  type ModerationReviewFormValues,
} from "./features/store-extensions/schemas/moderation-review-form";
export {
  reportReviewFormSchema,
  reportReviewUpdateSchema,
  REPORT_REVIEWER_STATUSES,
  REPORT_TERMINAL_STATUSES,
  type ReportReviewFormValues,
} from "./features/store-extensions/schemas/report-review-form";
export {
  shippingConfigFormSchema,
  SHIPPING_METHOD_OPTIONS,
  shippingConfigCreateSchema,
  shippingConfigUpdateSchema,
  type ShippingConfigFormValues,
} from "./features/store-extensions/schemas/shipping-config-form";
export {
  listingTemplateFormSchema,
  LISTING_TEMPLATE_TYPE_OPTIONS,
  listingTemplateCreateSchema,
  listingTemplateUpdateSchema,
  type ListingTemplateFormValues,
} from "./features/store-extensions/schemas/listing-template-form";

export { ROUTES, PUBLIC_ROUTES, PROTECTED_ROUTES, AUTH_ROUTES } from "./constants/index";
export { SORT_DIR, sortBy } from "./constants/sort";
export { SIEVE_OP, sieveFilter, sieveAnd, sieveMultiEq } from "./utils/sieve-builder";
export { formatCurrency } from "./utils/number.formatter";
export { Container, Grid, Row, Stack } from "./ui/components/Layout";
export { Div } from "./ui/components/Div";
export { DynamicBgDiv } from "./ui/components/DynamicBgDiv";
export type { DynamicBgDivProps } from "./ui/components/DynamicBgDiv";
export { ProgressBarFill } from "./ui/components/ProgressBarFill";
export type { ProgressBarFillProps } from "./ui/components/ProgressBarFill";
export { Main, Section, Nav, Ul, Ol, Li, Table, Thead, Tbody, Tr, Th, Td, Code, Pre, Blockquote } from "./ui/components/Semantic";
export { Badge } from "./ui/components/Badge";
export { Avatar, AvatarGroup } from "./ui/components/Avatar";
export type { AvatarProps, AvatarGroupProps } from "./ui/components/Avatar";
export { AvatarDisplay } from "./ui/components/AvatarDisplay";
export type { AvatarDisplayProps } from "./ui/components/AvatarDisplay";
export { Button } from "./ui/components/Button";
export { ClaimCouponButton } from "./ui/components/ClaimCouponButton";
export type { ClaimCouponButtonProps } from "./ui/components/ClaimCouponButton";
export { Checkbox } from "./ui/components/Checkbox";
export type { RadioItemProps } from "./ui/components/Radio";
export { RadioItem } from "./ui/components/Radio";
export { Input } from "./ui/components/Input";
export { OtpInput } from "./ui/components/OtpInput";
export type { OtpInputProps } from "./ui/components/OtpInput";
export { DateInput, DateRangeInput } from "./ui/components/DateInput";
export type { DateInputProps, DateRangeInputProps } from "./ui/components/DateInput";
// Form-state provider + context-aware fields (SB-UNI-Y-1). `useFormShell`
// here is the FormShellContext consumer hook FieldInput/FieldSelect use
// internally — unrelated to the differently-shaped `useFormShell` exported
// from features/shell (see index.ts), which just tracks a modal's isDirty
// flag. The step-wizard `FormShell` *component* this file used to export
// was dead code (no real JSX callers) and previously shadowed the real
// wizard component whenever imported from `@mohasinac/appkit/client`
// specifically; deleted 2026-08-09.
export type { FormShellProviderProps, FormShellStep, FormShellNav, FormShellContextValue, UseFormShellStateResult } from "./ui/forms";
export { FormShellProvider, FormShellContext, useFormShell, useFormShellState, applyZodIssues } from "./ui/forms";
export type { FieldInputProps } from "./ui/forms";
export { FieldInput } from "./ui/forms";
export type { FieldSelectProps } from "./ui/forms";
export { FieldSelect } from "./ui/forms";
export type { FieldCheckboxProps } from "./ui/forms";
export { FieldCheckbox } from "./ui/forms";
export type { FieldTextareaProps } from "./ui/forms";
export { FieldTextarea } from "./ui/forms";
export type { ColorPickerFieldProps } from "./ui/forms";
export { ColorPickerField } from "./ui/forms";
export type { FormErrorSummaryProps } from "./ui/forms";
export { FormErrorSummary } from "./ui/forms";
export { RecordStatusTimeline } from "./features/status-history/index";
export type { SerialisedStatusChangeEntry } from "./_internal/shared/history/types";
export type { FormErrorListProps } from "./ui/forms";
export { FormErrorList } from "./ui/forms";
export { useFormBottomActions } from "./features/layout/index";
export type { UseFormBottomActionsOptions } from "./features/layout/index";
export { OverlayContext, useIsInsideOverlay } from "./ui/components/overlay-context";
export { Select } from "./ui/components/Select";
export type { SelectOption, SelectProps } from "./ui/components/Select";
export { Heading } from "./ui/components/Typography";
export { Label, Text, Span, Caption } from "./ui/components/Typography";
export { TextLink } from "./ui/components/TextLink";
export type { TextLinkProps } from "./ui/components/TextLink";
export { Anchor } from "./ui/components/Anchor";
export { IconButton } from "./ui/index";
export { Textarea } from "./ui/components/Textarea";
export { GlobalError } from "./next/components/GlobalError";
export { AppLayoutShell, LocaleSwitcher, useDashboardNav, BottomActionsProvider, useBottomActions, DashboardNavProvider, LayoutClient } from "./features/layout/index";
export type { AppLayoutShellProps, AppLayoutShellSidebarLink, AppLayoutShellSidebarSection, DashboardNavState, MainNavbarItem, LayoutClientProps } from "./features/layout/index";
export { ListingLayout } from "./ui/components/ListingLayout";
export type { ListingLayoutProps, ListingLayoutLabels } from "./ui/components/ListingLayout";
export { Search } from "./features/search/components";
export type { SearchLabels, SearchProps, SearchQuickLink, SearchRouterAdapter, SearchResourceType, SearchResourceTypeOption } from "./features/search/components";
export { ToastProvider, SkipToMain, NavigationLoader } from "./ui/index";
export type { NavigationLoaderProps } from "./ui/index";
export { ZodSetup } from "./validation/ZodSetup";
export type { ZodSetupProps } from "./validation/ZodSetup";
export { AdminSidebar } from "./features/admin/components/AdminSidebar";
export type { AdminSidebarProps, AdminNavItem, AdminNavGroup } from "./features/admin/components/AdminSidebar";
export { AdminDashboardView, AdminAnalyticsView, AdminPageViewsReportView, AdminPrizeDrawsView, AdminCarouselView, AdminSublistingCategoriesView, AdminFulfillmentView, DataTable, DataListingView, useAdminListingData, toRecordArray, toStringValue, toRelativeDate } from "./features/admin/index";
export type { AdminDashboardViewProps, AdminAnalyticsViewProps, AdminAnalyticsViewLabels, AdminPrizeDrawsViewProps, AdminCarouselViewProps, AdminFulfillmentViewProps, AdminListingScaffoldRow, ListingViewConfig } from "./features/admin/index";
export type { BulkActionItem } from "./ui/components/BulkActionBar";
// S-ADMIN-7 — permission catalog data, shared by AdminEmployeeEditorView and the read-only /admin/permissions page.
export { PERMISSION_GROUPS, PERMISSION_DOMAINS, getPermissionsForDomain, formatPermLabel } from "./features/auth/permissions/constants";
export { ADMIN_ENDPOINTS } from "./constants/index";
export { SELLER_ENDPOINTS } from "./constants/index";
// P-16 — Tour system (driver.js-backed onboarding walkthrough).
export { TourProvider, useTour } from "./_internal/client/features/tour/TourProvider";
export type { TourContextValue, TourRole } from "./_internal/client/features/tour/TourProvider";
export { apiClient, ApiClientError } from "./http/index";
export { UserSidebar } from "./features/account/components/UserSidebar";
export type { UserSidebarProps, UserNavItem, UserNavGroup } from "./features/account/components/UserSidebar";
export { CouponsIndexListing } from "./features/promotions/components/CouponsIndexListing";
export type { CouponsIndexListingProps } from "./features/promotions/components/CouponsIndexListing";
export { CouponHelpDetails } from "./features/promotions/components/CouponHelpDetails";
export type { CouponHelpDetailsProps } from "./features/promotions/components/CouponHelpDetails";
export { NotificationBell } from "./features/account/components/NotificationBell";
export { NotificationPreferencesPanel } from "./features/account/components/NotificationPreferencesPanel";
export type { NotificationPreferencesPanelProps } from "./features/account/components/NotificationPreferencesPanel";
export { LinkedAccountsSection } from "./features/account/components/LinkedAccountsSection";
export type { LinkedAccountsSectionProps } from "./features/account/components/LinkedAccountsSection";
export {
  useCollapsedSections,
  useSectionState,
} from "./features/account/hooks/useCollapsedSections";
export type {
  UseCollapsedSectionsOptions,
  UseCollapsedSectionsResult,
  UseSectionStateOptions,
  UseSectionStateResult,
  SectionExpandMode,
} from "./features/account/hooks/useCollapsedSections";
export { PageViewTracker } from "./features/analytics/components/PageViewTracker";
export type { PageViewTrackerProps } from "./features/analytics/components/PageViewTracker";
export { PAGE_VIEW_ENTITY_TYPES } from "./features/analytics/types";
export type { PageViewEntityType } from "./features/analytics/types";
export { AuctionBidsTable } from "./features/auctions/components/AuctionBidsTable";
// The ONE bid-detail field builder, shared by all three portals' list modals
// and — since W22 — their detail pages. `viewer` is what decides whether the
// bidder's identity is shown, so keeping it in one place is what stops a
// buyer-facing surface ever rendering another bidder's name.
export { buildBidDetailFields, bidStatusBadge } from "./features/auctions/components/bid-detail-fields";
// Same reason, one feature over: the entry detail modal and its full page
// render from one builder rather than two lists that can drift.
export { buildEventEntryDetailFields } from "./features/events/components/event-entry-detail-fields";
export type { EntryFieldRow } from "./features/events/components/event-entry-detail-fields";
export type { BidDetailViewer } from "./features/auctions/components/bid-detail-fields";
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
export { useLogout, useLogin, useGoogleLogin, useLinkGoogleAccount, useRegister, useForgotPassword, useResetPassword, useVerifyEmail, useChangeEmail } from "./features/auth/index";
export type { LoginCredentials, RegisterData, ForgotPasswordData, ResetPasswordData, VerifyEmailData, ChangeEmailData } from "./features/auth/index";
export { CartView, CartItemRow, CartGroupLineRow, CartSummary, CartPriceBreakdown, CartDrawer, CheckoutView, CheckoutSuccessView, CheckoutAddressStep, useGuestCart, useCartCount, useAddToCart, useCart, useGuestCartMerge, useCartQuery } from "./features/cart/index";
export { StoreAddonsPicker, hasAnyStoreAddon } from "./features/cart/index";
export { clientLineTotal } from "./features/cart/utils/line-total";
export type { PricedCartLine } from "./features/cart/utils/line-total";
export type { CartPriceBreakdownData, CartPriceBreakdownStore, StoreAddonsValue, StoreAddonsRates } from "./features/cart/index";
export { getCartOps, CART_OPS_CHANGE_EVENT } from "./features/cart/utils/pending-ops";
export type { CartOp } from "./features/cart/utils/pending-ops";
export type { CartItem, CartItemMeta, CartData, GuestCartItem } from "./features/cart/index";
// Multi-member cart lines — the client needs these to render a bundle's or a
// grouped selection's contents. See the quantity invariant on CartLineMember.
export type {
  CartLineKind,
  CartGroupSource,
  CartLineMember,
} from "./features/cart/schemas/firestore";
export type { CartGroupLineRowProps } from "./features/cart/components/CartGroupLineRow";
export { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress, useAddress } from "./features/account/index";
export type { Address, AddressFormData } from "./features/account/index";
export { AddressBook, AddressCard, AddressForm } from "./features/account/index";
export type { AddressCardAddress, AddressCardProps } from "./features/account/index";
export { useProfile, useUpdateProfile } from "./features/account/index";
export { updateProfileSchema } from "./features/account/index";
export { CategoryProductsView } from "./features/categories/index";
export type { CategoryItem } from "./features/categories/index";
export { MediaImage } from "./features/media/index";
export { StoreSidebar } from "./features/seller/components/SellerSidebar";
export type { StoreNavItem, StoreNavGroup } from "./features/seller/components/SellerSidebar";
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
// The single wishlist heart. Exported here too because it is a "use client"
// UI component and consumer client code imports from this entry.
export { WishlistHeartButton } from "./features/wishlist/components/WishlistHeartButton";
export type {
  WishlistHeartButtonProps,
  WishlistHeartPlacement,
} from "./features/wishlist/components/WishlistHeartButton";
export { SyncManagerMount } from "./core/components/SyncManagerMount";
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
export { GroupedListingEditorView } from "./features/grouped/components/GroupedListingEditorView";
export type { GroupedListingEditorViewProps } from "./features/grouped/components/GroupedListingEditorView";
export { GroupedListingDetailView } from "./features/grouped/components/GroupedListingDetailView";
export type { GroupedListingDetailViewProps } from "./features/grouped/components/GroupedListingDetailView";
export { GroupMemberPicker } from "./features/products/components/GroupMemberPicker";
export type {
  GroupMemberPickerProps,
  GroupPickerMember,
} from "./features/products/components/GroupMemberPicker";
export { MarketplaceBundleCard } from "./features/products/components/MarketplaceBundleCard";
export type {
  MarketplaceBundleCardProps,
  MarketplaceBundleCardData,
  MarketplaceBundleCardLabels,
} from "./features/products/components/MarketplaceBundleCard";
export { CompareOverlay } from "./features/products/components/CompareOverlay";
export type {
  CompareOverlayProps,
  CompareOverlayLabels,
  CompareProductLike,
} from "./features/products/components/CompareOverlay";
export { COMPARE_MAX_ITEMS } from "./features/products/constants/action-defs";
export {
  STANDARD_SORT_OPTIONS,
  STANDARD_PUBLIC_SORT_OPTIONS,
  AUCTION_SORT_OPTIONS,
  AUCTION_PUBLIC_SORT_OPTIONS,
  PREORDER_SORT_OPTIONS,
  PREORDER_PUBLIC_SORT_OPTIONS,
  BUNDLE_SORT_OPTIONS,
  PRIZE_DRAW_SORT_OPTIONS,
  PRIZE_DRAW_PUBLIC_SORT_OPTIONS,
} from "./features/products/constants/sieve";
// Derived from the listing-type plugin registry — see the note in index.ts.
export {
  sortOptionsFor,
  commonSortOptionsFor,
  hideDefaultsFor,
} from "./_internal/shared/listing-types/_registry";
export type { ListingHideDefault } from "./_internal/shared/listing-types/_registry";
export type { SortOption } from "./features/products/constants/sieve";

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

// [CLIENT-ONLY] W1-43 — useListingTypeFlags: read featureFlags.listingTypes
// from siteSettings; hide nav/search/picker entries for disabled types.
export { useListingTypeFlags } from "./react/hooks/useListingTypeFlags";
export type {
  ListingTypeFlags,
  ListingTypeFlagsShape,
} from "./react/hooks/useListingTypeFlags";
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
export { UserOffersPanel } from "./features/account/components/UserOffersPanel";
export type { UserOffersPanelProps } from "./features/account/components/UserOffersPanel";
export { SellerDashboardView as StoreDashboardView, SellerDashboardView, useSellerDashboard as useStoreDashboard, useSellerDashboard } from "./features/seller/index";
export type { SellerDashboardViewProps as StoreDashboardViewProps, SellerDashboardViewProps } from "./features/seller/index";
export { SellerPayoutSettingsView, SellerShippingView, SellerReviewsView, SellerPayoutRequestView, SellerAnalyticsStats, SellerTopProducts, SellerAnalyticsView, SellerPayoutsView, SellerCouponEditorView, SellerBidsView, SellerAddressesView, SellerPreOrdersView, SellerPrizeDrawsView, PrintCenterView, SellerOffersView, SellerGroupedListingsView, StoreGroupedListingsView, SellerAnalyticsAlertsView, StoreAnalyticsAlertsView, BarcodeField, FulfillmentView } from "./features/seller/components/index";
export type { SellerPayoutSettingsViewProps, SellerShippingViewProps, SellerReviewsViewProps, SellerPayoutRequestViewProps, SellerAnalyticsViewProps, SellerPayoutsViewProps, SellerCouponEditorViewProps, CouponEditorDraft, SellerBidsViewProps, SellerAddressesViewProps, SellerPreOrdersViewProps, SellerPrizeDrawsViewProps, SellerOffersViewProps, SellerGroupedListingsViewProps, SellerAnalyticsAlertsViewProps, BarcodeFieldProps, FulfillmentViewProps } from "./features/seller/components/index";
export type { SellerAnalyticsSummary, SellerAnalyticsTopProduct } from "./features/seller/types/index";
export { UserAccountHubView, UserOrdersView, UserBidsView, OrderDetailView, UserNotificationsView, UserReturnsView, UserSupportView, useNotifications } from "./features/account/index";
export type { UserAccountHubViewProps, UserAccountHubViewLabels, UserOrdersViewProps, OrderDetailViewProps, OrderDetailViewLabels, UserNotificationsViewProps, UserNotificationsViewLabels, UserReturnsViewProps, UserSupportViewProps } from "./features/account/index";
export { useOrders, useOrder, OrdersList } from "./features/orders/index";
export { OrderStatusTimeline } from "./features/orders/components/OrderStatusTimeline";
export type { OrderStatusTimelineProps } from "./features/orders/components/OrderStatusTimeline";
export { CountdownDisplay } from "./ui/components/CountdownDisplay";
export type { CountdownDisplayProps } from "./ui/components/CountdownDisplay";
export { OrderAddonBadges } from "./features/orders/components/OrderAddonBadges";
export type { OrderAddonBadgesOrder, OrderAddonBadgesProps } from "./features/orders/components/OrderAddonBadges";
// Manual-payment (cash / UPI / EMI) shared constants — pure data + predicates,
// no server deps. Used by the buyer proof-upload page and order-detail CTAs.
export {
  MANUAL_PAYMENT_METHODS,
  isManualPaymentMethod,
  PAYMENT_REVIEW_QUEUE_MODES,
  isPaymentReviewQueueMode,
  PAYMENT_WINDOW_MINUTES,
} from "./features/orders/constants/payment-window";
export type { PaymentReviewQueueMode } from "./features/orders/constants/payment-window";
export {
  ORDER_SCOPE_VALUES,
  ORDER_SCOPE_TABS,
  isOrderScope,
  statusesForScope,
  mergeOrderScopeFilter,
} from "./features/orders/constants/order-scope";
export type { OrderScope } from "./features/orders/constants/order-scope";

export { UserOrderTrackView } from "./features/account/components/UserOrderTrackView";
export type { UserOrderTrackViewProps, UserOrderTrackViewLabels } from "./features/account/components/UserOrderTrackView";
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
  isArtListing,
  isStickersListing,
} from "./features/products/utils/listing-type";

// SB-UNI-X4 2026-05-13 — per-type feature-flag helpers (client-safe).
export {
  isListingTypeEnabled,
  isCategoryTypeEnabled,
  enabledListingTypes,
  enabledCategoryTypes,
  ALL_LISTING_TYPES,
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
export { buildBulkAction } from "./_internal/shared/actions/bulk-helpers";

// SB-UNI-E user-role predicates (pure functions, client-safe).
export {
  isAdminUser,
  isSellerUser,
  isModeratorUser,
  isEmployeeUser,
  isBuyerUser,
  isEffectiveAdminUser,
  isTesterUser,
  canTestAdminSurfaces,
  isStrictSellerUser,
  isAccountDisabled,
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
export { LISTING_TYPE_REGISTRY, pluginFor, detectListingTypeFromSlug } from "./_internal/shared/listing-types/_registry";
export type { ListingTypePlugin } from "./_internal/shared/listing-types/_registry";
export type { ListingType } from "./features/products/types/index";

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
export { SellerTrustBadge } from "./features/scams/components/SellerTrustBadge";
export type { SellerTrustBadgeProps } from "./features/scams/components/SellerTrustBadge";
// [CLIENT-ONLY] — Admin panel components for action/nav permission management.
export { ActionPermissionsManager } from "./features/site-settings/components/ActionPermissionsManager";
export type { ActionPermissionsManagerProps } from "./features/site-settings/components/ActionPermissionsManager";
export { NavPermissionsManager } from "./features/site-settings/components/NavPermissionsManager";
export type { NavPermissionsManagerProps, NavGroup as NavPermissionsGroup, NavItem as NavPermissionsItem } from "./features/site-settings/components/NavPermissionsManager";

// ── Digital-code code-reveal panel (still used directly on order pages) ───────
export { CodeRevealPanel } from "./_internal/client/features/digital-code/CodeRevealPanel";
export type { CodeRevealPanelProps, RevealedCode } from "./_internal/client/features/digital-code/CodeRevealPanel";

export { PhysicalLocationModal } from "./features/seller/components/PhysicalLocationModal";
export type { PhysicalLocation } from "./features/seller/components/PhysicalLocationModal";

// [CLIENT-ONLY] — Toggle switch primitive.
export { Toggle } from "./ui/components/Toggle";
export type { ToggleProps } from "./ui/components/Toggle";

// [CLIENT] Wave 4 seller management views.
export { SellerStoreCategoriesView } from "./features/seller/components/SellerStoreCategoriesView";
export type { SellerStoreCategoriesViewProps } from "./features/seller/components/SellerStoreCategoriesView";
export { SellerPayoutMethodsView } from "./features/seller/components/SellerPayoutMethodsView";
export type { SellerPayoutMethodsViewProps } from "./features/seller/components/SellerPayoutMethodsView";
export { SellerShippingConfigsView } from "./features/seller/components/SellerShippingConfigsView";
export type { SellerShippingConfigsViewProps } from "./features/seller/components/SellerShippingConfigsView";
export { SellerGoogleReviewsView } from "./features/seller/components/SellerGoogleReviewsView";
export type { SellerGoogleReviewsViewProps } from "./features/seller/components/SellerGoogleReviewsView";
export { SellerBundlesView } from "./features/seller/components/SellerBundlesView";
export type { SellerBundlesViewProps } from "./features/seller/components/SellerBundlesView";
export { SellerClassifiedView } from "./features/seller/components/SellerClassifiedView";
export type { SellerClassifiedViewProps } from "./features/seller/components/SellerClassifiedView";
export { SellerArtView } from "./features/seller/components/SellerArtView";
export type { SellerArtViewProps } from "./features/seller/components/SellerArtView";
export { SellerStickersView } from "./features/seller/components/SellerStickersView";
export type { SellerStickersViewProps } from "./features/seller/components/SellerStickersView";
export { SellerDigitalCodesView } from "./features/seller/components/SellerDigitalCodesView";
export type { SellerDigitalCodesViewProps } from "./features/seller/components/SellerDigitalCodesView";
export { SellerLiveView } from "./features/seller/components/SellerLiveView";
export type { SellerLiveViewProps } from "./features/seller/components/SellerLiveView";
// ── Central schema registry (W1) ──────────────────────────────────────────────
// Pure Zod, isomorphic — re-exported here so client code can resolve schemas
// without pulling in the full server barrel.
export {
  SCHEMAS,
  lookupApiSchema,
  lookupFormSchema,
  lookupFirestoreSchema,
} from "./schemas/index";
export type {
  ApiRouteKey,
  ApiRouteSchema,
  FirestoreDocument,
  FirestoreValue,
  FormFieldValue,
  FormValues,
  HttpVerb,
  JsonArray,
  JsonObject,
  JsonObjectWithUndefined,
  JsonPrimitive,
  JsonValue,
  JsonValueWithUndefined,
  RegisteredApiRouteKey,
  RegisteredFirestoreCollection,
  RegisteredFormId,
  RegisteredRtdbChannel,
  RegisteredSieveCollection,
  RegisteredStorageOp,
  RegisteredWebhookProvider,
  RegistryEntry,
  SchemaRegistry,
  SchemasShape,
  WebhookSchemaBucket,
} from "./schemas/index";

// ── W3 catch-clause normalizer ──────────────────────────────────────────────
export {
  normalizeError,
  getErrorMessage,
  isApiNormalized,
  isAppNormalized,
  isFirebaseAuthNormalized,
  isFirebaseFirestoreNormalized,
  isFirebaseStorageNormalized,
  isNativeNormalized,
  isNetworkNormalized,
  isUnknownNormalized,
  isZodNormalized,
} from "./errors/normalize";
export type {
  NormalizedError,
  NormalizedApiError,
  NormalizedAppError,
  NormalizedFirebaseAuthError,
  NormalizedFirebaseFirestoreError,
  NormalizedFirebaseStorageError,
  NormalizedNativeError,
  NormalizedNetworkError,
  NormalizedUnknownThrownValue,
  NormalizedZodError,
} from "./errors/normalize";

// [CLIENT-SAFE] Pure wa.me share-link message builder — imported directly
// from its isolated file (not ./whatsapp-bot/server) so this barrel's graph
// never touches the sibling crypto-importing helpers.
export { buildPaymentProofReviewMessage } from "./features/whatsapp-bot/helpers/payment-proof-message";
export type { PaymentProofReviewMessageInput } from "./features/whatsapp-bot/types";

// [CLIENT-SAFE] Verified 2026-08-20 (webpack-migration audit): every symbol
// below is a "use client" component/hook, or a pure function/constant/type
// with no server-only or crypto import in its own module. Added so the
// consumer app's client components can import them via
// "@mohasinac/appkit/client" instead of the bare package (audit-client-server-only-leak).
export type {
  AdminNotificationDocument,
  ItemRequestDocument,
  ModerationQueueDocument,
  ReportDocument,
  CustomRoleDocument,
  AnalyticsCardDocument,
  ListingTemplateDocument,
} from "./features/store-extensions/index";
export { CommandPalette, useCommandPaletteHotkey } from "./features/shell/index";
export type { CommandPaletteGroup } from "./features/shell/index";
export {
  AdminBlogEditorView,
  AdminBundleEditorView,
  AdminCarouselEditorView,
  AdminCategoryEditorView,
  AdminCouponEditorView,
  AdminFaqEditorView,
  AdminFeatureEditorView,
  AdminOrderEditorView,
  AdminPayoutMarkPaidModal,
  AdminAuditLogView,
  ViewAuditLogEntryModal,
  AdminProductEditorView,
  AdminScammerEditorView,
  // Client-exported for the W22 /admin/team/{new,[id]/edit} pages. It was
  // reachable only from `index.ts` (the SERVER entry), which a "use client"
  // page must never import — that is the Turbopack client-bundle trap.
  AdminEmployeeEditorView,
  AdminNavEditorView,
  AdminUserEditorView,
  AdminStoreEditorView,
  AdminSublistingCategoryEditorView,
  AdminSupportTicketDetailView,
} from "./features/admin/index";
export type { AdminStoreEditorViewProps, AdminPayoutMarkPaidModalProps, AdminAuditLogViewProps, AuditLogEntryDetail, ViewAuditLogEntryModalProps } from "./features/admin/index";
// NavItemData — the whole nav record AdminNavEditorView takes (it has no
// id-based loader), needed by the /admin/navigation page clients.
export type { NavItemData } from "./features/admin/index";
export { PageLoader } from "./ui/index";
export { ADMIN_CHECKOUT_BYPASS_FLAG_KEY } from "./features/admin/schemas/firestore";
export { SpinWheelView, EventRaffleEntryForm } from "./features/events/index";
export { Card, CardBody } from "./ui/index";
export {
  SellerCouponsView,
  SellerCreateProductView,
  SellerEditProductView,
  useBecomeSeller,
} from "./features/seller/index";
export type {
  BecomeSellerResult,
  SellerCreateProductViewProps,
  SellerEditProductViewProps,
} from "./features/seller/index";
export { BecomeSellerView } from "./features/account/index";
export type { BidDocument } from "./features/auctions/index";
export type { ClaimedCouponDocument } from "./features/promotions/schemas";
export { groupOrderItemsByLine } from "./features/orders/index";
export type { LineOrderGroup, OutOfStockPolicy } from "./features/orders/index";
export { MediaUploadField } from "./features/media/index";
export { PrizeRevealModal } from "./features/products/components/PrizeRevealModal";
export { useProduct } from "./features/products/index";
export type { ProductDocument } from "./features/products/index";
export { BUNDLE_COPY } from "./_internal/shared/features/categories/bundle-copy";
export { useSiteSettings } from "./core/index";
export {
  checkEmiEligibility,
  computeEmiSchedule,
  computeBuyerEmiQuote,
} from "./_internal/shared/features/emi/schedule";
export type { EmiSettings, BuyerEmiQuote } from "./_internal/shared/features/emi/schedule";
// Buyer-facing fee projections — the checkout/cart client props are typed
// against these so internal economics can't be widened back in by accident.
export type {
  BuyerFacingFees,
  BuyerEmiSettings,
} from "./_internal/shared/features/site-settings/fees";
// The public site-settings shape. Type `useSiteSettings<PublicSiteSettings>()`
// against this so a client reading a field the endpoint no longer returns is a
// compile error rather than a silent `undefined`.
export type { PublicSiteSettings } from "./_internal/shared/features/site-settings/types";
export { computeCodHandlingFee } from "./_internal/shared/fees/calculator"; // reexport-from-internal-ok: pure fee-calc utility consumed directly by public checkout UI (CheckoutRouteClient.tsx), same category as the sibling computeEmiSchedule/checkEmiEligibility re-export two lines above
export type {
  CodHandlingFeeRates,
  WhatsAppNotifyFeeRates,
  GiftWrapFeeRates,
  ShipmentProtectionFeeRates,
} from "./_internal/shared/fees/calculator";
export { FAQPageContent } from "./features/faq/index";
export type { FAQCategory, FAQCategoryItem, FAQSortOption } from "./features/faq/index";
export { CategoryInlineSelect } from "./features/seller/components/CategoryInlineSelect";
export { BrandInlineSelect } from "./features/seller/components/BrandInlineSelect";
export { API_ENDPOINTS } from "./constants/index";

// [CLIENT-SAFE] Pure, zero-import constant files — dashboard filter-tab
// sets and Firestore field-name maps. No server dependency of any kind.
export {
  SELLER_LISTING_TABS,
  type SellerListingTabId,
} from "./features/products/constants/listing-tabs";
export {
  ALL_TAB,
  EMPTY_TAB,
  ADMIN_PRODUCT_STATUS_TABS,
  ADMIN_PRODUCT_LISTING_TYPE_TABS,
  ADMIN_BLOG_STATUS_TABS,
  ADMIN_USER_STATUS_TABS,
  ADMIN_USER_ROLE_TABS,
  ADMIN_STORE_STATUS_TABS,
  ADMIN_PAYOUT_STATUS_TABS,
  ADMIN_ORDER_STATUS_TABS,
  ADMIN_REVIEW_STATUS_TABS,
  ADMIN_REVIEW_RATING_TABS,
  ADMIN_BID_STATUS_TABS,
  ADMIN_CONTACT_STATUS_TABS,
  ADMIN_NEWSLETTER_STATUS_TABS,
  ADMIN_EVENT_ENTRY_STATUS_TABS,
  ADMIN_EVENT_STATUS_TABS,
  ADMIN_CART_OWNERSHIP_TABS,
  ADMIN_COUPON_TYPE_TABS,
  SELLER_PRODUCT_STATUS_TABS,
  SELLER_AUCTION_STATUS_TABS,
  SELLER_ORDER_STATUS_TABS,
  SELLER_OFFER_STATUS_TABS,
  SELLER_BID_STATUS_TABS,
} from "./features/admin/constants/filter-tabs";
export {
  PRODUCT_FIELDS,
  PRODUCT_STATUS_TRANSITIONS,
  ORDER_FIELDS,
  REVIEW_FIELDS,
  BID_FIELDS,
  AD_FIELDS,
  EVENT_FIELDS,
  EVENT_ENTRY_FIELDS,
  PAYOUT_FIELDS,
  STORE_FIELDS,
  CATEGORY_FIELDS,
  BLOG_FIELDS,
  USER_FIELDS,
  ADDRESS_FIELDS,
  BRAND_FIELDS,
  CART_FIELDS,
  WISHLIST_FIELDS,
  HISTORY_FIELDS,
  NOTIFICATION_FIELDS,
  SESSION_FIELDS,
  COUPON_USAGE_FIELDS,
  CONVERSATION_FIELDS,
  SCAMMER_FIELDS,
  SUPPORT_TICKET_FIELDS,
  CAROUSEL_FIELDS,
  COUPON_FIELDS,
  FAQ_FIELDS,
  HOMEPAGE_SECTION_FIELDS,
  SITE_SETTINGS_FIELDS,
  COMMON_FIELDS,
  OAUTH_STATE_VALUES,
  SCHEMA_DEFAULTS,
} from "./constants/field-names";

// Checkout lanes — the derived auction > offer > standard partition of the
// cart, and the priority rule that decides which one may be checked out.
export {
  CART_LANE,
  CART_LANE_PRIORITY,
  CART_LANE_LABELS,
  laneOf,
  activeLane,
  laneItems,
  laneCounts,
  isLaneCheckoutable,
  laneBlockReason,
  isLockedLane,
  canAddNewItems,
  type CartLane,
  type LaneAssignable,
} from "./_internal/shared/checkout/lanes";
export {
  newsletterSubscribeSchema,
  quickCreateTaxonomySchema,
  payoutMarkPaidSchema,
} from "./features/admin/schemas/small-forms";
export { raffleEntrySchema } from "./features/contact/schemas/inquiry-forms";
export {
  orderCancelSchema,
  paymentProofSchema,
} from "./features/orders/schemas/buyer-forms";
export { scamReportFormSchema } from "./features/scams/schemas/report-form";
export { sublistingCategoryFormSchema } from "./features/store-extensions/schemas/sublisting-category-form";
export {
  adminAddressFormSchema,
  adminStoreUpdateSchema,
  announcementBarSchema,
} from "./features/admin/schemas/admin-editor-forms";
export {
  adminOrderUpdateSchema,
  employeeInviteSchema,
  hardBanReasonSchema,
  featureFlagsUpdateSchema,
  adminAdFormSchema,
} from "./features/admin/schemas/admin-ops-forms";
export { changeEmailSchema } from "./features/account/schemas/index";
export {
  adminUserUpdateSchema,
  whatsappSettingsSchema,
  lotteryPullSchema,
} from "./features/admin/schemas/admin-user-form";
export { siteSettingsFormSchema } from "./features/admin/schemas/site-settings-form";
