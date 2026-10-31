
// Single unified barrel
// Runtime tags: [CLIENT-SSR] [CLIENT-ONLY] [SERVER-ONLY] [DB] [UTIL] [TYPE] [SCHEMA] [CONFIG]

// ./tokens/index
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// COLORS - Constant used across modules.
export { COLORS } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// FLUID_GRID_MIN_WIDTHS - Constant used across modules.
export { FLUID_GRID_MIN_WIDTHS } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// LOCALE_CONFIG - Constant used across modules.
export { LOCALE_CONFIG } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// RADIUS - Constant used across modules.
export { RADIUS } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// SHADOWS - Constant used across modules.
export { SHADOWS } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// TOKENS - Constant used across modules.
export { TOKENS } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// Z_INDEX - Constant used across modules.
export { Z_INDEX } from "./tokens/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// token - Shared export for token.
export { token } from "./tokens/index";

// ./ui/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Accordion - Shared export for accordion.
export { Accordion } from "./ui/components/Accordion";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AccordionItem - Model for accordion item.
export { AccordionItem } from "./ui/components/Accordion";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ActiveFilterChips - Shared export for active filter chips.
export { ActiveFilterChips } from "./ui/components/ActiveFilterChips";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Alert - Shared export for alert.
export { Alert } from "./ui/components/Alert";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Article - Shared export for article.
export { Article } from "./ui/components/Semantic";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Aside - Shared export for aside.
export { Aside } from "./ui/components/Semantic";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Avatar - Shared export for avatar.
export { Avatar } from "./ui/components/Avatar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AvatarDisplay - Shared export for avatar display.
export { AvatarDisplay } from "./ui/components/AvatarDisplay";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AvatarGroup - Shared export for avatar group.
export { AvatarGroup } from "./ui/components/Avatar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BackgroundRenderer - Shared export for background renderer.
export { BackgroundRenderer } from "./ui/components/BackgroundRenderer";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Badge - Component for badge.
export { Badge } from "./ui/components/Badge";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BaseListingCard - Component for base listing card.
export { BaseListingCard } from "./ui/components/BaseListingCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlockFooter - Shared export for block footer.
export { BlockFooter } from "./ui/components/Semantic";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlockHeader - Shared export for block header.
export { BlockHeader } from "./ui/components/Semantic";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Breadcrumb - Shared export for breadcrumb.
export { Breadcrumb } from "./ui/components/Breadcrumb";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BulkActionBar - Shared export for bulk action bar.
export { BulkActionBar } from "./ui/components/BulkActionBar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Caption - Shared export for caption.
export { Caption } from "./ui/components/Typography";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Card - Component for card.
export { Card } from "./ui/components/Card";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CardFooter - Shared export for card footer.
export { CardFooter } from "./ui/components/Card";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CardHeader - Shared export for card header.
export { CardHeader } from "./ui/components/Card";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ConfirmDeleteModal - Component for confirm delete modal.
export { ConfirmDeleteModal } from "./ui/components/ConfirmDeleteModal";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Container - Shared export for container.
export { Container } from "./ui/components/Layout";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_PAGINATION_CONFIG - Constant used across modules.
export { DEFAULT_PAGINATION_CONFIG } from "./contracts/table";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_STICKY_CONFIG - Constant used across modules.
export { DEFAULT_STICKY_CONFIG } from "./contracts/table";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DataTable - Component for data table.
export { DataTable } from "./ui/DataTable";
// Table family primitives — replace raw <table>/<tr>/<td>/etc. (W-E).
export { Table, Thead, Tbody, Tr, Th, Td } from "./ui/components/Semantic";
export type { TableProps, TheadProps, TbodyProps, TrProps, ThProps, TdProps } from "./ui/components/Semantic";
// Inline-text primitives — replace raw <code>/<pre>/<blockquote>/<kbd>/<q> (W-E).
export { Code, Pre, Blockquote } from "./ui/components/Semantic";
export type { CodeProps, PreProps, BlockquoteProps } from "./ui/components/Semantic";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DescriptionField - Shared export for description field.
export { DescriptionField } from "./ui/components/DescriptionField";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Div - Shared export for div.
export { Div } from "./ui/components/Div";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Divider - Shared export for divider.
export { Divider } from "./ui/components/Divider";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Dropdown - Shared export for dropdown.
export { Dropdown } from "./ui/components/Dropdown";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DropdownItem - Model for dropdown item.
export { DropdownItem } from "./ui/components/Dropdown";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DropdownSeparator - Shared export for dropdown separator.
export { DropdownSeparator } from "./ui/components/Dropdown";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DropdownTrigger - Shared export for dropdown trigger.
export { DropdownTrigger } from "./ui/components/Dropdown";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FormFieldSpan - Shared export for form field span.
export { FormFieldSpan } from "./ui/components/Form";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FormGrid - Component for form grid.
export { FormGrid } from "./ui/components/FormGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FormGroup - Shared export for form group.
export { FormGroup } from "./ui/components/Form";
// FormShell wizard + context-aware fields (SB-UNI-Y-1)
// Note: FormShell and useFormShell are the old overlay shell from features/shell — exported below.
// The step-wizard variant (FormShellStep/FormShellContextValue) is unique to ui/forms.
export type { FormShellStep, FormShellNav, FormShellContextValue } from "./ui/forms/FormShell";
export type { FieldInputProps } from "./ui/forms/FieldInput";
export { FieldInput } from "./ui/forms/FieldInput";
export type { FieldSelectProps } from "./ui/forms/FieldSelect";
export { FieldSelect } from "./ui/forms/FieldSelect";
export type { FieldCheckboxProps } from "./ui/forms/FieldCheckbox";
export { FieldCheckbox } from "./ui/forms/FieldCheckbox";
/*
 * FieldTextarea and FormErrorSummary were exported from `client.ts` and
 * `ui/index.ts` but NOT from here, so consumer code importing from the bare
 * `@mohasinac/appkit` entry could reach three of the four Field* primitives
 * and not the error summary at all. That gap is a reason, not an excuse, for
 * hand-rolled textareas and missing summaries in `src/` — make the two entries
 * agree.
 */
export type { FieldTextareaProps } from "./ui/forms/FieldTextarea";
export { FieldTextarea } from "./ui/forms/FieldTextarea";
export type { FormErrorSummaryProps } from "./ui/forms/FormErrorSummary";
export { FormErrorSummary } from "./ui/forms/FormErrorSummary";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// GRID_MAP - Constant used across modules.
export { GRID_MAP } from "./ui/components/Layout";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ImageGallery - Shared export for image gallery.
export { ImageGallery } from "./ui/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ImageLightbox - Shared export for image lightbox.
export { ImageLightbox } from "./ui/components/ImageLightbox";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// renderRating - Shared export for render rating.
export { renderRating } from "./ui/columns/column-renderers";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useToast - React hook for use toast.
export { useToast } from "./ui/components/toast-context";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BreadcrumbItem - Type contract for breadcrumb item.
export type { BreadcrumbItem } from "./ui/components/Breadcrumb";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BreadcrumbProps - Type contract for breadcrumb props.
export type { BreadcrumbProps } from "./ui/components/Breadcrumb";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DataTableProps - Type contract for data table props.
export type { DataTableProps } from "./ui/DataTable";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DescriptionFieldProps - Type contract for description field props.
export type { DescriptionFieldProps } from "./ui/components/DescriptionField";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DivProps - Type contract for div props.
export type { DivProps } from "./ui/components/Div";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DividerProps - Type contract for divider props.
export type { DividerProps } from "./ui/components/Divider";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DrawerMode - Type contract for drawer mode.
export type { DrawerMode } from "./ui/components/SideDrawer";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DrawerProps - Type contract for drawer props.
export type { DrawerProps } from "./ui/components/Drawer";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DropdownMenuItem - Type contract for dropdown menu item.
export type { DropdownMenuItem } from "./ui/components/Dropdown";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DropdownProps - Type contract for dropdown props.
export type { DropdownProps } from "./ui/components/Dropdown";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaginatedSelectOption - Option shape for PaginatedSelect ({ value, label, meta? }).
export type { PaginatedSelectOption } from "./ui/components/PaginatedSelect";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaginatedSelectProps - Discriminated union: single (default) or multiple. Search + paginated + optional inline create.
export type { PaginatedSelectProps } from "./ui/components/PaginatedSelect";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PaginatedSelect - Searchable, async-paginated select. Supports single + multi modes + optional inline create drawer.
export { PaginatedSelect } from "./ui/components/PaginatedSelect";
// EmptyState - Component for empty state display.
export { EmptyState } from "./ui/components/EmptyState";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EmptyStateProps - Type contract for empty state props.
export type { EmptyStateProps } from "./ui/components/EmptyState";
// FallbackShell — primitive used by ErrorBoundary / global-error route.
// Inlines critical CSS so it renders before/without Tailwind.
export { FallbackShell } from "./ui/components/FallbackShell";
export type {
  FallbackShellProps,
  FallbackShellTone,
} from "./ui/components/FallbackShell";
// HotspotMarker — primitive for dynamically positioned overlay markers
// (campaign image pins, character hotspots). Owns the inline left/top style
// so consumer code never authors `style={{ left, top }}` manually.
export { HotspotMarker } from "./ui/components/HotspotMarker";
export type {
  HotspotMarkerProps,
  HotspotMarkerShape,
  HotspotMarkerSize,
  HotspotMarkerTone,
} from "./ui/components/HotspotMarker";
// Anchor — primitive for external links / `mailto:` / `tel:`. Internal Next.js
// routes use `<TextLink>` instead. Tone + underline are typed enums.
export { Anchor } from "./ui/components/Anchor";
export type {
  AnchorProps,
  AnchorTone,
  AnchorUnderline,
} from "./ui/components/Anchor";
// Iframe — primitive for embedded third-party documents (YouTube, Maps).
// Aspect + rounded + sandbox come from typed enums; consumer code never
// authors a raw <iframe>.
export { Iframe } from "./ui/components/Iframe";
export type {
  IframeAspect,
  IframeProps,
  IframeRounded,
} from "./ui/components/Iframe";
// HorizontalRule — primitive for <hr>. `tone="accent"` consumes
// --appkit-gradient-accent-divider so dividers follow the active theme.
export { HorizontalRule } from "./ui/components/HorizontalRule";
export type {
  HorizontalRuleProps,
  HorizontalRuleSpacing,
  HorizontalRuleTone,
} from "./ui/components/HorizontalRule";
// Scrim — primitive for dark fade overlays (image legibility / hero scrims).
export { Scrim } from "./ui/components/Scrim";
export type { ScrimProps, ScrimDirection, ScrimIntensity } from "./ui/components/Scrim";
// Kbd — primitive for <kbd> (keyboard key affordance).
export { Kbd } from "./ui/components/Kbd";
export type { KbdProps, KbdSize, KbdTone } from "./ui/components/Kbd";
// PendingValue — renders a value, or a visible [to be confirmed] marker when a
// statutory disclosure field has not been decided yet.
export { PendingValue } from "./ui/components/PendingValue";
export type { PendingValueProps } from "./ui/components/PendingValue";
// Quote — primitive for inline <q> + multi-line <blockquote> (via `block`).
export { Quote } from "./ui/components/Quote";
export type { QuoteProps, QuoteTone } from "./ui/components/Quote";
// IconBox — square-icon container (catalogue replacement for the recurrent
// `flex-shrink-0 w-N h-N rounded-X flex items-center justify-center` pattern).
export { IconBox } from "./ui/components/IconBox";
export type {
  IconBoxProps,
  IconBoxRounded,
  IconBoxSize,
  IconBoxTone,
} from "./ui/components/IconBox";
// StickyToolbar — sticky translucent bar under the AppLayoutShell header.
// Sources its offset from --header-height; consumer code never authors
// the offset manually.
export { StickyToolbar } from "./ui/components/StickyToolbar";
export type {
  StickyToolbarOffset,
  StickyToolbarPadding,
  StickyToolbarProps,
  StickyToolbarTone,
} from "./ui/components/StickyToolbar";
// CollapsibleSection — persisted, accordion-scoped collapse wrapper for
// dashboard sections. Pair with useCollapsedSections for the state.
export { CollapsibleSection } from "./ui/components/CollapsibleSection";
export type { CollapsibleSectionProps } from "./ui/components/CollapsibleSection";
// Fieldset + Legend — primitives for grouped form controls.
export { Fieldset, Legend } from "./ui/components/Fieldset";
export type {
  FieldsetPadding,
  FieldsetProps,
  FieldsetTone,
  LegendProps,
} from "./ui/components/Fieldset";
// Details + Summary — primitives for native <details> disclosure widget.
export { Details, Summary } from "./ui/components/Details";
export type {
  DetailsPadding,
  DetailsProps,
  DetailsTone,
  SummaryProps,
} from "./ui/components/Details";
// Dialog — primitive for native <dialog> (top-layer rendering + focus trap).
// Distinct from <Modal> (portal + AnimatePresence).
export { Dialog } from "./ui/components/Dialog";
export type { DialogPadding, DialogProps } from "./ui/components/Dialog";
// Show + Hide — primitives for breakpoint-conditional render. Hydration-safe
// (server renders both trees; CSS hides the inactive branch).
export { Hide, Show } from "./ui/components/Responsive";
export type {
  Breakpoint,
  HideProps,
  ShowProps,
} from "./ui/components/Responsive";
// MediaAudio — primitive for `<audio>`. Routes through the media proxy for
// both internal slugs and external (HMAC-signed) URLs.
export { MediaAudio } from "./features/media/MediaAudio";
export type {
  MediaAudioControls,
  MediaAudioProps,
} from "./features/media/MediaAudio";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterDrawerProps - Type contract for filter drawer props.
export type { FilterDrawerProps } from "./ui/components/FilterDrawer";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FlowDiagramProps - Type contract for flow diagram props.
export type { FlowDiagramProps } from "./ui/components/FlowDiagram";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FlowStep - Type contract for flow step.
export type { FlowStep } from "./ui/components/FlowDiagram";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FormActionsProps - Type contract for form actions props.
export type { FormActionsProps } from "./ui/components/Form";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FormFieldProps - Type contract for form field props.
export type { FormFieldProps } from "./ui/components/FormGrid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FormFieldSpanProps - Type contract for form field span props.
export type { FormFieldSpanProps } from "./ui/components/Form";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FormProps - Type contract for form props.
export type { FormProps } from "./ui/components/Form";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GalleryImage - Type contract for gallery image.
export type { GalleryImage } from "./ui/components/ImageGallery";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
export type { ListingLayoutLabels } from "./ui/components/ListingLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ListingLayoutProps - Type contract for listing layout props.
export type { ListingLayoutProps } from "./ui/components/ListingLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
export type { RadioGroupProps } from "./ui/components/Radio";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RadioOption - Type contract for radio option.
export type { RadioOption } from "./ui/components/Radio";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RatingDisplayProps - Type contract for rating display props.
export type { RowAction } from "./ui/components/RowActionMenu";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RowActionMenuProps - Type contract for row action menu props.
export type { RowActionMenuProps } from "./ui/components/RowActionMenu";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RowProps - Type contract for row props.
export type { TabsTriggerProps } from "./ui/components/Tabs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TagInputProps - Type contract for tag input props.
export type { TagInputProps } from "./ui/components/TagInput";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TextLinkProps - Type contract for text link props.
export type { ToggleProps } from "./ui/components/Toggle";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TooltipProps - Type contract for tooltip props.
export type { TooltipProps } from "./ui/components/Tooltip";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UlProps - Type contract for ul props.
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// usePullToRefresh - React hook for use pull to refresh.
export { usePullToRefresh } from "./react/hooks/usePullToRefresh";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useRealtimeEvent - React hook for use realtime event.
export { useRealtimeEvent } from "./react/hooks/useRealtimeEvent";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ErrorBoundaryProps - Type contract for error boundary props.
export type { ErrorBoundaryProps } from "./react/ErrorBoundary";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GestureType - Type contract for gesture type.
export type { GestureType } from "./react/hooks/useGesture";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RealtimeEventStatusValue - Type contract for realtime event status value.
export type { RealtimeEventStatus as RealtimeEventStatusValue } from "./react/hooks/realtime-event-constants";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RealtimeEventTypeValue - Type contract for realtime event type value.
export type { RealtimeEventType as RealtimeEventTypeValue } from "./react/hooks/realtime-event-constants";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseGestureOptions - Type contract for use gesture options.
export type { UseGestureOptions } from "./react/hooks/useGesture";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseKeyPressOptions - Type contract for use key press options.
export type { UseKeyPressOptions } from "./react/hooks/useKeyPress";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UsePullToRefreshOptions - Type contract for use pull to refresh options.
export type { UsePullToRefreshOptions } from "./react/hooks/usePullToRefresh";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UsePullToRefreshReturn - Type contract for use pull to refresh return.
export type { UsePullToRefreshReturn } from "./react/hooks/usePullToRefresh";
// CONFIRMATION_MESSAGES - Constant used across modules.
export { CONFIRMATION_MESSAGES } from "./values/success-messages";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// INFO_MESSAGES - Constant used across modules.
export { INFO_MESSAGES } from "./values/success-messages";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
/*
 * The warehouse-location helpers (C4). `formatPhysicalLocation` was already
 * here in spirit — three appkit views deep-import it — but nothing was
 * exported, so the consumer's two bulk-location routes each hand-rolled their
 * own validation. That is why there were two validators and the one in force
 * was neither.
 */
export {
  formatPhysicalLocation,
  normalisePhysicalLocation,
  physicalLocationTokens,
} from "./utils/physical-location";
export type { PhysicalLocationParts } from "./utils/physical-location";
export { deepClone } from "./utils/object.helper";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// deepMerge - Shared export for deep merge.
export { deepMerge } from "./utils/object.helper";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// deleteCookie - Helper for delete cookie.
export { formatDateTime } from "./utils/date.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// formatDecimal - Helper for format decimal.
export { generateOfferId } from "./utils/id-generators";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// generateOrderId - Helper for generate order id.
export { generateOrderId } from "./utils/id-generators";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// generatePayoutDocFilename - Helper for generate payout doc filename.
export { generatePayoutId } from "./utils/id-generators";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// generatePreOrderId - Helper for generate pre order id.
export { generatePreOrderId } from "./utils/id-generators";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// generatePreOrderImageFilename - Helper for generate pre order image filename.
export { generateProductId } from "./utils/id-generators";
// W6-7 (2026-05-23) — per-feature generateXFilename wrappers no longer exported.
// Call `generateMediaFilename({ type: "product-image", ... })` etc. directly.
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// generateTrimmedVideoFilename - Helper for generate trimmed video filename.
export { getBusinessDaysElapsed } from "./utils/business-day";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// getBusinessDaysRemaining - Helper for get business days remaining.
export { getBusinessDaysRemaining } from "./utils/business-day";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// getContrastColor - Helper for get contrast color.
export { inferMediaTypeFromMime } from "./features/media/types/index";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// isEmptyObject - Shared export for is empty object.
export { isEmptyObject } from "./utils/object.helper";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// isEmptyString - Shared export for is empty string.
export { isFuture } from "./utils/date.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// isPast - Shared export for is past.
export { isPast } from "./utils/date.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// isSameMonth - Shared export for is same month.
export { randomString } from "./utils/string.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// resolveDate - Helper for resolve date.
export { resolveDate } from "./utils/date.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// rgbToHex - Shared export for rgb to hex.
export { truncate } from "./utils/string.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// truncateWords - Shared export for truncate words.
export { truncateWords } from "./utils/string.formatter";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// unique - Shared export for unique.
export type { GenerateHomepageSectionIdInput } from "./utils/id-generators";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GenerateOfferIdInput - Type contract for generate offer id input.
export type { GenerateOfferIdInput } from "./utils/id-generators";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GenerateOrderIdInput - Type contract for generate order id input.
export type { GeneratePreOrderIdInput } from "./utils/id-generators";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GeneratePreOrderImageFilenameInput - Type contract for generate pre order image filename input.
export type { GeneratePreOrderImageFilenameInput } from "./utils/id-generators";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GenerateProductIdInput - Type contract for generate product id input.
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// COLLECTION_ENDPOINTS - Constant used across modules.
export { COLLECTION_ENDPOINTS } from "./constants/api-endpoints";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// CONSULTATION_ENDPOINTS - Constant used across modules.
export { CONSULTATION_ENDPOINTS } from "./constants/api-endpoints";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// PROFILE_STATS_ENDPOINTS - Constant used across modules.
export { PROFILE_STATS_ENDPOINTS } from "./constants/api-endpoints";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// PROMOTION_ENDPOINTS - Constant used across modules.
export { PROMOTION_ENDPOINTS } from "./constants/api-endpoints";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// SITE_SETTINGS_ENDPOINTS - Constant used across modules.
export { SITE_SETTINGS_ENDPOINTS } from "./constants/api-endpoints";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// STORE_ENDPOINTS - Constant used across modules.
export { STORE_ENDPOINTS } from "./constants/api-endpoints";

// ./contracts/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// _resetCollectionHooks - Shared export for reset collection hooks.
export { _resetCollectionHooks } from "./contracts/repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// _resetFormFields - Model for reset form fields.
export { _resetFormFields } from "./contracts/form";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// _resetProviders - Shared export for reset providers.
export { _resetProviders } from "./contracts/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// arrayRemove - Shared export for array remove.
export { arrayRemove } from "./contracts/field-ops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// arrayUnion - Shared export for array union.
export { arrayUnion } from "./contracts/field-ops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// deleteField - Helper for delete field.
export { deleteField } from "./contracts/field-ops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getClientAuthProvider - Helper for get client auth provider.
export { getClientAuthProvider } from "./contracts/client-auth";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getClientRealtimeProvider - Helper for get client realtime provider.
export { getClientRealtimeProvider } from "./contracts/client-realtime";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getClientSessionAdapter - Helper for get client session adapter.
export { getClientSessionAdapter } from "./contracts/client-session";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getCollectionHooks - Helper for get collection hooks.
export { getCollectionHooks } from "./contracts/repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getProviders - Helper for get providers.
export { getProviders } from "./contracts/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// increment - Shared export for increment.
export { increment } from "./contracts/field-ops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// mergeFilterDefinitions - Helper for merge filter definitions.
export { mergeFilterDefinitions } from "./contracts/extend";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// mergeSortDefinitions - Helper for merge sort definitions.
export { mergeSortDefinitions } from "./contracts/extend";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// registerClientAuthProvider - Helper for register client auth provider.
export { registerClientAuthProvider } from "./contracts/client-auth";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// registerClientRealtimeProvider - Helper for register client realtime provider.
export { registerClientRealtimeProvider } from "./contracts/client-realtime";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// registerClientSessionAdapter - Helper for register client session adapter.
export { registerClientSessionAdapter } from "./contracts/client-session";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// registerFieldOps - Helper for register field ops.
export { registerFieldOps } from "./contracts/field-ops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// registerFormFields - Helper for register form fields.
export { registerFormFields } from "./contracts/form";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// registerProviders - Helper for register providers.
export { registerProviders } from "./contracts/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// removeCollectionHooks - Helper for remove collection hooks.
export { removeCollectionHooks } from "./contracts/repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// removeFormFields - Helper for remove form fields.
export { removeFormFields } from "./contracts/form";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// resolveFormFields - Helper for resolve form fields.
export { resolveFormFields } from "./contracts/form";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// serverTimestamp - Shared export for server timestamp.
export { serverTimestamp } from "./contracts/field-ops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// setCollectionHooks - Helper for set collection hooks.
export { setCollectionHooks } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdapterAuthUser - Type contract for adapter auth user.
export type { AdapterAuthUser } from "./contracts/client-session";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiRouteStub - Type contract for api route stub.
export type { ApiRouteStub } from "./contracts/feature";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AuthPayload - Type contract for auth payload.
export type { AuthPayload } from "./contracts/auth";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AuthUnsubscribe - Type contract for auth unsubscribe.
export type { AuthUnsubscribe } from "./contracts/client-session";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AuthUser - Type contract for auth user.
export type { AuthUser } from "./contracts/auth";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ColumnExtensionOpts - Type contract for column extension opts.
export type { ColumnExtensionOpts } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateShipmentInput - Type contract for create shipment input.
export type { CreateShipmentInput } from "./contracts/shipping";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateUserInput - Type contract for create user input.
export type { CreateUserInput } from "./contracts/auth";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EmailAttachment - Type contract for email attachment.
export type { EmailAttachment } from "./contracts/email";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EmailOptions - Type contract for email options.
export type { EmailOptions } from "./contracts/email";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EmailResult - Type contract for email result.
export type { EmailResult } from "./contracts/email";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventHandler - Type contract for event handler.
export type { EventHandler } from "./contracts/infra";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ExtraFieldRenderArgs - Type contract for extra field render args.
export type { ExtraFieldRenderArgs } from "./contracts/form";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ExtraFormField - Type contract for extra form field.
export type { ExtraFormField } from "./contracts/form";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeatureExtension - Type contract for feature extension.
export type { FeatureExtension } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeatureManifest - Type contract for feature manifest.
export type { FeatureManifest } from "./contracts/feature";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeaturesConfig - Type contract for features config.
export type { FeaturesConfig } from "./contracts/feature";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FieldSentinel - Type contract for field sentinel.
export type { FieldSentinel } from "./contracts/field-ops";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterDefinition - Type contract for filter definition.
export type { FilterDefinition } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterOption - Type contract for filter option.
export type { FilterOption } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterType - Type contract for filter type.
export type { FilterType } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IAuthProvider - Type contract for iauth provider.
export type { IAuthProvider } from "./contracts/auth";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ICacheProvider - Type contract for icache provider.
export type { ICacheProvider } from "./contracts/infra";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IClientAuthProvider - Type contract for iclient auth provider.
export type { IClientAuthProvider } from "./contracts/client-auth";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IClientRealtimeProvider - Type contract for iclient realtime provider.
export type { IClientRealtimeProvider } from "./contracts/client-realtime";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IClientSessionAdapter - Type contract for iclient session adapter.
export type { IClientSessionAdapter } from "./contracts/client-session";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IDbProvider - Type contract for idb provider.
export type { IDbProvider } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IEmailProvider - Type contract for iemail provider.
export type { IEmailProvider } from "./contracts/email";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IEventBus - Type contract for ievent bus.
export type { IEventBus } from "./contracts/infra";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IFieldOps - Type contract for ifield ops.
export type { IFieldOps } from "./contracts/field-ops";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IPaymentProvider - Type contract for ipayment provider.
export type { IPaymentProvider } from "./contracts/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IQueueProvider - Type contract for iqueue provider.
export type { IQueueProvider } from "./contracts/infra";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IReadRepository - Type contract for iread repository.
export type { IReadRepository } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IRealtimeRepository - Type contract for irealtime repository.
export type { IRealtimeRepository } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IRepository - Type contract for irepository.
export type { IRepository } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ISearchProvider - Type contract for isearch provider.
export type { ISearchProvider } from "./contracts/search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ISessionProvider - Type contract for isession provider.
export type { ISessionProvider } from "./contracts/auth";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IShippingProvider - Type contract for ishipping provider.
export type { IShippingProvider } from "./contracts/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IStorageProvider - Type contract for istorage provider.
export type { IStorageProvider } from "./contracts/storage";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IStyleAdapter - Type contract for istyle adapter.
export type { IStyleAdapter } from "./contracts/style";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IWriteRepository - Type contract for iwrite repository.
export type { IWriteRepository } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LayoutSlots - Type contract for layout slots.
export type { LayoutSlots } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NavItem - Type contract for nav item.
export type { NavItem } from "./contracts/config";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PagedResult - Type contract for paged result.
export type { PagedResult } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentCapture - Type contract for payment capture.
export type { PaymentCapture } from "./contracts/payment";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentOrder - Type contract for payment order.
export type { PaymentOrder } from "./contracts/payment";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProviderRegistry - Type contract for provider registry.
export type { ProviderRegistry } from "./contracts/registry";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// QueueJob - Type contract for queue job.
export type { QueueJob } from "./contracts/infra";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RealtimeSnapshot - Type contract for realtime snapshot.
export type { RealtimeSnapshot } from "./contracts/client-realtime";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Refund - Type contract for refund.
export type { Refund } from "./contracts/payment";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RepositoryLifecycleHooks - Type contract for repository lifecycle hooks.
export type { RepositoryLifecycleHooks } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RouteStub - Type contract for route stub.
export type { RouteStub } from "./contracts/feature";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchHit - Type contract for search hit.
export type { SearchHit } from "./contracts/search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchOptions - Type contract for search options.
export type { SearchOptions } from "./contracts/search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchResult - Type contract for search result.
export type { SearchResult } from "./contracts/search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ServiceabilityResult - Type contract for serviceability result.
export type { ServiceabilityResult } from "./contracts/shipping";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Shipment - Type contract for shipment.
export type { Shipment } from "./contracts/shipping";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ShippingAddress - Type contract for shipping address.
export type { ShippingAddress } from "./contracts/shipping";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SieveQuery - Type contract for sieve query.
export type { SieveQuery } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SiteConfig - Type contract for site config.
export type { SiteConfig } from "./contracts/config";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SortDefinition - Type contract for sort definition.
export type { SortDefinition } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StorageFile - Type contract for storage file.
export type { StorageFile } from "./contracts/storage";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SuggestOptions - Type contract for suggest options.
export type { SuggestOptions } from "./contracts/search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TableColumn - Type contract for table column.
export type { TableColumn } from "./contracts/extend";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrackingEvent - Type contract for tracking event.
export type { TrackingEvent } from "./contracts/shipping";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrackingInfo - Type contract for tracking info.
export type { TrackingInfo } from "./contracts/shipping";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Unsubscribe - Type contract for unsubscribe.
export type { Unsubscribe } from "./contracts/client-realtime";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UploadOptions - Type contract for upload options.
export type { UploadOptions } from "./contracts/storage";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WhereOp - Type contract for where op.
export type { WhereOp } from "./contracts/repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WithTransformOpts - Type contract for with transform opts.
export type { WithTransformOpts } from "./contracts/extend";

// ./validation/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ZodSetup - Shared export for zod setup.
export { ZodSetup } from "./validation/ZodSetup";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// addPhoneSchema - Helper for add phone schema.
export { addPhoneSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// calculatePasswordStrength - Helper for calculate password strength.
export { calculatePasswordStrength } from "./validation/password.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// changePasswordSchema - Model for change password schema.
export { changePasswordSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// cropDataSchema - Model for crop data schema.
export { cropDataSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// dateStringSchema - Model for date string schema.
export { dateStringSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// deleteAccountSchema - Helper for delete account schema.
export { deleteAccountSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// emailSchema - Model for email schema.
export { emailSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// exactLength - Shared export for exact length.
export { exactLength } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// extractCountryCode - Shared export for extract country code.
export { extractCountryCode } from "./validation/phone.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// formatPhone - Helper for format phone.
export { formatPhone } from "./validation/phone.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// formatZodErrors - Helper for format zod errors.
export { formatZodErrors } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// inRange - Shared export for in range.
export { inRange } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isCommonPassword - Shared export for is common password.
export { isCommonPassword } from "./validation/password.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isDisposableEmail - Shared export for is disposable email.
export { isDisposableEmail } from "./validation/email.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isExternalUrl - Shared export for is external url.
export { isExternalUrl } from "./validation/url.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isInList - Shared export for is in list.
export { isInList } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isNumeric - Shared export for is numeric.
export { isNumeric } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isRequired - Shared export for is required.
export { isRequired } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidEmail - Shared export for is valid email.
export { isValidEmail } from "./validation/email.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidEmailDomain - Shared export for is valid email domain.
export { isValidEmailDomain } from "./validation/email.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidMobile - Shared export for is valid mobile.
export { isValidMobile } from "./validation/phone.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidPhone - Shared export for is valid phone.
export { isValidPhone } from "./validation/phone.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidUrl - Shared export for is valid url.
export { isValidUrl } from "./validation/url.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidUrlWithProtocol - Shared export for is valid url with protocol.
export { isValidUrlWithProtocol } from "./validation/url.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// matchesPattern - Shared export for matches pattern.
export { matchesPattern } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// maxLength - Shared export for max length.
export { maxLength } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// mediaUrlSchema - Model for media url schema.
export { mediaUrlSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// meetsPasswordRequirements - Shared export for meets password requirements.
export { meetsPasswordRequirements } from "./validation/password.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// minLength - Shared export for min length.
export { minLength } from "./validation/input.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// normalizeEmail - Helper for normalize email.
export { normalizeEmail } from "./validation/email.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// normalizePhone - Helper for normalize phone.
export { normalizePhone } from "./validation/phone.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// objectIdSchema - Model for object id schema.
export { objectIdSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// paginationQuerySchema - Model for pagination query schema.
export { paginationQuerySchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// passwordSchema - Model for password schema.
export { passwordSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// phoneSchema - Model for phone schema.
export { phoneSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// resetPasswordSchema - Model for reset password schema.
export { resetPasswordSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// sanitizeUrl - Shared export for sanitize url.
export { sanitizeUrl } from "./validation/url.validator";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// sendVerificationSchema - Model for send verification schema.
export { sendVerificationSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// setupZodErrorMap - Model for setup zod error map.
export { setupZodErrorMap } from "./validation/zod-error-map";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// trimDataSchema - Model for trim data schema.
export { trimDataSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// urlSchema - Model for url schema.
export { urlSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// validateRequestBody - Helper for validate request body.
export { validateRequestBody } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// verifyPhoneSchema - Model for verify phone schema.
export { verifyPhoneSchema } from "./validation/schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// zodErrorMap - Model for zod error map.
export { zodErrorMap } from "./validation/zod-error-map";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PasswordRequirements - Type contract for password requirements.
export type { PasswordRequirements } from "./validation/password.validator";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PasswordStrength - Type contract for password strength.
export type { PasswordStrength } from "./validation/password.validator";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ZodSetupProps - Type contract for zod setup props.
export type { ZodSetupProps } from "./validation/ZodSetup";

// ./errors/index
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// ApiError - Model for api error.
export { ApiError } from "./errors/api-error";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// AppError - Model for app error.
export { AppError } from "./errors/base-error";
// withDegraded / DegradedNotice / SORT_DROPPED_FOR_EXACT_SEARCH — a response
// that is honest about a compromise the handler made deliberately.
export { withDegraded, SORT_DROPPED_FOR_EXACT_SEARCH } from "./errors/degraded";
export type { DegradedNotice } from "./errors/degraded";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// AuthenticationError - Model for authentication error.
export { AuthenticationError } from "./errors/authentication-error";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// AuthorizationError - Model for authorization error.
export { AuthorizationError } from "./errors/authorization-error";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// DatabaseError - Model for database error.
export { DatabaseError } from "./errors/database-error";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// ERROR_CODES - Constant used across modules.
export { ERROR_CODES, BID_ERROR_CODES, OFFER_ERROR_CODES } from "./errors/error-codes";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// ERROR_MESSAGES - Constant used across modules.
export { ERROR_MESSAGES } from "./errors/messages";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// NotFoundError - Model for not found error.
export { NotFoundError } from "./errors/not-found-error";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// ValidationError - Model for validation error.
export { ValidationError } from "./errors/validation-error";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// handleApiError - Model for handle api error.
export { handleApiError } from "./errors/error-handler";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// isAppError - Model for is app error.
export { isAppError } from "./errors/error-handler";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logError - Helper for log error.
export { logError } from "./errors/error-handler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ErrorCode - Type contract for error code.
export type { ErrorCode } from "./errors/error-codes";
// [UTIL]-Pure utility — no framework or runtime dependency; safe to import from any environment.
// PaymentProviderUnreachableError - Thrown when the payment gateway API exhausts retries.
export { PaymentProviderUnreachableError } from "./errors/payment-provider-unreachable";
// [UTIL]-Pure utility — server boundary code/HTTP mapper for any thrown value.
// mapToHttpError - Map any thrown value to { status, code, message, issues? }.
export { mapToHttpError, HTTP_ERROR_CODES } from "./errors/error-mapping";
// [TYPE]-TypeScript type-only export — erased at compile time, zero runtime cost.
export type { MappedError, HttpErrorCode } from "./errors/error-mapping";
// [UTIL]-Pure utility — client-safe lookup of inline-field + i18n key per error code.
// ERROR_DISPLAY_MAP - CLAUDE.md Rule #9 source-of-truth for client error rendering.
export { ERROR_DISPLAY_MAP, getErrorDisplay } from "./errors/error-display-map";
// [UTIL]-Pure utility — the ONLY sanctioned way to turn a failure into user copy.
// toUserMessage - resolves a stable error code through errors.codes.*; terminates
// in a constant, so a thrown value's own .message can never reach a user
// (audit-raw-error-text).
export { toUserMessage, GENERIC_USER_MESSAGE } from "./errors/error-display-map";
// [TYPE]-TypeScript type-only export — erased at compile time, zero runtime cost.
export type { ErrorDisplayEntry } from "./errors/error-display-map";

// [SERVER-ONLY] parseJsonBody — strict JSON request-body parser for API routes.
// Replaces the silent `request.json().catch(() => ({}))` anti-pattern. Throws
// ValidationError on malformed JSON → routeHandler wrapper maps to 400.
export { parseJsonBody } from "./next/api/parseJsonBody";

// ./seo/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SEO_CONFIG - Constant used across modules.
export { SEO_CONFIG } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// aggregateRatingJsonLd - Shared export for aggregate rating json ld.
export { aggregateRatingJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectorDropJsonLd - Shared export for collector drop json ld.
export { collectorDropJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogPostJsonLd - Shared export for blog post json ld.
export { blogPostJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// breadcrumbJsonLd - Shared export for breadcrumb json ld.
export { breadcrumbJsonLd } from "./seo/json-ld";
// D4 — the two builders the category/brand pages needed and that did not exist.
// `collectionPageJsonLd` says what a listing page IS; `itemListJsonLd` says what
// it contains. Neither ever carries a price: the page shows a signed-out crawler
// none, and `audit-guest-price-leak` R3 blocks it.
export { collectionPageJsonLd, itemListJsonLd } from "./seo/json-ld";
export type { CollectionPageJsonLdInput, ItemListJsonLdEntry } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createSeoConfig - Helper for create seo config.
export { createSeoConfig } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqJsonLd - Shared export for faq json ld.
export { faqJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// gatedPriceWebPageJsonLd - Shared export for gated price web page json ld.
export { gatedPriceWebPageJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateCollectorDropMetadata - Helper for generate collector drop metadata.
export { generateCollectorDropMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateBlogMetadata - Helper for generate blog metadata.
export { generateBlogMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateCategoryMetadata - Helper for generate category metadata.
export { generateCategoryMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateMetadata - Helper for generate metadata.
export { generateMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateProductMetadata - Helper for generate product metadata.
export { generateProductMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateProfileMetadata - Helper for generate profile metadata.
export { generateProfileMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateSearchMetadata - Helper for generate search metadata.
export { generateSearchMetadata } from "./seo/metadata";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// organizationJsonLd - Shared export for organization json ld.
export { organizationJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productJsonLd - Shared export for product json ld.
export { productJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewJsonLd - Shared export for review json ld.
export { reviewJsonLd } from "./seo/json-ld";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// searchBoxJsonLd - Shared export for search box json ld.
export { searchBoxJsonLd } from "./seo/json-ld";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectorDropSeoInput - Type contract for collector drop seo input.
export type { CollectorDropSeoInput } from "./seo/metadata";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostJsonLdInput - Type contract for blog post json ld input.
export type { BlogPostJsonLdInput } from "./seo/json-ld";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogSeoInput - Type contract for blog seo input.
export type { BlogSeoInput } from "./seo/metadata";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BreadcrumbJsonLdItem - Type contract for breadcrumb json ld item.
export type { BreadcrumbJsonLdItem } from "./seo/json-ld";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategorySeoInput - Type contract for category seo input.
export type { CategorySeoInput } from "./seo/metadata";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FaqJsonLdInput - Type contract for faq json ld input.
export type { FaqJsonLdInput } from "./seo/json-ld";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductJsonLdInput - Type contract for product json ld input.
export type { ProductJsonLdInput } from "./seo/json-ld";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductSeoInput - Type contract for product seo input.
export type { ProductSeoInput } from "./seo/metadata";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewJsonLdInput - Type contract for review json ld input.
export type { ReviewJsonLdInput } from "./seo/json-ld";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeoConfig - Type contract for seo config.
export type { SeoConfig } from "./seo/metadata";

// ./cli/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FEATURE_SUBPATH_MAP - Constant used across modules.
export { FEATURE_SUBPATH_MAP } from "./cli/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// mergeFeatureMessages - Helper for merge feature messages.
export { mergeFeatureMessages } from "./cli/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// withFeatures - Shared export for with features.
export { withFeatures } from "./cli/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NextConfig - Type contract for next config.
export type { NextConfig } from "./cli/index";

// ./core/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CacheManager - Shared export for cache manager.
export { CacheManager } from "./core/CacheManager";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventBus - Shared export for event bus.
export { EventBus } from "./core/EventBus";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Logger - Shared export for logger.
export { Logger } from "./core/Logger";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MUTATION_EVENTS - Constant used across modules.
export { MUTATION_EVENTS } from "./core/mutation-events";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// NEWSLETTER_SUBSCRIBERS_COLLECTION - Constant used across modules.
export { NEWSLETTER_SUBSCRIBERS_COLLECTION } from "./core/newsletter.repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// NEWSLETTER_SUBSCRIBER_FIELDS - Constant used across modules.
export { NEWSLETTER_SUBSCRIBER_FIELDS } from "./core/newsletter.repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// NEWSLETTER_SUBSCRIBER_INDEXED_FIELDS - Constant used across modules.
export { NEWSLETTER_SUBSCRIBER_INDEXED_FIELDS } from "./core/newsletter.repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Queue - Shared export for queue.
export { Queue } from "./core/Queue";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SITE_CONFIG - Constant used across modules.
export { SITE_CONFIG } from "./core/site-config";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StorageManager - Shared export for storage manager.
export { StorageManager } from "./core/StorageManager";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// _resetActionMiddleware - Shared export for reset action middleware.
export { _resetActionMiddleware } from "./core/server-action";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// cacheManager - Shared export for cache manager.
export { cacheManager } from "./core/CacheManager";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// configureMarketDefaults - Shared export for configure market defaults.
export { configureMarketDefaults } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createServerAction - Helper for create server action.
export { createServerAction } from "./core/server-action";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createSiteConfig - Helper for create site config.
export { createSiteConfig } from "./core/site-config";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// emitMutation - Shared export for emit mutation.
export { emitMutation } from "./core/mutation-events";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventBus - Shared export for event bus.
export { eventBus } from "./core/EventBus";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getDefaultCountry - Helper for get default country.
export { getDefaultCountry } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getDefaultCurrency - Helper for get default currency.
export { getDefaultCurrency } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getDefaultCurrencySymbol - Helper for get default currency symbol.
export { getDefaultCurrencySymbol } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getDefaultLocale - Helper for get default locale.
export { getDefaultLocale } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getDefaultPhonePrefix - Helper for get default phone prefix.
export { getDefaultPhonePrefix } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getDefaultTimezone - Helper for get default timezone.
export { getDefaultTimezone } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getMarketProfile - Helper for get market profile.
export { getMarketProfile } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// inferMutationEvent - Helper for infer mutation event.
export { inferMutationEvent } from "./core/mutation-events";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// invalidateIntegrationKeysCache - Shared export for invalidate integration keys cache.
export { invalidateIntegrationKeysCache } from "./core/integration-keys";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// logger - Shared export for logger.
export { logger } from "./core/Logger";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// newsletterRepository - Shared export for newsletter repository.
export { newsletterRepository } from "./core/newsletter.repository";
// contactSubmissionsRepository - Firestore repository for contact form submissions.
export { contactSubmissionsRepository, CONTACT_SUBMISSIONS_COLLECTION } from "./core/contact-submissions.repository";
export type { ContactSubmissionDocument, ContactSubmissionCreateInput } from "./core/contact-submissions.repository";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// onMutation - Shared export for on mutation.
export { onMutation } from "./core/mutation-events";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// resetMarketDefaults - Shared export for reset market defaults.
export { resetMarketDefaults } from "./core/baseline-resolver";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// resolveSiteConfig - Helper for resolve site config.
export { resolveSiteConfig } from "./core/site-config";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// setActionMiddleware - Helper for set action middleware.
export { setActionMiddleware } from "./core/server-action";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// storageManager - Shared export for storage manager.
export { storageManager } from "./core/StorageManager";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// subscribeNewsletter - Shared export for subscribe newsletter.
export { subscribeNewsletter } from "./core/newsletter-actions";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// unitOfWork - Shared export for unit of work.
export { unitOfWork } from "./core/unit-of-work";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSiteSettings - React hook for use site settings.
export { useSiteSettings } from "./core/hooks/useSiteSettings";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ActionMiddleware - Type contract for action middleware.
export type { ActionMiddleware } from "./core/server-action";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ActionMiddlewareContext - Type contract for action middleware context.
export type { ActionMiddlewareContext } from "./core/server-action";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ActionResult - Type contract for action result.
export type { ActionResult } from "./_internal/shared/types/action-result";
// handleActionError - Maps domain errors to structured { ok: false, error, code } responses.
export { handleActionError } from "./utils/action-response";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CacheEntry - Type contract for cache entry.
export type { CacheEntry } from "./core/CacheManager";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CacheOptions - Type contract for cache options.
export type { CacheOptions } from "./core/CacheManager";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventSubscription - Type contract for event subscription.
export type { EventSubscription } from "./core/EventBus";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LogEntry - Type contract for log entry.
export type { LogEntry } from "./core/Logger";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LogLevel - Type contract for log level.
export type { LogLevel } from "./core/Logger";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LoggerOptions - Type contract for logger options.
export type { LoggerOptions } from "./core/Logger";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketProfile - Type contract for market profile.
export type { MarketProfile } from "./core/baseline-resolver";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MutationEventPayload - Type contract for mutation event payload.
export type { MutationEventPayload } from "./core/mutation-events";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NewsletterSubscriberCreateInput - Type contract for newsletter subscriber create input.
export type { NewsletterSubscriberCreateInput } from "./core/newsletter.repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NewsletterSubscriberDocument - Type contract for newsletter subscriber document.
export type { NewsletterSubscriberDocument } from "./core/newsletter.repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NewsletterSubscriberUpdateInput - Type contract for newsletter subscriber update input.
export type { NewsletterSubscriberUpdateInput } from "./core/newsletter.repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// QueueOptions - Type contract for queue options.
export type { QueueOptions } from "./core/Queue";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ResolvedKeys - Type contract for resolved keys.
export type { ResolvedKeys } from "./core/integration-keys";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RuntimeSiteConfig - Type contract for runtime site config.
export type { RuntimeSiteConfig } from "./core/site-config";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ServerActionOptions - Type contract for server action options.
export type { ServerActionOptions } from "./core/server-action";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StorageOptions - Type contract for storage options.
export type { StorageOptions } from "./core/StorageManager";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StorageType - Type contract for storage type.
export type { StorageType } from "./core/StorageManager";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SubscribeNewsletterActionInput - Type contract for subscribe newsletter action input.
export type { SubscribeNewsletterActionInput } from "./core/newsletter-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SupportedNewsletterSource - Type contract for supported newsletter source.
export type { SupportedNewsletterSource } from "./core/newsletter-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Task - Type contract for task.
export type { Task } from "./core/Queue";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UnitOfWork - Type contract for unit of work.
export type { UnitOfWork } from "./core/unit-of-work";

// ./security/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ADDRESS_PII_FIELDS - Constant used across modules.
export { ADDRESS_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BID_PII_FIELDS - Constant used across modules.
export { BID_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Can - Shared export for can.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EVENT_ENTRY_PII_FIELDS - Constant used across modules.
export { EVENT_ENTRY_PII_FIELDS } from "./security/pii-schemas";
// LOTTERY_ENTRY_PII_FIELDS - PII fields for lottery entries.
export { LOTTERY_ENTRY_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OFFER_PII_FIELDS - Constant used across modules.
export { OFFER_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ORDER_PII_FIELDS - Constant used across modules.
export { ORDER_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PAYOUT_PII_FIELDS - Constant used across modules.
export { PAYOUT_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PAYOUT_PII_INDEX_MAP - Constant used across modules.
export { PAYOUT_PII_INDEX_MAP } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_PII_FIELDS - Constant used across modules.
export { REVIEW_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_PII_INDEX_MAP - Constant used across modules.
export { REVIEW_PII_INDEX_MAP } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// RateLimitPresets - Shared export for rate limit presets.
export { RateLimitPresets } from "./security/rate-limit";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TOKEN_PII_FIELDS - Constant used across modules.
export { TOKEN_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TOKEN_PII_INDEX_MAP - Constant used across modules.
export { TOKEN_PII_INDEX_MAP } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// USER_PII_FIELDS - Constant used across modules.
export { USER_PII_FIELDS } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// USER_PII_INDEX_MAP - Constant used across modules.
export { USER_PII_INDEX_MAP } from "./security/pii-schemas";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// applyRateLimit - Helper for apply rate limit.
export { applyRateLimit } from "./security/rate-limit";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCSP - Helper for build csp.
export { buildCSP } from "./security/csp";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// canChangeRole - Model for can change role.
export { canChangeRole } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// clearRateLimitStore - Shared export for clear rate limit store.
export { clearRateLimitStore } from "./security/rate-limit";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// decryptBuffer - Helper for decrypt buffer (binary enc:v1: envelope).
export { decryptBuffer } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// decryptSecret - Helper for decrypt secret.
export { decryptSecret } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// encryptBuffer - Helper for encrypt buffer (binary enc:v1: envelope).
export { encryptBuffer } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// encryptSecret - Helper for encrypt secret.
export { encryptSecret } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateNonce - Helper for generate nonce.
export { generateNonce } from "./security/csp";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getRoleLevel - Helper for get role level.
export { getRoleLevel } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// hasAllPermissions - Shared export for has all permissions.
export { hasAllPermissions } from "./features/auth/permissions/constants";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// hasAnyPermission - Model for has any permission.
export { hasAnyPermission } from "./features/auth/permissions/constants";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// hasPermission - Model for has permission.
export { hasPermission } from "./features/auth/permissions/constants";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isBufferEncrypted - Shared export for is buffer encrypted.
export { isBufferEncrypted } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isSecretEncrypted - Shared export for is secret encrypted.
export { isSecretEncrypted } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// maskSecret - Helper for mask secret.
export { maskSecret } from "./security/settings-encryption";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// rateLimit - Shared export for rate limit.
export { rateLimit } from "./security/rate-limit";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// rateLimitByIdentifier - Shared export for rate limit by identifier.
export { rateLimitByIdentifier } from "./security/rate-limit";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// redactPii - Shared export for redact pii.
export { redactPii, safeDisplayName, safeDisplayEmail } from "./security/pii-redact";
// [CLIENT-SSR]-Runs in both SSR and browser â€" pure display-masking helpers, no crypto dependency.
export {
  isPiiEncrypted,
  maskName,
  maskEmail,
  maskPublicReview,
  maskPublicBid,
  maskPublicEventEntry,
  maskOfferForSeller,
  ENC_PREFIX,
  HMAC_PREFIX,
} from "./security/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// requireActiveAccount - Shared export for require active account.
export { requireActiveAccount } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// requireAuth - Shared export for require auth.
export { requireAuth } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// requireEmailVerified - Shared export for require email verified.
export { requireEmailVerified } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// requireOwnership - Shared export for require ownership.
export { requireOwnership } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// requireRole - Model for require role.
export { requireRole } from "./security/authorization";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Permission - Type contract for permission.
export type { Permission } from "./features/auth/permissions/constants";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RateLimitConfig - Type contract for rate limit config.
export type { RateLimitConfig } from "./security/rate-limit";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RateLimitResult - Type contract for rate limit result.
export type { RateLimitResult } from "./security/rate-limit";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserRole - Type contract for user role.
export type { UserRole } from "./security/authorization";

// ./repositories/index
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// AddressesRepository - unified top-level addresses collection (SB-UNI-A 2026-05-13).
export { AddressesRepository } from "./features/addresses/repository/addresses.repository";
// S-STORE foundation — 14 schemas + 14 repositories + RBAC.
export {
  // Schemas — payout methods
  type PayoutMethodType,
  type PayoutMethodDocument,
  PAYOUT_METHODS_COLLECTION,
  PAYOUT_METHOD_INDEXED_FIELDS,
  DEFAULT_PAYOUT_METHOD_DATA,
  // Schemas — shipping configs
  type ShippingMethod as ShippingConfigMethod,
  type ShippingConfigDocument,
  SHIPPING_CONFIGS_COLLECTION,
  SHIPPING_CONFIG_INDEXED_FIELDS,
  DEFAULT_SHIPPING_CONFIG_DATA,
  // Schemas — analytics cards
  type AnalyticsScope,
  type AnalyticsCardType,
  type AnalyticsCardDocument,
  ANALYTICS_CARDS_COLLECTION,
  ANALYTICS_CARD_INDEXED_FIELDS,
  DEFAULT_ANALYTICS_CARD_DATA,
  // Schemas — analytics alerts
  type AlertOperator,
  type AnalyticsAlertDocument,
  ANALYTICS_ALERTS_COLLECTION,
  ANALYTICS_ALERT_INDEXED_FIELDS,
  DEFAULT_ANALYTICS_ALERT_DATA,
  // Schemas — store categories
  type StoreCategoryDocument,
  storeCategoryFormSchema,
  storeCategoryCreateSchema,
  storeCategoryUpdateSchema,
  type StoreCategoryFormValues,
  listingTemplateFormSchema,
  listingTemplateCreateSchema,
  listingTemplateUpdateSchema,
  type ListingTemplateFormValues,
  LISTING_TEMPLATE_TYPES,
  LISTING_TEMPLATE_TYPE_OPTIONS,
  payoutMethodFormSchema,
  payoutMethodCreateSchema,
  payoutMethodUpdateSchema,
  type PayoutMethodFormValues,
  shippingConfigFormSchema,
  SHIPPING_METHOD_OPTIONS,
  shippingConfigCreateSchema,
  shippingConfigUpdateSchema,
  type ShippingConfigFormValues,
  customRoleFormSchema,
  customRoleCreateSchema,
  customRoleUpdateSchema,
  isKnownPermission,
  type CustomRoleFormValues,
  moderationReviewFormSchema,
  moderationReviewUpdateSchema,
  MODERATION_REVIEWER_STATUSES,
  type ModerationReviewFormValues,
  reportReviewFormSchema,
  reportReviewUpdateSchema,
  REPORT_REVIEWER_STATUSES,
  REPORT_TERMINAL_STATUSES,
  type ReportReviewFormValues,
  reportCreateSchema,
  type ReportCreateValues,
  itemRequestCreateSchema,
  type ItemRequestCreateValues,
  REPORT_ENTITY_TYPES,
  REPORT_REASONS,
  analyticsAlertCreateSchema,
  type AnalyticsAlertCreateValues,
  analyticsCardCreateSchema,
  type AnalyticsCardCreateValues,
  ANALYTICS_ALERT_OPERATORS,
  ANALYTICS_CARD_TYPES,
  storeGoogleConfigUpdateSchema,
  type StoreGoogleConfigFormValues,
  toSellerGoogleConfig,
  type SellerGoogleConfig,
  adminNotificationCreateSchema,
  type AdminNotificationCreateValues,
  ADMIN_NOTIFICATION_CATEGORIES,
  ADMIN_NOTIFICATION_SEVERITIES,
  STORE_CATEGORIES_COLLECTION,
  STORE_CATEGORY_INDEXED_FIELDS,
  DEFAULT_STORE_CATEGORY_DATA,
  // Schemas — listing templates
  type ListingTemplateType,
  type ListingTemplateDocument,
  LISTING_TEMPLATES_COLLECTION,
  LISTING_TEMPLATE_INDEXED_FIELDS,
  DEFAULT_LISTING_TEMPLATE_DATA,
  // Schemas — moderation queue
  type ModerationStatus,
  type ModerationMediaType,
  type ModerationQueueDocument,
  MODERATION_QUEUE_COLLECTION,
  MODERATION_QUEUE_INDEXED_FIELDS,
  DEFAULT_MODERATION_QUEUE_DATA,
  // Schemas — reports
  type ReportEntityType,
  type ReportStatus,
  type ReportReason,
  type ReportDocument,
  REPORTS_COLLECTION,
  REPORT_INDEXED_FIELDS,
  DEFAULT_REPORT_DATA,
  // Schemas — admin notifications
  type AdminNotificationCategory,
  type AdminNotificationDocument,
  ADMIN_NOTIFICATIONS_COLLECTION,
  ADMIN_NOTIFICATION_INDEXED_FIELDS,
  DEFAULT_ADMIN_NOTIFICATION_DATA,
  // Schemas — item requests
  type ItemRequestStatus,
  type ItemRequestReply,
  type ItemRequestDocument,
  ITEM_REQUESTS_COLLECTION,
  ITEM_REQUEST_INDEXED_FIELDS,
  DEFAULT_ITEM_REQUEST_DATA,
  // Schemas — store integrations
  type StoreGoogleConfigDocument,
  STORE_GOOGLE_CONFIG_COLLECTION,
  STORE_GOOGLE_CONFIG_INDEXED_FIELDS,
  DEFAULT_STORE_GOOGLE_CONFIG_DATA,
  type StoreWhatsAppConfigDocument,
  STORE_WHATSAPP_CONFIG_COLLECTION,
  STORE_WHATSAPP_CONFIG_INDEXED_FIELDS,
  DEFAULT_STORE_WHATSAPP_CONFIG_DATA,
  // Schemas — RBAC
  type CustomRoleDocument,
  CUSTOM_ROLES_COLLECTION,
  CUSTOM_ROLE_INDEXED_FIELDS,
  DEFAULT_CUSTOM_ROLE_DATA,
  type RoleOverrideDocument,
  ROLE_OVERRIDES_COLLECTION,
  ROLE_OVERRIDE_INDEXED_FIELDS,
  DEFAULT_ROLE_OVERRIDE_DATA,
  // Repositories — classes
  PayoutMethodsRepository,
  ShippingConfigsRepository,
  AnalyticsCardsRepository,
  AnalyticsAlertsRepository,
  StoreCategoriesRepository,
  ListingTemplatesRepository,
  ModerationQueueRepository,
  ReportsRepository,
  AdminNotificationsRepository,
  ItemRequestsRepository,
  StoreGoogleConfigRepository,
  StoreWhatsAppConfigRepository,
  CustomRolesRepository,
  RoleOverridesRepository,
  // Repositories — singletons
  payoutMethodsRepository,
  shippingConfigsRepository,
  analyticsCardsRepository,
  analyticsAlertsRepository,
  storeCategoriesRepository,
  listingTemplatesRepository,
  moderationQueueRepository,
  reportsRepository,
  adminNotificationsRepository,
  itemRequestsRepository,
  storeGoogleConfigRepository,
  storeWhatsAppConfigRepository,
  customRolesRepository,
  roleOverridesRepository,
} from "./features/store-extensions/index";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// BaseRepository - Shared export for base repository.
export { BaseRepository } from "./repositories/index";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// BlogRepository - Shared export for blog repository.
export { BlogRepository } from "./features/blog/repository/blog.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// CartRepository - Shared export for cart repository.
export { CartRepository } from "./features/cart/repository/cart.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// CategoriesRepository - Shared export for categories repository.
export { CategoriesRepository } from "./features/categories/repository/categories.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// EmailVerificationTokenRepository - Shared export for email verification token repository.
export { EmailVerificationTokenRepository } from "./features/auth/repository/token.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// EventEntriesRepository - Shared export for event entries repository.
export { EventEntriesRepository } from "./features/events/repository/event-entry.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// EventEntryRepository - Shared export for event entry repository.
export { EventEntryRepository } from "./features/events/repository/event-entry.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// EventRepository - Shared export for event repository.
export { EventRepository } from "./features/events/repository/events.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// EventsRepository - Shared export for events repository.
export { EventsRepository } from "./features/events/repository/events.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// FAQsRepository - Shared export for faqs repository.
export { FAQsRepository } from "./features/faq/repository/faqs.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// FirebaseFAQsRepository - Shared export for firebase faqs repository.
export { FirebaseFAQsRepository } from "./features/faq/repository/faqs.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// NewsletterRepository - Shared export for newsletter repository.
export { NewsletterRepository } from "./core/newsletter.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// OfferRepository - Shared export for offer repository.
export { OfferRepository } from "./features/seller/repository/offer.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// OrderRepository - Shared export for order repository.
export { OrderRepository } from "./features/orders/repository/orders.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// PasswordResetTokenRepository - Shared export for password reset token repository.
export { PasswordResetTokenRepository } from "./features/auth/repository/token.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// ProductRepository - Shared export for product repository.
export { ProductRepository } from "./features/products/repository/products.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// ReviewRepository - Shared export for review repository.
export { ReviewRepository } from "./features/reviews/repository/reviews.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// SessionRepository - Shared export for session repository.
export { SessionRepository } from "./features/auth/repository/session.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// SmsCounterRepository - Shared export for sms counter repository.
export { SmsCounterRepository } from "./features/auth/repository/sms-counter.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// StoreRepository - Shared export for store repository.
export { StoreRepository } from "./features/stores/repository/store.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// UserRepository - Shared export for user repository.
export { UserRepository } from "./features/auth/repository/user.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// addressesRepository - unified addresses repo (ownerType discriminator). SB-UNI-A 2026-05-13.
export { addressesRepository } from "./features/addresses/repository/addresses.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// bidRepository - Shared export for bid repository.
export { bidRepository } from "./features/collector-drops/repository/bid.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// blogRepository - Shared export for blog repository.
export { blogRepository } from "./features/blog/repository/blog.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// cartRepository - Shared export for cart repository.
export { cartRepository } from "./features/cart/repository/cart.repository";
// SB-UNI-C â€" brandsRepository + BrandDocument + BRANDS_COLLECTION deleted.
// Brands now live in the categories collection with categoryType:"brand".
// Use categoriesRepository.findBySlugAndType(slug, "brand") and
// categoriesRepository.findActiveBrands(). CategoryDocument carries
// brandWebsite / brandCountry / brandFounded / highlights / faqs.
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// categoriesRepository - Shared export for categories repository.
export { categoriesRepository } from "./features/categories/repository/categories.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// couponsRepository - Shared export for coupons repository.
export { couponsRepository } from "./features/promotions/repository/coupons.repository";
// [DB] claimedCouponsRepository — user-wallet claims (plan §10).
export { claimedCouponsRepository, ClaimedCouponsRepository } from "./features/promotions/repository/claimed-coupons.repository";
export type { ClaimedCouponCreateInput } from "./features/promotions/repository/claimed-coupons.repository";
export type {
 ClaimedCouponDocument,
 ClaimedCouponStatus,
 ClaimedCouponSource,
 ClaimedCouponSnapshot,
} from "./features/promotions/schemas";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// emailVerificationTokenRepository - Shared export for email verification token repository.
export { emailVerificationTokenRepository } from "./features/auth/repository/token.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// eventEntryRepository - Shared export for event entry repository.
export { eventEntryRepository } from "./features/events/repository/event-entry.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// eventRepository - Shared export for event repository.
export { eventRepository } from "./features/events/repository/events.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// faqsRepository - Shared export for faqs repository.
export { faqsRepository } from "./features/faq/repository/faqs.repository";
// [DB]-Database layer — uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// testerChecklistItemRepository - Shared export for the tester checklist catalog repository.
export { testerChecklistItemRepository } from "./features/tester/repository/tester-checklist-item.repository";
// [DB]-Database layer — uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// testerChecklistResponseRepository - Shared export for the tester checklist response repository.
export { testerChecklistResponseRepository } from "./features/tester/repository/tester-checklist-response.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// homepageSectionsRepository - Shared export for homepage sections repository.
export { homepageSectionsRepository } from "./features/homepage/repository/homepage-sections.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// jobsRepository - Shared export for the async-job (jobs collection) repository.
export { jobsRepository, JobsRepository } from "./features/jobs/repository/jobs.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// adminAuditLogRepository - Shared export for the admin audit-log (adminAuditLog collection) repository.
export { adminAuditLogRepository, AdminAuditLogRepository } from "./features/audit-log/repository/audit-log.repository";
export { recordAdminAction } from "./_internal/server/features/audit-log/actions";
export type { RecordAdminActionInput } from "./_internal/server/features/audit-log/actions";
export { AdminAuditActionValues, ADMIN_AUDIT_LOG_FIELDS, ADMIN_AUDIT_LOG_COLLECTION } from "./features/audit-log/schemas/firestore";
export type { AdminAuditAction, AdminAuditLogDocument } from "./features/audit-log/schemas/firestore";
export {
  BusinessDocumentKindValues,
  ALL_BUSINESS_DOCUMENT_KINDS,
  BUSINESS_DOCUMENT_KIND_LABELS,
  BUSINESS_DOCUMENT_FIELDS,
  BUSINESS_DOCUMENTS_COLLECTION,
  BUSINESS_DOCUMENTS_STORAGE_PREFIX,
  BUSINESS_DOCUMENT_ALLOWED_TYPES,
} from "./features/business-documents/schemas/firestore";
export type { BusinessDocumentKind, BusinessDocumentDocument } from "./features/business-documents/schemas/firestore";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// notificationRepository - Shared export for notification repository.
export { notificationRepository } from "./features/admin/repository/notification.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// offerRepository - Shared export for offer repository.
export { offerRepository } from "./features/seller/repository/offer.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// orderRepository - Shared export for order repository.
export { orderRepository } from "./features/orders/repository/orders.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// passwordResetTokenRepository - Shared export for password reset token repository.
export { passwordResetTokenRepository } from "./features/auth/repository/token.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// payoutRepository - Shared export for payout repository.
export { payoutRepository } from "./features/payments/repository/payout.repository";
// shipmentsRepository / shipmentLotsRepository / shipmentItemsRepository - procurement shipments repositories.
export { shipmentsRepository } from "./features/shipments/repository/shipments.repository";
export { shipmentLotsRepository } from "./features/shipments/repository/shipment-lots.repository";
export { shipmentItemsRepository } from "./features/shipments/repository/shipment-items.repository";
export { catalogueRepository } from "./features/catalogue/repository/catalogue.repository";
// savedPaymentMethodsRepository - user saved payment methods (UPI, card, bank) with PII encryption + ban system.
export { savedPaymentMethodsRepository, SavedPaymentMethodsRepository } from "./features/payments/repository/saved-payment-methods.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// productRepository - Shared export for product repository.
export { productRepository, resolveStockResync } from "./repositories/index";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// pageViewsRepository - day-bucketed page-view counters by entity + URL.
export { pageViewsRepository, PAGE_VIEW_ENTITY_TYPES } from "./features/analytics/repository/page-views.repository";
export type { PageViewDocument, PageViewEntityType } from "./features/analytics/repository/page-views.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// reviewRepository - Shared export for review repository.
export { reviewRepository } from "./features/reviews/repository/reviews.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// sessionRepository - Shared export for session repository.
export { sessionRepository } from "./features/auth/repository/session.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// siteSettingsRepository - Shared export for site settings repository.
export { siteSettingsRepository } from "./features/admin/repository/site-settings.repository";
// analyticsRollupRepository - reads the pre-computed admin-dashboard revenue rollup.
export { analyticsRollupRepository } from "./features/admin/repository/analytics-rollup.repository";
export type { AnalyticsRollupDocument } from "./features/admin/repository/analytics-rollup.repository";
// ADMIN_CHECKOUT_BYPASS_FLAG_KEY - field name for the admin checkout bypass flag.
export { ADMIN_CHECKOUT_BYPASS_FLAG_KEY } from "./features/admin/schemas/firestore";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// smsCounterRepository - Shared export for sms counter repository.
export { smsCounterRepository } from "./features/auth/repository/sms-counter.repository";
// SB-UNI-A 2026-05-13 â€" storeAddressRepository deleted. Use addressesRepository
// with ownerType:"store" via the unified addresses collection.
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// storeRepository - Shared export for store repository.
export { storeRepository } from "./features/stores/repository/store.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// scammerRepository - Shared export for scammer profiles repository.
export { scammerRepository } from "./features/scams/repository/scammer.repository";
// supportRepository - Server-only repository for support tickets (BAN1).
export { supportRepository, SupportRepository } from "./features/support/repository/support.repository";
export type {
 SupportTicketDocument,
 SupportTicketCreateInput,
 SupportTicketUpdateInput,
 TicketMessage,
 TicketCategory,
 TicketStatus,
 TicketPriority,
} from "./repositories/index";
export {
 ELIGIBLE_ORDER_STATUSES_FOR_TICKET,
 SUPPORT_TICKET_COLLECTION,
 ACTIVE_TICKET_STATUSES,
 SUPPORT_TICKET_FIELDS,
 TicketCategoryValues,
 TicketStatusValues,
 TicketPriorityValues,
} from "./features/support/schemas/firestore";
// Support tickets â€" seed data
// S-STORE foundation seed data
// SB-UNI-B â€" sublistingCategoriesRepository + SublistingCategoryDocument deleted.
// Use categoriesRepository.findBySlugAndType(slug, "sublisting") and CategoryDocument with categoryType:"sublisting".
// [DB]-Database layer â€" uses firebase-admin; server-only.
/*
 * AdminIntegrationsView (12b) — /admin/integrations.
 *
 * The caller `INTEGRATIONS` / `integrationPatch` / `allIntegrationsPatch` were
 * missing: the model landed with every route guard resolving through it and
 * nothing in the UI reading it, which made those three exports speculative
 * infra. This is what reads them.
 */
export { AdminIntegrationsView } from "./features/admin/components/AdminIntegrationsView";
export type { AdminIntegrationsViewProps } from "./features/admin/components/AdminIntegrationsView";
// AdminTaxCodesView / AdminTaxCodeEditorView (B3) — /admin/tax-codes.
export { AdminTaxCodesView } from "./features/admin/components/AdminTaxCodesView";
export type { AdminTaxCodesViewProps } from "./features/admin/components/AdminTaxCodesView";
export { AdminTaxCodeEditorView } from "./features/admin/components/AdminTaxCodeEditorView";
export type { AdminTaxCodeEditorViewProps } from "./features/admin/components/AdminTaxCodeEditorView";
// productFeaturesRepository - Server-only repository for productFeatures (FI1).
export { productFeaturesRepository } from "./features/products/repository/product-features.repository";
export type { ProductFeatureListFilter } from "./features/products/repository/product-features.repository";
// loadProductFeaturesForStore - SSR helper combining listPlatform + listForStore (FI6).
export { loadProductFeaturesForStore } from "./features/products/repository/loadProductFeatures";
// taxCodesRepository - Server-only repository for taxCodes (B3). An HSN code and
// its GST rate as an ENTITY, so a rate change is one edit rather than ~330.
export { taxCodesRepository } from "./features/tax-codes/repository/tax-codes.repository";
// productTemplateRepository - Server-only repository for store product templates.
export { productTemplateRepository } from "./features/products/repository/product-templates.repository";
export type {
  ProductTemplateDocument,
  ProductTemplateCreateInput,
  ProductTemplateUpdateInput,
} from "./repositories/index";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// tokenRepository - Shared export for token repository.
export { tokenRepository } from "./features/auth/repository/token.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// userRepository - Shared export for user repository.
export { userRepository } from "./features/auth/repository/user.repository";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// wishlistRepository - Shared export for wishlist repository.
export { wishlistRepository } from "./features/wishlist/repository/user-wishlist.repository";
// [DB]-Database layer — mediaAssetsRepository for SEO-friendly /media/{shortId} URL mapping.
export { MediaAssetsRepository, mediaAssetsRepository } from "./features/media/repository/media-assets.repository";
export type { MediaAssetDocument, MediaAssetCreateInput } from "./features/media/repository/media-assets.repository";
export { GroupedListingsRepository, groupedListingsRepository } from "./features/grouped/repository/grouped-listings.repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NewsletterListModel - Type contract for newsletter list model.
export type { NewsletterListModel } from "./core/newsletter.repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WishlistItem - Type contract for wishlist item.
export type { UserWishlistItem as WishlistItem } from "./features/wishlist/repository/user-wishlist.repository";

// ./seed/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ADDRESS_FIXTURES - Constant used across modules.
/*
 * Seed provenance. Exported from the MAIN barrel because `appkit-seed` (a plain
 * .mjs script) imports it from there, and because `BaseDocument.seedPurpose`
 * means every consumer document type references the union.
 */

// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// BID_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// CART_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// COUPON_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// DEFAULT_CATEGORIES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// DEFAULT_FAQS - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// NOTIFICATION_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// PAYOUT_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// PRODUCT_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// SESSION_COLLECTION - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// SESSION_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// STORE_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// USER_FIXTURES - Constant used across modules.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// addressesSeedData - Model for addresses seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// assertPiiRoundTrip - Shared export for assert pii round trip.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// bidsSeedData - Model for bids seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// blogPostsSeedData - Model for blog posts seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselSlidesSeedData - Model for carousel slides seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselsSeedData - Seed data for named carousels (EX2).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// cartsSeedData - Model for carts seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// SB-UNI-C â€" brandsSeedData merged into categoriesSeedData with categoryType:"brand".
// categoriesSeedData - Model for categories seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// couponsSeedData - Model for coupons seed data.
// couponUsageSeedData - Per-user coupon redemption records (subcollection seed).
// claimedCouponsSeedData - Plan §10 wallet seed (active/expired/used rows).
// demoSeed has been moved to "@mohasinac/appkit/server" â€" it transitively
// reaches firebase-admin via the seed runner, which must not leak into client
// bundles. Import from `@mohasinac/appkit/server` in server-only code.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// eventEntriesSeedData - Model for event entries seed data.
// lotteryEntriesSeedData already exported above via LOTTERY_ENTRIES_COLLECTION block.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// eventsSeedData - Model for events seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// faqSeedData - Model for faq seed data.
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// testerChecklistSeedData - Model for tester checklist seed data.
// testerResponsesSeedData - Seeded tester submissions behind the bug-hunter demo fixtures.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// formatSeedPrice - Helper for format seed price.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSeedLocale - Helper for get seed locale.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// homepageSectionsSeedData - Model for homepage sections seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeAddress - Shared export for make address.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeBid - Shared export for make bid.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeBlogPost - Shared export for make blog post.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCarouselSlide - Shared export for make carousel slide.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCart - Shared export for make cart.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCartItem - Model for make cart item.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCategory - Shared export for make category.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeCoupon - Shared export for make coupon.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFaq - Shared export for make faq.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullAddress - Shared export for make full address.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullCart - Shared export for make full cart.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullCoupon - Shared export for make full coupon.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullNotification - Shared export for make full notification.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullPayout - Shared export for make full payout.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullProduct - Shared export for make full product.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullStore - Shared export for make full store.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeFullUser - Shared export for make full user.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeNotification - Shared export for make notification.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeOrder - Shared export for make order.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makePayout - Shared export for make payout.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeProduct - Shared export for make product.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeReview - Shared export for make review.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeRevokedSession - Shared export for make revoked session.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeSeedPhone - Shared export for make seed phone.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeSession - Shared export for make session.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeStore - Shared export for make store.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeUser - Shared export for make user.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeWinningBid - Shared export for make winning bid.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// notificationsSeedData - Model for notifications seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ordersSeedData - Model for orders seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// payoutsSeedData - Model for payouts seed data.
// shipmentsSeedData / shipmentLotsSeedData / shipmentItemsSeedData - procurement shipments seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productsStandardSeedData - Seed data for standard (buy-now) product listings.
// productsBeybladeXSeedData - Real, wiki-verified Beyblade X listings under store-letitrip-official (4 tops, 1 stadium, 1 Product Group of 7).
// 1,173-node taxonomy has a catalogue in it (967 of 968 leaves were empty).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productsCollectorDropsSeedData - Seed data for collector drop product listings.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productsPreordersSeedData - Seed data for pre-order product listings.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productsRandomLotsSeedData - Seed data for random-lots product listings (SB5-E).
// productsClassifiedsSeedData - Seed data for classified product listings (SB-UNI-I).
// productsDigitalCodesSeedData - Seed data for digital-code product listings (SB-UNI-J).
// productsLiveItemsSeedData - Seed data for live-item product listings (SB-UNI-K).
// productsArtSeedData - Seed data for art product listings (EMI/art-stickers session).
// productsStickersSeedData - Seed data for stickers product listings (EMI/art-stickers session).
/*
 * productsSparesSeedData — loose components off disassembled items.
 *
 * 🛑 This OUTER barrel export is load-bearing and is the one most likely to be
 * skipped: `seed-cli.mjs` imports the BARE `@mohasinac/appkit` package, so it
 * resolves through here and NOT through `seed/index.ts`. Export from the inner
 * barrel only and the symbol exists, TypeScript is happy, and the loader still
 * prints `spares — no seed data, skipping` and exits 0 (Root Cause #90).
 */
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// registerSeedLocale - Helper for register seed locale.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewsSeedData - Model for reviews seed data.
// runSeed has been moved to "@mohasinac/appkit/server" â€" see demoSeed above.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// seedForTest - Shared export for seed for test.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sessionsSeedData - Model for sessions seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// siteSettingsSeedData - Model for site settings seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeAddressesSeedData - Model for store addresses seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storesSeedData - Model for stores seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// usersSeedData - Model for users seed data.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// wishlistsSeedData - Model for wishlists seed data.
// historySeedData - Model for history (recently-viewed) seed data.
// SB-UNI-B â€" sublistingCategoriesSeedData merged into categoriesSeedData with categoryType:"sublisting".
// groupedListingsSeedData - Model for grouped listings seed data.
// mediaAssetsSeedData — the mediaAssets rows backing /media/<shortId> cover
// images. Exported from seed/index.ts but missing here until 2026-10-14,
// which is exactly Root Cause #18's shape: seed-cli.mjs imports the bare
// "@mohasinac/appkit" package, which resolves through THIS file, not through
// seed/index.ts directly — so an export present only on the inner barrel is
// invisible to the CLI and silently "no seed data, skipping".
// productsCatalogueSeedData — the 972 generated per-taxonomy-leaf listings.
// Same Root Cause #18 shape as mediaAssetsSeedData above: seed-cli.mjs imports
// the bare "@mohasinac/appkit" package, which resolves through THIS file.
// Franchise — the IP a product is FROM (brand is who MADE it). Re-exported
// from the outer barrel because seed-cli.mjs imports the bare package.
// SB-UNI-V â€" bundlesSeedData merged into categoriesSeedData with categoryType:"bundle".
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponDiscountType - Type contract for coupon discount type.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirestoreIndexConfig - Type contract for firestore index config.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationType - Type contract for notification type.
export type { NotificationType, NotificationRelatedType } from "./features/admin/schemas/firestore";
export { NOTIFICATION_TYPE_VALUES, NOTIFICATION_RELATED_TYPE_VALUES } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutStatus - Type contract for payout status.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedAddressDocument - Type contract for seed address document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBaseOrderDocument - Type contract for seed base order document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBaseOrderItem - Type contract for seed base order item.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBaseProductDocument - Type contract for seed base product document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBaseStoreDocument - Type contract for seed base store document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBaseUserDocument - Type contract for seed base user document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBidDocument - Type contract for seed bid document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedBlogPostDocument - Type contract for seed blog post document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCarouselSlideDocument - Type contract for seed carousel slide document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCartDocument - Type contract for seed cart document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCartItemDocument - Type contract for seed cart item document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCategoryDocument - Type contract for seed category document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCollection - Type contract for seed collection.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCollectionName - Type contract for seed collection name.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedConfig - Type contract for seed config.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedCouponDocument - Type contract for seed coupon document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedFaqDocument - Type contract for seed faq document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedLocaleData - Type contract for seed locale data.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedNotificationDocument - Type contract for seed notification document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedPayoutDocument - Type contract for seed payout document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedResult - Type contract for seed result.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedReviewDocument - Type contract for seed review document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SeedSessionDocument - Type contract for seed session document.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TestSeedHandles - Type contract for test seed handles.

// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// ErrorCategory - Shared export for error category.
export { ErrorCategory } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// ErrorSeverity - Shared export for error severity.
export { ErrorSeverity } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// addTraceAttribute - Helper for add trace attribute.
export { addTraceAttribute } from "./monitoring/performance";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// addTraceMetric - Helper for add trace metric.
export { addTraceMetric } from "./monitoring/performance";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// extractRequestMetadata - Shared export for extract request metadata.
export { extractRequestMetadata } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// getCacheHitRate - Helper for get cache hit rate.
export { getCacheHitRate } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// getCacheMetrics - Helper for get cache metrics.
export { getCacheMetrics } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// getCacheStatistics - Helper for get cache statistics.
export { getCacheStatistics } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// initializeClientLogger - Shared export for initialize client logger.
export { initializeClientLogger } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// isCacheHitRateLow - Shared export for is cache hit rate low.
export { isCacheHitRateLow } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logApiError - Helper for log api error.
export { logApiError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logApiRouteError - Helper for log api route error.
export { logApiRouteError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logApplicationError - Helper for log application error.
export { logApplicationError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logAuthError - Helper for log auth error.
export { logAuthError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logAuthorizationError - Helper for log authorization error.
export { logAuthorizationError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logClientDebug - Helper for log client debug.
export { logClientDebug } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logClientError - Helper for log client error.
export { logClientError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logClientInfo - Helper for log client info.
export { logClientInfo } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logClientWarning - Helper for log client warning.
export { logClientWarning } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logDatabaseError - Helper for log database error.
export { logDatabaseError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logEmailError - Helper for log email error.
export { logEmailError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logExternalApiError - Helper for log external api error.
export { logExternalApiError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logNavigationError - Helper for log navigation error.
export { logNavigationError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logPaymentError - Helper for log payment error.
export { logPaymentError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logSecurityEvent - Helper for log security event.
export { logSecurityEvent } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logServerAuthError - Helper for log server auth error.
export { logServerAuthError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logServerDebug - Helper for log server debug.
export { logServerDebug } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logServerError - Helper for log server error.
export { logServerError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logServerInfo - Helper for log server info.
export { logServerInfo } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logServerWarning - Helper for log server warning.
export { logServerWarning } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logSlowOperation - Helper for log slow operation.
export { logSlowOperation } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logStorageError - Helper for log storage error.
export { logStorageError } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logUploadError - Helper for log upload error.
export { logUploadError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// logValidationError - Helper for log validation error.
export { logValidationError } from "./monitoring/client-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// recordCacheHit - Shared export for record cache hit.
export { recordCacheHit } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// recordCacheMiss - Shared export for record cache miss.
export { recordCacheMiss } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// resetCacheMetrics - Shared export for reset cache metrics.
export { resetCacheMetrics } from "./monitoring/cache-metrics";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// serverLogger - Shared export for server logger.
export { serverLogger } from "./monitoring/server-logger";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// setErrorTracker - Helper for set error tracker.
export { setErrorTracker } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// setPerformanceProvider - Helper for set performance provider.
export { setPerformanceProvider } from "./monitoring/performance";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// setupCacheMonitoring - Shared export for setup cache monitoring.
export { setupCacheMonitoring } from "./monitoring/runtime";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// setupGlobalErrorHandler - Shared export for setup global error handler.
export { setupGlobalErrorHandler } from "./monitoring/runtime";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// startTrace - Helper for start trace.
export { startTrace } from "./monitoring/performance";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// stopTrace - Helper for stop trace.
export { stopTrace } from "./monitoring/performance";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// trackApiError - Helper for track api error.
export { trackApiError } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// trackAuthError - Helper for track auth error.
export { trackAuthError } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// trackDatabaseError - Helper for track database error.
export { trackDatabaseError } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// trackError - Helper for track error.
export { trackError } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// trackPermissionError - Helper for track permission error.
export { trackPermissionError } from "./monitoring/error-tracking";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// trackValidationError - Helper for track validation error.
export { trackValidationError } from "./monitoring/error-tracking";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ClientErrorContext - Type contract for client error context.
export type { ClientErrorContext } from "./monitoring/client-logger";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ErrorContext - Type contract for error context.
export type { ErrorContext } from "./monitoring/error-tracking";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ErrorTrackerFn - Type contract for error tracker fn.
export type { ErrorTrackerFn } from "./monitoring/error-tracking";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PerformanceProvider - Type contract for performance provider.
export type { PerformanceProvider } from "./monitoring/performance";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PerformanceTrace - Type contract for performance trace.
export type { PerformanceTrace } from "./monitoring/performance";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ServerErrorContext - Type contract for server error context.
export type { ServerErrorContext } from "./monitoring/server-logger";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrackedError - Type contract for tracked error.
export type { TrackedError } from "./monitoring/error-tracking";

// ./instrumentation/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createInstrumentation - Helper for create instrumentation.
export { createInstrumentation } from "./instrumentation/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// InstrumentationConfig - Type contract for instrumentation config.
export type { InstrumentationConfig } from "./instrumentation/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// InstrumentationHook - Type contract for instrumentation hook.
export type { InstrumentationHook } from "./instrumentation/index";

// ./http/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ApiClient - Shared export for api client.
export { ApiClient } from "./http/ApiClient";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ApiClientError - Model for api client error.
export { ApiClientError } from "./http/ApiClient";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// apiClient - Shared export for api client.
export { apiClient } from "./http/ApiClient";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiClientOptions - Type contract for api client options.
export type { ApiClientOptions } from "./http/ApiClient";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiResponse - Type contract for api response.
export type { ApiResponse } from "./http/ApiClient";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RequestConfig - Type contract for request config.
export type { RequestConfig } from "./http/ApiClient";

// ./next/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ApiErrors - Shared export for api errors.
export { ApiErrors } from "./next/api/api-response";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// DEFAULT_ROUTE_MAP - Constant used across modules.
export { DEFAULT_ROUTE_MAP } from "./next/routing/route-map";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ErrorView - Component for error view.
export { ErrorView } from "./next/components/ErrorView";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// GlobalError - Model for global error.
export { GlobalError } from "./next/components/GlobalError";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// NotFoundView - Component for not found view.
export { NotFoundView } from "./next/components/NotFoundView";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// UnauthorizedView - Component for unauthorized view.
export { UnauthorizedView } from "./next/components/UnauthorizedView";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildBaseContext - Helper for build base context.
export { buildBaseContext } from "./next/middleware/chain";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiErrorHandler - Helper for create api error handler.
export { createApiErrorHandler } from "./next/api/errorHandler";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiHandler - Helper for create api handler.
export { createRouteHandler as createApiHandler } from "./next/api/routeHandler";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiHandlerFactory - Helper for create api handler factory.
export { createApiHandlerFactory } from "./next/api/apiHandler";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createApiMiddleware - Helper for create api middleware.
export { createApiMiddleware } from "./next/middleware/chain";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createRouteHandler - Helper for create route handler.
export { createRouteHandler } from "./next/api/routeHandler";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createRouteMap - Helper for create route map.
export { createRouteMap } from "./next/routing/route-map";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// errorResponse - Model for error response.
export { errorResponse } from "./next/api/api-response";
// The one error-body shape, plus the Zod-issue narrower every route needs to
// put field errors on the wire under the key ApiClientError actually reads.
export {
  buildErrorEnvelope,
  toApiIssues,
  codeForStatus,
  type ApiErrorEnvelope,
} from "./errors/error-envelope";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getBooleanParam - Helper for get boolean param.
export { getBooleanParam } from "./next/request-helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getNumberParam - Helper for get number param.
export { getNumberParam } from "./next/request-helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getOptionalSessionCookie - Helper for get optional session cookie.
export { getOptionalSessionCookie } from "./next/request-helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getRequiredSessionCookie - Helper for get required session cookie.
export { getRequiredSessionCookie } from "./next/request-helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSearchParams - Helper for get search params.
export { getSearchParams } from "./next/request-helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStringParam - Helper for get string param.
export { getStringParam } from "./next/request-helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// invalidateCache - Shared export for invalidate cache.
export { invalidateCache } from "./next/cache-middleware";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// piiScrubberMiddleware - Shared export for pii scrubber middleware.
export { piiScrubberMiddleware } from "./next/middleware/pii-scrubber";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// runChain - Helper for run chain.
export { runChain } from "./next/middleware/chain";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// successResponse - Model for success response.
export { successResponse } from "./next/api/api-response";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// withCache - Shared export for with cache.
export { withCache } from "./next/cache-middleware";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiErrorHandlerOptions - Type contract for api error handler options.
export type { ApiErrorHandlerOptions } from "./next/api/errorHandler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiErrorResponse - Type contract for api error response.
export type { ApiErrorResponse } from "./next/api/api-response";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiHandlerFactoryDeps - Type contract for api handler factory deps.
export type { ApiHandlerFactoryDeps } from "./next/api/apiHandler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiHandlerOptions - Type contract for api handler options.
export type { ApiHandlerOptions } from "./next/api/apiHandler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiRateLimitResult - Type contract for api rate limit result.
export type { ApiRateLimitResult } from "./next/api/apiHandler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApiSuccessResponse - Type contract for api success response.
export type { ApiSuccessResponse } from "./next/api/api-response";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AuthRequestContext - Type contract for auth request context.
export type { AuthRequestContext } from "./next/middleware/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AuthVerifiedUser - Type contract for auth verified user.
export type { AuthVerifiedUser } from "./next/IAuthVerifier";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BaseRequestContext - Type contract for base request context.
export type { BaseRequestContext } from "./next/middleware/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CacheConfig - Type contract for cache config.
export type { CacheConfig } from "./next/cache-middleware";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateApiMiddlewareConfig - Type contract for create api middleware config.
export type { CreateApiMiddlewareConfig } from "./next/middleware/chain";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ErrorViewProps - Type contract for error view props.
export type { ErrorViewProps } from "./next/components/ErrorView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// GlobalErrorProps - Type contract for global error props.
export type { GlobalErrorProps } from "./next/components/GlobalError";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IApiErrorLogger - Type contract for iapi error logger.
export type { IApiErrorLogger } from "./next/api/errorHandler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IAuthVerifier - Type contract for iauth verifier.
export type { IAuthVerifier } from "./next/IAuthVerifier";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Middleware - Type contract for middleware.
export type { Middleware } from "./next/middleware/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotFoundViewProps - Type contract for not found view props.
export type { NotFoundViewProps } from "./next/components/NotFoundView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RouteMap - Type contract for route map.
export type { RouteMap } from "./next/routing/route-map";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RoutePath - Type contract for route path.
export type { RoutePath } from "./next/routing/route-map";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RouteUser - Type contract for route user.
export type { RouteUser } from "./next/api/routeHandler";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UnauthorizedViewProps - Type contract for unauthorized view props.
export type { UnauthorizedViewProps } from "./next/components/UnauthorizedView";

// ./style/tailwind/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// cn - Shared export for cn.
export { cn } from "./style/tailwind/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// tailwindAdapter - Shared export for tailwind adapter.
export { tailwindAdapter } from "./style/tailwind/index";

// ./style/vanilla/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// vanillaAdapter - Shared export for vanilla adapter.
export { vanillaAdapter } from "./style/vanilla/index";

// ./providers/auth-firebase/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createMiddlewareAuthChain - Helper for create middleware auth chain.
export { createMiddlewareAuthChain } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSessionCookie - Helper for create session cookie.
export { createSessionCookie } from "./providers/auth-firebase/index";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSessionCookieFromToken - Helper for create session cookie from token.
export { createSessionCookieFromToken } from "./providers/auth-firebase/session";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// firebaseAuthProvider - Component for firebase auth provider.
export { firebaseAuthProvider } from "./providers/auth-firebase/provider";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// firebaseSessionProvider - Component for firebase session provider.
export { firebaseSessionProvider } from "./providers/auth-firebase/session";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUserFromRequest - Helper for get user from request.
export { getUserFromRequest } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireAuthFromRequest - Model for require auth from request.
export { requireAuthFromRequest } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireAuthUser - Shared export for require auth user.
export { requireAuthUser } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireRoleFromRequest - Model for require role from request.
export { requireRoleFromRequest } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requireRoleUser - Shared export for require role user.
export { requireRoleUser } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// revokeUserTokens - Shared export for revoke user tokens.
export { revokeUserTokens } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyIdToken - Shared export for verify id token.
export { verifyIdToken } from "./providers/auth-firebase/helpers";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifySessionCookie - Shared export for verify session cookie.
export { verifySessionCookie } from "./providers/auth-firebase/helpers";

// ./providers/db-firebase/index
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// FirebaseRepository - Shared export for firebase repository.
export { FirebaseRepository } from "./providers/db-firebase/base";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// FirebaseSieveRepository - Shared export for firebase sieve repository.
export { FirebaseSieveRepository } from "./providers/db-firebase/index";
// [CONFIG]-Application configuration constant â€" route path, API endpoint, design token, or feature flag.
// RTDB_PATHS - Constant used across modules.
export { RTDB_PATHS } from "./providers/db-firebase/rtdb-paths";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// _resetAdminSingletons - Shared export for reset admin singletons.
export { _resetAdminSingletons } from "./providers/db-firebase/admin";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// applySieveToFirestore - Helper for apply sieve to firestore.
export { applySieveToFirestore } from "./providers/db-firebase/sieve";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildFirebaseClientConfig - Helper for build firebase client config.
export { buildFirebaseClientConfig } from "./providers/db-firebase/client-config";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// deserializeTimestamps - Shared export for deserialize timestamps.
export { deserializeTimestamps } from "./providers/db-firebase/helpers";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// firebaseDbProvider - Component for firebase db provider.
export { firebaseDbProvider } from "./providers/db-firebase/index";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// firebaseFieldOps - Shared export for firebase field ops.
export { firebaseFieldOps } from "./providers/db-firebase/field-ops";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// getAdminApp - Helper for get admin app.
export { getAdminApp } from "./providers/db-firebase/admin";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// getAdminAuth - Helper for get admin auth.
export { getAdminAuth } from "./providers/db-firebase/admin";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// getAdminDb - Helper for get admin db.
export { getAdminDb } from "./providers/db-firebase/admin";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// getAdminRealtimeDb - Helper for get admin realtime db.
export { getAdminRealtimeDb } from "./providers/db-firebase/admin";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// getAdminStorage - Helper for get admin storage.
export { getAdminStorage } from "./providers/db-firebase/admin";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// normalizeFirebaseConfigValue - Helper for normalize firebase config value.
export { normalizeFirebaseConfigValue } from "./providers/db-firebase/client-config";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// prepareForFirestore - Shared export for prepare for firestore.
export { prepareForFirestore } from "./providers/db-firebase/helpers";
// [UTIL]-Pure utility â€" no framework or runtime dependency; safe to import from any environment.
// removeUndefined - Helper for remove undefined.
export { removeUndefined } from "./providers/db-firebase/helpers";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DocumentSnapshot - Type contract for document snapshot.
export type { DocumentSnapshot } from "./providers/db-firebase/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirebaseClientConfig - Type contract for firebase client config.
export type { FirebaseClientConfig } from "./providers/db-firebase/client-config";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirebaseSieveFieldConfig - Type contract for firebase sieve field config.
export type { FirebaseSieveFieldConfig } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirebaseSieveFields - Type contract for firebase sieve fields.
export type { FirebaseSieveFields } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirebaseSieveOptions - Type contract for firebase sieve options.
export type { FirebaseSieveOptions } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirebaseSieveResult - Type contract for firebase sieve result.
export type { FirebaseSieveResult } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SieveFieldConfig - Type contract for sieve field config.
export type { SieveFieldConfig } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SieveFields - Type contract for sieve fields.
export type { SieveFields } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SieveModel - Type contract for sieve model.
export type { SieveModel } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SieveOptions - Type contract for sieve options.
export type { SieveOptions } from "./providers/db-firebase/sieve";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SieveResult - Type contract for sieve result.
export type { SieveResult } from "./providers/db-firebase/sieve";

// ./providers/email-resend/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createResendProvider - Helper for create resend provider.
export { createResendProvider } from "./providers/email-resend/provider";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ResendProviderOptions - Type contract for resend provider options.
export type { ResendProviderOptions } from "./providers/email-resend/provider";

// ./providers/firebase-client/index
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FirebaseClientAuthProvider - Component for firebase client auth provider.
export { FirebaseClientAuthProvider } from "./providers/firebase-client/auth";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// FirebaseClientRealtimeProvider - Component for firebase client realtime provider.
export { FirebaseClientRealtimeProvider } from "./providers/firebase-client/realtime";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FirebaseClientRealtimeConfig - Type contract for firebase client realtime config.
export type { FirebaseClientRealtimeConfig } from "./providers/firebase-client/realtime";

// ./providers/payment-phonepe/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// PhonePeProvider - Component for phonepe provider.
export { PhonePeProvider } from "./providers/payment-phonepe/index";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// paiseToRupees - Shared export for paise to rupees. // audit-money-units-ok: names the boundary conversion function itself
export { paiseToRupees } from "./core/money";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// rupeesToPaise - Shared export for rupees to paise. // audit-money-units-ok: names the boundary conversion function itself
export { rupeesToPaise } from "./core/money";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PhonePeConfig - Type contract for phonepe config.
export type { PhonePeConfig } from "./providers/payment-phonepe/index";

// ./providers/payment-razorpay/index
// [SERVER-ONLY]-Server-only — uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// RazorpayProvider - IPaymentProvider over Razorpay's client-side-modal gateway.
export { RazorpayProvider } from "./providers/payment-razorpay/index";
// [TYPE]-TypeScript type-only export — erased at compile time, zero runtime cost.
// RazorpayConfig - Type contract for razorpay config.
export type { RazorpayConfig } from "./providers/payment-razorpay/index";

// ./providers/payment-razorpay/signature
// [SERVER-ONLY]-Server-only — uses Node.js crypto. Deliberately SDK-free so importing it does not pull the razorpay package in.
// verifyRazorpayPaymentSignature - HMAC-SHA256 over `{order_id}|{payment_id}`; the cheap guard, never the authority.
export { verifyPaymentSignature as verifyRazorpayPaymentSignature } from "./providers/payment-razorpay/signature";
// [SERVER-ONLY]-Server-only — uses Node.js crypto.
// verifyRazorpayWebhookSignature - HMAC-SHA256 over the RAW webhook body.
export { verifyWebhookSignature as verifyRazorpayWebhookSignature } from "./providers/payment-razorpay/signature";
// [TYPE]-TypeScript type-only export — erased at compile time, zero runtime cost.
// RazorpayPaymentResult - the three fields Razorpay's checkout.js returns.
export type { RazorpayPaymentResult } from "./providers/payment-razorpay/signature";

// ./providers/payment-manual/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ManualPaymentProvider - the default IPaymentProvider implementation (no gateway).
export { ManualPaymentProvider } from "./providers/payment-manual/index";

// ./providers/shipping-manual/index
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// ManualShippingProvider - the default (and only) IShippingProvider implementation.
export { ManualShippingProvider } from "./providers/shipping-manual/index";

// ./providers/storage-firebase/client
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// STORAGE_PATHS - Constant used across modules.
export { STORAGE_PATHS } from "./providers/storage-firebase/client";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createStorageHelpers - Helper for create storage helpers.
export { createStorageHelpers } from "./providers/storage-firebase/client";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// validateFileSize - Helper for validate file size.
export { validateFileSize } from "./providers/storage-firebase/client";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// validateFileType - Helper for validate file type.
export { validateFileType } from "./providers/storage-firebase/client";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// validateImage - Helper for validate image.
export { validateImage } from "./providers/storage-firebase/client";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StorageHelpers - Type contract for storage helpers.
export type { StorageHelpers } from "./providers/storage-firebase/client";

// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQPageView - Component for faqpage view.
export { FAQPageView } from "./features/about/components/FAQPageView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FeesView - Component for fees view.
export { FeesView } from "./features/about/components/FeesView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HelpPageView - Component for help page view.
export { HelpPageView } from "./features/about/components/HelpPageView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowCollectorDropsWorkView - Component for how collector drops work view.
export { HowCollectorDropsWorkView } from "./features/about/components/HowCollectorDropsWorkView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowCheckoutWorksView - Component for how checkout works view.
export { HowCheckoutWorksView } from "./features/about/components/HowCheckoutWorksView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowEmiWorksView - Component for how EMI works view.
export { HowEmiWorksView } from "./features/about/components/HowEmiWorksView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowOffersWorkView - Component for how offers work view.
export { HowOffersWorkView } from "./features/about/components/HowOffersWorkView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowOrdersWorkView - Component for how orders work view.
export { HowOrdersWorkView } from "./features/about/components/HowOrdersWorkView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowPayoutsWorkView - Component for how payouts work view.
export { HowPayoutsWorkView } from "./features/about/components/HowPayoutsWorkView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowPreOrdersWorkView - Component for how pre orders work view.
export { HowPreOrdersWorkView } from "./features/about/components/HowPreOrdersWorkView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowReviewsWorkView - Component for how reviews work view.
export { HowReviewsWorkView } from "./features/about/components/HowReviewsWorkView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PolicyPageView - Component for policy page view.
export { PolicyPageView } from "./features/about/components/PolicyPageView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DeveloperView - Component for developer intro/portfolio view.
export { DeveloperView } from "./features/about/components/DeveloperView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PublicProfileView - Component for public profile view.
export { PublicProfileView } from "./features/about/components/PublicProfileView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SecurityPrivacyView - Component for security privacy view.
export { SecurityPrivacyView } from "./features/about/components/SecurityPrivacyView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ShippingPolicyView - Component for shipping policy view.
export { ShippingPolicyView } from "./features/about/components/ShippingPolicyView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TrackOrderView - Component for track order view.
export { TrackOrderView } from "./features/about/components/TrackOrderView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AboutHowItem - Type contract for about how item.
export type { AboutHowItem } from "./features/about/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AboutMilestone - Type contract for about milestone.
export type { AboutMilestone } from "./features/about/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AboutValueItem - Type contract for about value item.
export type { AboutValueItem } from "./features/about/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AboutTeamMember - Type contract for about team member.
export type { AboutTeamMember } from "./features/about/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AboutContentDocument - Firestore document shape for siteSettings.aboutContent.
export type { AboutContentDocument } from "./features/about/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQPageViewProps - Type contract for faqpage view props.
export type { FAQPageViewProps } from "./features/about/components/FAQPageView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeesViewProps - Type contract for fees view props.
export type { FeesViewProps } from "./features/about/components/FeesView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HelpPageViewProps - Type contract for help page view props.
export type { HelpPageViewProps } from "./features/about/components/HelpPageView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowCollectorDropsWorkViewProps - Type contract for how collector drops work view props.
export type { HowCollectorDropsWorkViewProps } from "./features/about/components/HowCollectorDropsWorkView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowCheckoutWorksViewProps - Type contract for how checkout works view props.
export type { HowCheckoutWorksViewProps } from "./features/about/components/HowCheckoutWorksView";
// HowEmiWorksViewProps - Type contract for how EMI works view props.
export type { HowEmiWorksViewProps } from "./features/about/components/HowEmiWorksView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowOffersWorkViewProps - Type contract for how offers work view props.
export type { HowOffersWorkViewProps } from "./features/about/components/HowOffersWorkView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowOrdersWorkViewProps - Type contract for how orders work view props.
export type { HowOrdersWorkViewProps } from "./features/about/components/HowOrdersWorkView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowPayoutsWorkViewProps - Type contract for how payouts work view props.
export type { HowPayoutsWorkViewProps } from "./features/about/components/HowPayoutsWorkView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowPreOrdersWorkViewProps - Type contract for how pre orders work view props.
export type { HowPreOrdersWorkViewProps } from "./features/about/components/HowPreOrdersWorkView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowReviewsWorkViewProps - Type contract for how reviews work view props.
export type { HowReviewsWorkViewProps } from "./features/about/components/HowReviewsWorkView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PolicyPageViewProps - Type contract for policy page view props.
export type { PolicyPageViewProps } from "./features/about/components/PolicyPageView";
export type { DeveloperViewProps } from "./features/about/components/DeveloperView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PublicProfileViewProps - Type contract for public profile view props.
export type { PublicProfileViewProps } from "./features/about/components/PublicProfileView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SecurityPrivacyViewProps - Type contract for security privacy view props.
export type { SecurityPrivacyViewProps } from "./features/about/components/SecurityPrivacyView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ShippingPolicyViewProps - Type contract for shipping policy view props.
export type { ShippingPolicyViewProps } from "./features/about/components/ShippingPolicyView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrackOrderViewProps - Type contract for track order view props.
export type { TrackOrderViewProps } from "./features/about/components/TrackOrderView";

// ./features/account/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ADDRESS_FIELDS - Constant used across modules.
export { ADDRESS_FIELDS } from "./features/addresses/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ADDRESS_INDEXED_FIELDS - Constant used across modules.
export { ADDRESS_INDEXED_FIELDS } from "./features/addresses/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ADDRESS_PUBLIC_FIELDS - Constant used across modules.
export { ADDRESS_PUBLIC_FIELDS } from "./features/addresses/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ADDRESS_SUBCOLLECTION - Constant used across modules.
export { ADDRESS_SUBCOLLECTION } from "./features/account/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ADDRESS_UPDATABLE_FIELDS - Constant used across modules.
export { ADDRESS_UPDATABLE_FIELDS } from "./features/addresses/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AddressBook - Shared export for address book.
export { AddressBook } from "./features/account/components/AddressBook";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AddressCard - Component for address card.
export { AddressCard } from "./features/account/components/AddressBook";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AddressForm - Component for address form.
export { AddressForm } from "./features/account/components/AddressForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AddressSelectorCreate - Shared export for address selector create.
export { AddressSelectorCreate } from "./features/account/components/AddressSelectorCreate";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BecomeSellerView - Component for become seller view.
export { BecomeSellerView } from "./features/account/components/BecomeSellerView";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_ADDRESS_DATA - Constant used across modules.
export { DEFAULT_ADDRESS_DATA } from "./features/addresses/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// NotificationBell - Shared export for notification bell.
export { NotificationBell } from "./features/account/components/NotificationBell";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OrderDetailView - Component for order detail view.
export { OrderDetailView } from "./features/account/components/OrderDetailView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProfileView - Component for profile view.
export { ProfileView } from "./features/account/components/ProfileView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// UserAccountHubView - Component for user account hub view.
export { UserAccountHubView } from "./features/account/components/UserAccountHubView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT]-Runs in browser only â€" interactive buyer offers panel with accept/withdraw actions.
// UserOffersPanel - Interactive buyer offers panel.
export { UserOffersPanel } from "./features/account/components/UserOffersPanel";
export type { UserOffersPanelProps } from "./features/account/components/UserOffersPanel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// UserOrderTrackView - Component for user order track view.
export { UserOrderTrackView } from "./features/account/components/UserOrderTrackView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// UserOrdersView - Component for user orders view.
export { UserOrdersView } from "./features/account/components/UserOrdersView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser — React component that lets users manage their notification channel and type preferences.
// NotificationPreferencesPanel - Panel for user notification preferences.
export { NotificationPreferencesPanel } from "./features/account/components/NotificationPreferencesPanel";
export type { NotificationPreferencesPanelProps } from "./features/account/components/NotificationPreferencesPanel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// accountAdminColumns - Shared export for account admin columns.
export { accountAdminColumns } from "./features/account/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildAccountColumns - Helper for build account columns.
export { buildAccountColumns } from "./features/account/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// manifest - Shared export for manifest.
export { manifest } from "./features/account/manifest";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// notificationPreferencesSchema - Model for notification preferences schema.
export { notificationPreferencesSchema } from "./features/account/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// updateProfileSchema - Helper for update profile schema.
export { updateProfileSchema } from "./features/account/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useAddress - React hook for use address.
export { useAddress } from "./features/account/hooks/useAddresses";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useAddressSelector - React hook for use address selector.
export { useAddressSelector } from "./features/account/hooks/useAddressSelector";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useAddresses - React hook for use addresses.
export { useAddresses } from "./features/account/hooks/useAddresses";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCreateAddress - React hook for use create address.
export { useCreateAddress } from "./features/account/hooks/useAddresses";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useDeleteAddress - React hook for use delete address.
export { useDeleteAddress } from "./features/account/hooks/useAddresses";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useNotifications - React hook for use notifications.
export { useNotifications } from "./features/account/hooks/useNotifications";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useProfile - React hook for use profile.
export { useCurrentProfile as useProfile } from "./features/account/hooks/useProfile";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useProfileStats - React hook for use profile stats.
export { useProfileStats } from "./features/account/hooks/useProfileStats";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePublicProfile - React hook for use public profile.
export { usePublicProfile } from "./features/account/hooks/usePublicProfile";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSetDefaultAddress - React hook for use set default address.
export { useSetDefaultAddress } from "./features/account/hooks/useAddresses";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useUpdateAddress - React hook for use update address.
export { useUpdateAddress } from "./features/account/hooks/useAddresses";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useUpdateProfile - React hook for use update profile.
export { useUpdateCurrentProfile as useUpdateProfile } from "./features/account/hooks/useProfile";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// userProfileSchema - Model for user profile schema.
export { userProfileSchema } from "./features/account/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Address - Type contract for address.
export type { Address } from "./features/account/hooks/useAddresses";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressCardAddress - Type contract for address card address.
export type { AddressCardAddress } from "./features/account/components/AddressBook";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressCardProps - Type contract for address card props.
export type { AddressCardProps } from "./features/account/components/AddressBook";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressCreateInput - Type contract for address create input.
export type { AddressCreateInput } from "./features/addresses/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressDocument - Type contract for address document.
export type { AddressDocument } from "./features/addresses/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressFormData - Type contract for address form data.
export type { AddressFormData } from "./features/account/hooks/useAddresses";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressFormLabels - Type contract for address form labels.
export type { AddressFormLabels } from "./features/account/components/AddressForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressSelectorCreateLabels - Type contract for address selector create labels.
export type { AddressSelectorCreateLabels } from "./features/account/components/AddressSelectorCreate";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressSelectorCreateProps - Type contract for address selector create props.
export type { AddressSelectorCreateProps } from "./features/account/components/AddressSelectorCreate";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddressUpdateInput - Type contract for address update input.
export type { AddressUpdateInput } from "./features/addresses/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BaseNotificationItem - Type contract for base notification item.
export type { BaseNotificationItem } from "./features/account/hooks/useNotifications";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BecomeSellerViewLabels - Type contract for become seller view labels.
export type { BecomeSellerViewLabels } from "./features/account/components/BecomeSellerView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BecomeSellerViewProps - Type contract for become seller view props.
export type { BecomeSellerViewProps } from "./features/account/components/BecomeSellerView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationBellLabels - Type contract for notification bell labels.
export type { NotificationBellLabels } from "./features/account/components/NotificationBell";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationBellProps - Type contract for notification bell props.
export type { NotificationBellProps } from "./features/account/components/NotificationBell";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationBellRenderLinkProps - Type contract for notification bell render link props.
export type { NotificationBellRenderLinkProps } from "./features/account/components/NotificationBell";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationPreferences - Type contract for notification preferences.
export type { NotificationPreferences } from "./features/account/types/index";
// NotificationChannelPrefs - Per-channel user-level notification toggles.
export type { NotificationChannelPrefs } from "./features/account/types/index";
// NotificationTypePrefs - Per-type user-level notification toggles.
export type { NotificationTypePrefs } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationsResponse - Type contract for notifications response.
export type { NotificationsResponse } from "./features/account/hooks/useNotifications";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OfferStatus - Type contract for offer status.
export type { OfferStatus } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderDetailViewLabels - Type contract for order detail view labels.
export type { OrderDetailViewLabels } from "./features/account/components/OrderDetailView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderDetailViewProps - Type contract for order detail view props.
export type { OrderDetailViewProps } from "./features/account/components/OrderDetailView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderItem - Type contract for order item.
export type { OrderItem } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderStatus - Type contract for order status.
export type { OrderStatus } from "./features/account/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentStatus - Type contract for payment status.
export type { PaymentStatus } from "./features/account/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductsApiResponse - Type contract for products api response.
export type { ProductsApiResponse } from "./features/account/hooks/usePublicProfile";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProfileStats - Type contract for profile stats.
export type { ProfileStats } from "./features/account/hooks/useProfileStats";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProfileViewLabels - Type contract for profile view labels.
export type { ProfileViewLabels } from "./features/account/components/ProfileView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProfileViewProps - Type contract for profile view props.
export type { ProfileViewProps } from "./features/account/components/ProfileView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PublicProfileOptions - Type contract for public profile options.
export type { PublicProfileOptions } from "./features/account/hooks/usePublicProfile";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PublicUserProfile - Type contract for public user profile.
export type { PublicUserProfile } from "./features/account/hooks/usePublicProfile";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerReviewItem - Type contract for seller review item.
export type { SellerReviewItem } from "./features/account/hooks/usePublicProfile";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerReviewsData - Type contract for seller reviews data.
export type { SellerReviewsData } from "./features/account/hooks/usePublicProfile";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateProfileInput - Type contract for update profile input.
export type { UpdateProfileInput } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseNotificationsOptions - Type contract for use notifications options.
export type { UseNotificationsOptions } from "./features/account/hooks/useNotifications";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserAccountHubViewLabels - Type contract for user account hub view labels.
export type { UserAccountHubViewLabels } from "./features/account/components/UserAccountHubView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserAccountHubViewProps - Type contract for user account hub view props.
export type { UserAccountHubViewProps } from "./features/account/components/UserAccountHubView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserAddress - Type contract for user address.
export type { UserAddress } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserAddressesViewLabels - Type contract for user addresses view labels.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserAddressesViewProps - Type contract for user addresses view props.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserNotificationsViewLabels - Type contract for user notifications view labels.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserNotificationsViewProps - Type contract for user notifications view props.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserOffer - Type contract for user offer.
export type { UserOffer } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserOrder - Type contract for user order.
export type { UserOrder } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserOrderTrackViewLabels - Type contract for user order track view labels.
export type { UserOrderTrackViewLabels } from "./features/account/components/UserOrderTrackView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserOrderTrackViewProps - Type contract for user order track view props.
export type { UserOrderTrackViewProps } from "./features/account/components/UserOrderTrackView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserOrdersViewProps - Type contract for user orders view props.
export type { UserOrdersViewProps } from "./features/account/components/UserOrdersView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserProfile - Type contract for user profile.
export type { UserProfile } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserProfileStats - Type contract for user profile stats.
export type { UserProfileStats } from "./features/account/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserSettingsViewLabels - Type contract for user settings view labels.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserSettingsViewProps - Type contract for user settings view props.

// ./features/account/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// AccountRepository - Shared export for account repository.
export { AccountRepository } from "./features/account/repository/account.repository";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createAddressForUser - Helper for create address for user.
export { createAddressForUser } from "./features/account/actions/address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteAddressForUser - Helper for delete address for user.
export { deleteAddressForUser } from "./features/account/actions/address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getAddressByIdForUser - Helper for get address by id for user.
export { getAddressByIdForUser } from "./features/account/actions/address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAddressesForUser - Helper for list addresses for user.
export { listAddressesForUser } from "./features/account/actions/address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// setDefaultAddressForUser - Helper for set default address for user.
export { setDefaultAddressForUser } from "./features/account/actions/address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateAddressForUser - Helper for update address for user.
export { updateAddressForUser } from "./features/account/actions/address-actions";

// ./features/admin/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ADMIN_PRODUCT_STATUS_OPTIONS - Constant used across modules.
export { ADMIN_PRODUCT_STATUS_OPTIONS } from "./features/admin/types/product.types";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminAnalyticsView - Component for admin analytics view.
export { AdminAnalyticsView } from "./features/admin/components/AdminAnalyticsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminAdsView - Component for admin ads inventory view.
export { AdminAdsView } from "./features/admin/components/AdminAdsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminAdEditorView - Component for admin ad create/edit view.
export { AdminAdEditorView } from "./features/admin/components/AdminAdEditorView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminBidsView - Component for admin bids view.
export { AdminBidsView } from "./features/admin/components/AdminBidsView";
// AdminOffersView - Component for admin offers view.
export { AdminOffersView } from "./features/admin/components/AdminOffersView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminBlogView - Component for admin blog view.
export { AdminBlogView } from "./features/admin/components/AdminBlogView";
// AdminBlogEditorView - Component for admin blog post create/edit form.
export { AdminBlogEditorView } from "./features/admin/components/AdminBlogEditorView";
export type { AdminBlogEditorViewProps } from "./features/admin/components/AdminBlogEditorView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminBrandsView - Component for admin brands management view.
export { AdminBrandsView } from "./features/admin/components/AdminBrandsView";
export type { AdminBrandsViewProps } from "./features/admin/components/AdminBrandsView";
// AdminBrandEditorView - Component for admin brand create/edit form.
export { AdminBrandEditorView } from "./features/admin/components/AdminBrandEditorView";
export type { AdminBrandEditorViewProps } from "./features/admin/components/AdminBrandEditorView";
// AdminAddressEditorView - Component for admin address create/edit form.
export { AdminAddressEditorView } from "./features/admin/components/AdminAddressEditorView";
export type { AdminAddressEditorViewProps } from "./features/admin/components/AdminAddressEditorView";
// AdminCategoriesView - Component for admin categories view.
export { AdminCategoriesView } from "./features/admin/components/AdminCategoriesView";
// AdminCategoryEditorView - Component for admin category create/edit form.
export { AdminCategoryEditorView } from "./features/admin/components/AdminCategoryEditorView";
export type { AdminCategoryEditorViewProps } from "./features/admin/components/AdminCategoryEditorView";
// S-SBUNI-4 2026-05-13 â€" admin bundle CRUD views.
export { AdminBundlesView } from "./features/admin/components/AdminBundlesView";
export type { AdminBundlesViewProps } from "./features/admin/components/AdminBundlesView";
export { AdminBundleEditorView } from "./features/admin/components/AdminBundleEditorView";
export type { AdminBundleEditorViewProps } from "./features/admin/components/AdminBundleEditorView";
// S-SBUNI-4 2026-05-13 â€" multi-select bundle items picker (centerpiece UI primitive).
export {
  BundleItemsPicker,
  defaultBundleItemsFetch,
} from "./features/categories/components/BundleItemsPicker";
export type {
  BundleItemsPickerProps,
  BundleItemSearchResult,
} from "./features/categories/components/BundleItemsPicker";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminCouponsView - Component for admin coupons view.
export { AdminCouponsView } from "./features/admin/components/AdminCouponsView";
// AdminCouponEditorView - Component for admin coupon create/edit form.
export { AdminCouponEditorView } from "./features/admin/components/AdminCouponEditorView";
export type { AdminCouponEditorViewProps } from "./features/admin/components/AdminCouponEditorView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminDashboardView - Component for admin dashboard view.
export { AdminDashboardView } from "./features/admin/components/AdminDashboardView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminFaqsView - Component for admin faqs view.
export { AdminFaqsView } from "./features/admin/components/AdminFaqsView";
// AdminFaqEditorView - Component for admin FAQ create/edit form.
export { AdminFaqEditorView } from "./features/admin/components/AdminFaqEditorView";
export type { AdminFaqEditorViewProps } from "./features/admin/components/AdminFaqEditorView";
// AdminTesterChecklistView - Component for the admin tester-checklist catalog list.
export { AdminTesterChecklistView } from "./features/admin/components/AdminTesterChecklistView";
export type { AdminTesterChecklistViewProps } from "./features/admin/components/AdminTesterChecklistView";
// AdminTesterChecklistItemEditorView - Component for admin tester-checklist item create/edit form.
export { AdminTesterChecklistItemEditorView } from "./features/admin/components/AdminTesterChecklistItemEditorView";
export type { AdminTesterChecklistItemEditorViewProps } from "./features/admin/components/AdminTesterChecklistItemEditorView";
// AdminTesterFeedbackView - Component for the admin Tester Feedback report/issues/submissions page.
export { AdminTesterFeedbackView } from "./features/tester/components/AdminTesterFeedbackView";
// AdminNavEditorView - SideDrawer form for nav item create/edit.
export { AdminNavEditorView } from "./features/admin/components/AdminNavEditorView";
export type { AdminNavEditorViewProps, NavItemData } from "./features/admin/components/AdminNavEditorView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminNewsletterView - Admin view for newsletter subscribers.
export { AdminNewsletterView } from "./features/admin/components/AdminNewsletterView";
// AdminContactView - Admin view for contact form submissions.
export { AdminContactView } from "./features/admin/components/AdminContactView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminFilterBar - Shared export for admin filter bar.
export { AdminFilterBar } from "./features/admin/components/AdminFilterBar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminMediaView - Component for admin media view.
export { AdminMediaView } from "./features/admin/components/AdminMediaView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminNavigationView - Component for admin navigation view.
export { AdminNavigationView } from "./features/admin/components/AdminNavigationView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminOrdersChart - Shared export for admin orders chart.
export { AdminOrdersChart } from "./features/admin/components/analytics/AdminAnalyticsCharts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminOrdersView - Component for admin orders view.
export { AdminOrdersView } from "./features/admin/components/AdminOrdersView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// QuickEditMenu - â‹® row action menu that opens QuickFormDrawer for inline quick-edit actions.
export { QuickEditMenu } from "./features/admin/components/QuickEditMenu";
export type { QuickEditAction, QuickEditMenuProps } from "./features/admin/components/QuickEditMenu";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminPageHeader - Shared export for admin page header.
export { AdminPageHeader } from "./features/admin/components/AdminPageHeader";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminPayoutsView - Component for admin payouts view.
export { AdminPayoutsView } from "./features/admin/components/AdminPayoutsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminAuditLogView - Read-only admin action audit trail list view.
export { AdminAuditLogView } from "./features/admin/components/AdminAuditLogView";
export type { AdminAuditLogViewProps } from "./features/admin/components/AdminAuditLogView";
// AdminMoneyCasesView - The payment-case operator queue (chargebacks, refunds owed, claims).
export { AdminMoneyCasesView } from "./features/admin/components/AdminMoneyCasesView";
export type { AdminMoneyCasesViewProps } from "./features/admin/components/AdminMoneyCasesView";
// AdminGatewayEventsView - The webhook inbox, with reopen-for-redelivery.
export { AdminGatewayEventsView } from "./features/admin/components/AdminGatewayEventsView";
export type { AdminGatewayEventsViewProps } from "./features/admin/components/AdminGatewayEventsView";
// ViewAuditLogEntryModal - Detail modal for one audit-log entry.
export { ViewAuditLogEntryModal } from "./features/admin/components/ViewAuditLogEntryModal";
export type { AuditLogEntryDetail, ViewAuditLogEntryModalProps } from "./features/admin/components/ViewAuditLogEntryModal";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminRandomLotsView - Component for admin random-lots listing view (SB4-E).
export { AdminRandomLotsView } from "./features/admin/components/AdminRandomLotsView";
// W1-29 2026-05-23 — admin listing views for orphaned listing types.
export { AdminClassifiedView } from "./features/admin/components/AdminClassifiedView";
export { AdminDigitalCodesView } from "./features/admin/components/AdminDigitalCodesView";
export { AdminLiveView } from "./features/admin/components/AdminLiveView";
// EMI/art-stickers session — admin listing views for art / stickers.
export { AdminArtView } from "./features/admin/components/AdminArtView";
export { AdminStickersView } from "./features/admin/components/AdminStickersView";
export { AdminSparesView } from "./features/admin/components/AdminSparesView";
export type { AdminRandomLotsViewProps } from "./features/admin/components/AdminRandomLotsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminProductsView - Component for admin products view.
export { AdminProductsView } from "./features/admin/components/AdminProductsView";
// AdminProductEditorView - Component for admin product create/edit form (3-mode: standard/collector drop/pre-order).
export { AdminProductEditorView } from "./features/admin/components/AdminProductEditorView";
export type { AdminProductEditorViewProps } from "./features/admin/components/AdminProductEditorView";
// CategoryQuickCreateForm - Lightweight inline create form for categories used in PaginatedSelect.
export { CategoryQuickCreateForm } from "./features/admin/components/CategoryQuickCreateForm";
export type { CategoryQuickCreateFormProps } from "./features/admin/components/CategoryQuickCreateForm";
// BrandQuickCreateForm - Lightweight inline create form for brands used in PaginatedSelect.
export { BrandQuickCreateForm } from "./features/admin/components/BrandQuickCreateForm";
export type { BrandQuickCreateFormProps } from "./features/admin/components/BrandQuickCreateForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminRevenueChart - Shared export for admin revenue chart.
export { AdminRevenueChart } from "./features/admin/components/analytics/AdminAnalyticsCharts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminReviewsView - Component for admin reviews view.
export { AdminReviewsView } from "./features/admin/components/AdminReviewsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminSectionsView - Component for admin sections view.
export { AdminSectionsView } from "./features/admin/components/AdminSectionsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminSessionsManager - Shared export for admin sessions manager.
export { AdminSessionsManager } from "./features/admin/components/AdminSessionsManager";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminSidebar - Shared export for admin sidebar.
export { AdminSidebar } from "./features/admin/components/AdminSidebar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminSublistingCategoriesView - Admin list view for sublisting categories (SC1).
export { AdminSublistingCategoriesView } from "./features/admin/components/AdminSublistingCategoriesView";
// AdminSublistingCategoryEditorView - Admin create/edit form for sublisting categories (SC1).
export { AdminSublistingCategoryEditorView } from "./features/admin/components/AdminSublistingCategoryEditorView";
export type { AdminSublistingCategoryEditorViewProps } from "./features/admin/components/AdminSublistingCategoryEditorView";
// AdminFeaturesView - Admin list view for productFeatures (FI3).
export { AdminFeaturesView } from "./features/admin/components/AdminFeaturesView";
export type { AdminFeaturesViewProps } from "./features/admin/components/AdminFeaturesView";
// AdminFeatureEditorView - Admin create/edit form for a single productFeature (FI3).
export { AdminFeatureEditorView } from "./features/admin/components/AdminFeatureEditorView";
export type { AdminFeatureEditorViewProps } from "./features/admin/components/AdminFeatureEditorView";
// AdminSiteSettingsView - 12-tab site settings form for admin (VA8).
export { AdminSiteSettingsView } from "./features/admin/components/AdminSiteSettingsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminStatCard - Component for admin stat card.
export { AdminStatCard } from "./features/admin/components/analytics/AdminStatCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminStoresView - Component for admin stores view.
export { AdminStoresView } from "./features/admin/components/AdminStoresView";
// AdminStoreEditorView - SideDrawer for approving/managing stores (VA12).
export { AdminStoreEditorView } from "./features/admin/components/AdminStoreEditorView";
// AdminUserEditorView - SideDrawer for role/ban management of users (B1/VA10).
export { AdminUserEditorView } from "./features/admin/components/AdminUserEditorView";
// AdminOrderEditorView - SideDrawer for order status/tracking/refund management (B2/VA9).
export { AdminOrderEditorView } from "./features/admin/components/AdminOrderEditorView";
// AdminSessionsView - Admin listing of user sessions with revoke action (LL11).
export { AdminSessionsView } from "./features/admin/components/AdminSessionsView";
// AdminAllEventEntriesView - Cross-event entries listing for admin (LL12).
export { AdminAllEventEntriesView } from "./features/admin/components/AdminAllEventEntriesView";
// AdminNotificationsView - Admin listing of platform notifications (LL13).
export { AdminNotificationsView } from "./features/admin/components/AdminNotificationsView";
// AdminCartsView - Admin read-only abandoned carts overview (LL14).
export { AdminCartsView } from "./features/admin/components/AdminCartsView";
// AdminWishlistsView - Admin read-only wishlist insights listing (LL15).
export { AdminWishlistsView } from "./features/admin/components/AdminWishlistsView";
// AdminHistoryView - Admin read-only history insights listing (S44 follow-up).
export { AdminHistoryView } from "./features/admin/components/AdminHistoryView";
// AdminGroupedListingsView - Admin cross-store grouped-listings moderation view (W1-29).
export { AdminGroupedListingsView } from "./features/admin/components/AdminGroupedListingsView";
export type { AdminGroupedListingsViewProps } from "./features/admin/components/AdminGroupedListingsView";
// AdminContactEditorView - Admin contact submission detail SideDrawer (B7/VA15).
export { AdminContactEditorView } from "./features/admin/components/AdminContactEditorView";
export type { AdminContactEditorViewProps } from "./features/admin/components/AdminContactEditorView";
// AdminReturnRequestsView - Admin return requests queue filtered to RETURN_REQUESTED (LL16).
export { AdminReturnRequestsView } from "./features/admin/components/AdminReturnRequestsView";
export type { AdminReturnRequestsViewProps } from "./features/admin/components/AdminReturnRequestsView";
// AdminStoreAddressesView - Admin read-only store pickup locations overview (LL17).
export { AdminStoreAddressesView } from "./features/admin/components/AdminStoreAddressesView";
export type { AdminStoreAddressesViewProps } from "./features/admin/components/AdminStoreAddressesView";
// AdminAddressesView - Address ban management (Banned / Unban Requested / Suspicious tabs).
export { AdminAddressesView } from "./features/admin/components/AdminAddressesView";
export type { AdminAddressesViewProps } from "./features/admin/components/AdminAddressesView";
// AdminAddressBookView - Address book lookup by owner (ADMIN.ADDRESSES).
export { AdminAddressBookView } from "./features/admin/components/AdminAddressBookView";
export type { AdminAddressBookViewProps } from "./features/admin/components/AdminAddressBookView";
// AdminAddressClustersView - Multi-account shared address cluster view.
export { AdminAddressClustersView } from "./features/admin/components/AdminAddressClustersView";
export type { AdminAddressClustersViewProps } from "./features/admin/components/AdminAddressClustersView";
// AdminPaymentMethodsView - Payment method ban management.
export { AdminPaymentMethodsView } from "./features/admin/components/AdminPaymentMethodsView";
export type { AdminPaymentMethodsViewProps } from "./features/admin/components/AdminPaymentMethodsView";
// AdminPaymentClustersView - Multi-account shared payment identifier cluster view.
export { AdminPaymentClustersView } from "./features/admin/components/AdminPaymentClustersView";
export type { AdminPaymentClustersViewProps } from "./features/admin/components/AdminPaymentClustersView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminTopBar - Shared export for admin top bar.
export { AdminTopBar } from "./features/admin/components/AdminTopBar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminTopProductsTable - Component for admin top products table.
export { AdminTopProductsTable } from "./features/admin/components/analytics/AdminTopProductsTable";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminUsersView - Component for admin users view.
export { AdminUsersView } from "./features/admin/components/AdminUsersView";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_NOTIFICATION_CHANNELS - Default channel config (inApp always on, others off).
export { DEFAULT_NOTIFICATION_CHANNELS } from "./features/admin/schemas/firestore";
// meetsMinPriority - Returns true when a priority meets or exceeds the minPriority threshold.
export { meetsMinPriority } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_NOTIFICATION_DATA - Constant used across modules.
export { DEFAULT_NOTIFICATION_DATA } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_SITE_SETTINGS_DATA - Constant used across modules.
export { DEFAULT_SITE_SETTINGS_DATA } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_TRUST_BAR_ITEMS - Constant used across modules.
export { DEFAULT_TRUST_BAR_ITEMS } from "./features/admin/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DashboardStatsGrid - Component for dashboard stats grid.
export { DashboardStatsGrid } from "./features/admin/components/DashboardStats";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminTeamView - Employee management list view.
export { AdminTeamView } from "./features/admin/components/AdminTeamView";
// AdminEmployeeEditorView - Invite/edit employee permissions SideDrawer.
export { AdminEmployeeEditorView } from "./features/admin/components/AdminEmployeeEditorView";
// PERMISSION_GROUPS - Preset employee-group -> Permission[] bundles (S-ADMIN-7).
export { PERMISSION_GROUPS } from "./features/auth/permissions/constants";
// PERMISSION_DOMAINS - Domain label/prefix groupings for the permissions catalog page.
export { PERMISSION_DOMAINS } from "./features/auth/permissions/constants";
// getPermissionsForDomain - Every distinct permission across PERMISSION_GROUPS matching a domain prefix.
export { getPermissionsForDomain } from "./features/auth/permissions/constants";
// formatPermLabel - "admin:orders:read" -> "Read" display formatting.
export { formatPermLabel } from "./features/auth/permissions/constants";
// AdminSupportTicketsView - Admin support ticket list view.
export { AdminSupportTicketsView } from "./features/admin/components/AdminSupportTicketsView";
// AdminSupportTicketDetailView - Admin support ticket detail/reply SideDrawer.
export { AdminSupportTicketDetailView } from "./features/admin/components/AdminSupportTicketDetailView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DrawerFormFooter - Shared export for drawer form footer.
export { DrawerFormFooter } from "./features/admin/components/DrawerFormFooter";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// NOTIFICATIONS_COLLECTION - Constant used across modules.
export { NOTIFICATIONS_COLLECTION } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// NOTIFICATIONS_INDEXED_FIELDS - Constant used across modules.
export { NOTIFICATIONS_INDEXED_FIELDS } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// NOTIFICATION_FIELDS - Constant used across modules.
export { NOTIFICATION_FIELDS } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// NOTIFICATION_PUBLIC_FIELDS - Constant used across modules.
export { NOTIFICATION_PUBLIC_FIELDS } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SITE_SETTINGS_COLLECTION - Constant used across modules.
export { SITE_SETTINGS_COLLECTION } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SITE_SETTINGS_INDEXED_FIELDS - Constant used across modules.
export { SITE_SETTINGS_INDEXED_FIELDS } from "./features/admin/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SITE_SETTINGS_PUBLIC_FIELDS - Constant used across modules.
export { SITE_SETTINGS_PUBLIC_FIELDS } from "./features/admin/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// notificationQueryHelpers - Shared export for notification query helpers.
export { notificationQueryHelpers } from "./features/admin/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useDashboardStats - React hook for use dashboard stats.
export { useDashboardStats } from "./features/admin/hooks/useAdmin";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useAdminListingData - React hook for admin listing data fetching.
export { useAdminListingData } from "./features/admin/hooks/useAdminListingData";
// [CLIENT-SSR]-Utility function for converting values to record array.
// toRecordArray - Helper for converting values to record array.
export { toRecordArray } from "./features/admin/hooks/useAdminListingData";
// [CLIENT-SSR]-Utility function for converting values to string with fallback.
// toStringValue - Helper for converting values to string.
export { toStringValue } from "./features/admin/hooks/useAdminListingData";
// [CLIENT-SSR]-Utility function for converting date values to relative date string.
// toRelativeDate - Helper for converting date to relative date string.
export { toRelativeDate } from "./features/admin/hooks/useAdminListingData";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminAnalyticsData - Type contract for admin analytics data.
export type { AdminAnalyticsData } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminAnalyticsViewLabels - Type contract for admin analytics view labels.
export type { AdminAnalyticsViewLabels } from "./features/admin/components/AdminAnalyticsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminAnalyticsViewProps - Type contract for admin analytics view props.
export type { AdminAnalyticsViewProps } from "./features/admin/components/AdminAnalyticsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminAdsViewProps - Type contract for admin ads inventory view props.
export type { AdminAdsViewProps } from "./features/admin/components/AdminAdsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminAdEditorViewProps - Type contract for admin ad editor view props.
export type { AdminAdEditorViewProps } from "./features/admin/components/AdminAdEditorView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminBidsViewProps - Type contract for admin bids view props.
export type { AdminBidsViewProps } from "./features/admin/components/AdminBidsView";
// AdminOffersViewProps - Type contract for admin offers view props.
export type { AdminOffersViewProps } from "./features/admin/components/AdminOffersView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminBlogViewProps - Type contract for admin blog view props.
export type { AdminBlogViewProps } from "./features/admin/components/AdminBlogView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminCategoriesViewProps - Type contract for admin categories view props.
export type { AdminCategoriesViewProps } from "./features/admin/components/AdminCategoriesView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminCouponsViewProps - Type contract for admin coupons view props.
export type { AdminCouponsViewProps } from "./features/admin/components/AdminCouponsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminDashboardViewProps - Type contract for admin dashboard view props.
export type { AdminDashboardViewProps } from "./features/admin/components/AdminDashboardView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminFaqsViewProps - Type contract for admin faqs view props.
export type { AdminFaqsViewProps } from "./features/admin/components/AdminFaqsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
export type { AdminNewsletterViewProps } from "./features/admin/components/AdminNewsletterView";
export type { AdminContactViewProps } from "./features/admin/components/AdminContactView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminFilterBarProps - Type contract for admin filter bar props.
export type { AdminFilterBarProps } from "./features/admin/components/AdminFilterBar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminListParams - Type contract for admin list params.
export type { AdminListParams } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminMediaViewProps - Type contract for admin media view props.
export type { AdminMediaViewProps } from "./features/admin/components/AdminMediaView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminNavigationViewProps - Type contract for admin navigation view props.
export type { AdminNavigationViewProps } from "./features/admin/components/AdminNavigationView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminOrdersChartProps - Type contract for admin orders chart props.
export type { AdminOrdersChartProps } from "./features/admin/components/analytics/AdminAnalyticsCharts";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminOrdersViewProps - Type contract for admin orders view props.
export type { AdminOrdersViewProps } from "./features/admin/components/AdminOrdersView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminPageHeaderProps - Type contract for admin page header props.
export type { AdminPageHeaderProps } from "./features/admin/components/AdminPageHeader";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminPayoutsViewProps - Type contract for admin payouts view props.
export type { AdminPayoutsViewProps } from "./features/admin/components/AdminPayoutsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminProduct - Type contract for admin product.
export type { AdminProduct } from "./features/admin/types/product.types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminProductDrawerMode - Type contract for admin product drawer mode.
export type { AdminProductDrawerMode } from "./features/admin/types/product.types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminProductStatus - Type contract for admin product status.
export type { AdminProductStatus } from "./features/admin/types/product.types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminProductsViewProps - Type contract for admin products view props.
export type { AdminProductsViewProps } from "./features/admin/components/AdminProductsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminRevenueChartProps - Type contract for admin revenue chart props.
export type { AdminRevenueChartProps } from "./features/admin/components/analytics/AdminAnalyticsCharts";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminReviewsViewProps - Type contract for admin reviews view props.
export type { AdminReviewsViewProps } from "./features/admin/components/AdminReviewsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminSectionsViewProps - Type contract for admin sections view props.
export type { AdminSectionsViewProps } from "./features/admin/components/AdminSectionsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminSessionsManagerProps - Type contract for admin sessions manager props.
export type { AdminSessionsManagerProps } from "./features/admin/components/AdminSessionsManager";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminSidebarProps - Type contract for admin sidebar props.
export type { AdminSidebarProps } from "./features/admin/components/AdminSidebar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminSiteSettingsViewProps - Type contract for admin site settings view props.
export type { AdminSiteSettingsViewProps } from "./features/admin/components/AdminSiteSettingsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminStatCardProps - Type contract for admin stat card props.
export type { AdminStatCardProps } from "./features/admin/components/analytics/AdminStatCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminStoresViewProps - Type contract for admin stores view props.
export type { AdminStoresViewProps } from "./features/admin/components/AdminStoresView";
// AdminStoreEditorViewProps - Type contract for admin store editor props.
export type { AdminStoreEditorViewProps } from "./features/admin/components/AdminStoreEditorView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminTableColumn - Type contract for admin table column.
export type { AdminTableColumn } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminTopBarProps - Type contract for admin top bar props.
export type { AdminTopBarProps } from "./features/admin/components/AdminTopBar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminTopProductsTableLabels - Type contract for admin top products table labels.
export type { AdminTopProductsTableLabels } from "./features/admin/components/analytics/AdminTopProductsTable";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminTopProductsTableProps - Type contract for admin top products table props.
export type { AdminTopProductsTableProps } from "./features/admin/components/analytics/AdminTopProductsTable";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminUsersViewProps - Type contract for admin users view props.
export type { AdminUsersViewProps } from "./features/admin/components/AdminUsersView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AnalyticsMonthEntry - Type contract for analytics month entry.
export type { AnalyticsMonthEntry } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AnalyticsSummary - Type contract for analytics summary.
export type { AnalyticsSummary } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AnalyticsTopProduct - Type contract for analytics top product.
export type { AnalyticsTopProduct } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DashboardStats - Type contract for dashboard stats.
export type { DashboardStats } from "./features/admin/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DemoSeedViewProps — removed from main barrel (dev-only)
// AdminTeamViewProps - Type contract for AdminTeamView props.
export type { AdminTeamViewProps } from "./features/admin/components/AdminTeamView";
// AdminEmployeeEditorViewProps - Type contract for AdminEmployeeEditorView props.
export type { AdminEmployeeEditorViewProps } from "./features/admin/components/AdminEmployeeEditorView";
// AdminSupportTicketsViewProps - Type contract for AdminSupportTicketsView props.
export type { AdminSupportTicketsViewProps } from "./features/admin/components/AdminSupportTicketsView";
// AdminSupportTicketDetailViewProps - Type contract for AdminSupportTicketDetailView props.
export type { AdminSupportTicketDetailViewProps } from "./features/admin/components/AdminSupportTicketDetailView";
// AdminScammersView - Admin scammer profile list view.
export { AdminScammersView } from "./features/admin/components/AdminScammersView";
// AdminScammerEditorView - Scammer profile review/status SideDrawer.
export { AdminScammerEditorView } from "./features/admin/components/AdminScammerEditorView";
// AdminScammersViewProps - Type contract for AdminScammersView props.
export type { AdminScammersViewProps } from "./features/admin/components/AdminScammersView";
// AdminScammerEditorViewProps - Type contract for AdminScammerEditorView props.
export type { AdminScammerEditorViewProps } from "./features/admin/components/AdminScammerEditorView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DrawerFormFooterProps - Type contract for drawer form footer props.
export type { DrawerFormFooterProps } from "./features/admin/components/DrawerFormFooter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeaturedResult - Type contract for featured result.
export type { FeaturedResult } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationChannelConfig - Channel configuration for in-app/email/WhatsApp/SMS.
export type { NotificationChannelConfig } from "./features/admin/schemas/firestore";
// NotificationCreateInput - Type contract for notification create input.
export type { NotificationCreateInput } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationDocument - Type contract for notification document.
export type { NotificationDocument } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationPriority - Type contract for notification priority.
export type { NotificationPriority } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NotificationUpdateInput - Type contract for notification update input.
export type { NotificationUpdateInput } from "./features/admin/schemas/firestore";
// SendNotificationInput - Input type for the multi-channel sendNotification dispatcher.
export type { SendNotificationInput } from "./features/admin/actions/notification-actions";
// SendNotificationResult - Result shape returned by sendNotification.
export type { SendNotificationResult } from "./features/admin/actions/notification-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SiteSettingsCredentials - Type contract for site settings credentials.
export type { SiteSettingsCredentials } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SiteSettingsCredentialsMasked - Type contract for site settings credentials masked.
export type { SiteSettingsCredentialsMasked } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SiteSettingsDocument - Type contract for site settings document.
export type { SiteSettingsDocument } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SiteSettingsUpdateInput - Type contract for site settings update input.
export type { SiteSettingsUpdateInput } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrustBarItem - Type contract for trust bar item.
export type { TrustBarItem } from "./features/admin/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.

// ./features/admin/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminBidsGET - Shared export for admin bids get.
export { GET as adminBidsGET } from "./features/admin/api/bids/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminCouponsGET - Shared export for admin coupons get.
export { GET as adminCouponsGET } from "./features/admin/api/coupons/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminCreateCoupon - Shared export for admin create coupon.
export { adminCreateCoupon } from "./features/admin/actions/admin-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminCreateProduct - Shared export for admin create product.
export { adminCreateProduct } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteCoupon - Shared export for admin delete coupon.
export { adminDeleteCoupon } from "./features/admin/actions/admin-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteProduct - Shared export for admin delete product.
export { adminDeleteProduct } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteUser - Shared export for admin delete user.
export { adminDeleteUser } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminProductsGET - Shared export for admin products get.
export { GET as adminProductsGET } from "./features/admin/api/products/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminReviewsGET - Shared export for admin reviews get.
export { GET as adminReviewsGET } from "./features/admin/api/reviews/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateCoupon - Shared export for admin update coupon.
export { adminUpdateCoupon } from "./features/admin/actions/admin-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateOrder - Shared export for admin update order.
export { adminUpdateOrder } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdatePayout - Shared export for admin update payout.
export { adminUpdatePayout } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateProduct - Shared export for admin update product.
export { adminUpdateProduct } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateStoreStatus - Model for admin update store status.
export { adminUpdateStoreStatus } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateUser - Shared export for admin update user.
export { adminUpdateUser } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteNotification - Helper for delete notification.
export { deleteNotification } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getAdminAnalytics - Helper for get admin analytics.
export { getAdminAnalytics } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getAdminDashboardStats - Helper for get admin dashboard stats.
export { getAdminDashboardStats } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSiteSettings - Helper for get site settings.
export { getSiteSettings } from "./features/admin/actions/site-settings-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUnreadNotificationCount - Helper for get unread notification count.
export { getUnreadNotificationCount } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminBids - Helper for list admin bids.
export { listAdminBids } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminBlog - Helper for list admin blog.
export { listAdminBlog } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminCoupons - Helper for list admin coupons.
export { listAdminCoupons } from "./features/admin/actions/admin-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminOrders - Helper for list admin orders.
export { listAdminOrders } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminPayouts - Helper for list admin payouts.
export { listAdminPayouts } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminProducts - Helper for list admin products.
export { listAdminProducts } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminSessions - Helper for list admin sessions.
export { listAdminSessions } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminStores - Helper for list admin stores.
export { listAdminStores } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminUsers - Helper for list admin users.
export { listAdminUsers } from "./features/admin/actions/admin-read-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listNotifications - Helper for list notifications.
export { listNotifications } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// markAllNotificationsRead - Shared export for mark all notifications read.
export { markAllNotificationsRead } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// markNotificationRead - Shared export for mark notification read.
export { markNotificationRead } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sendNotification - Multi-channel notification dispatcher (in-app + optional email/WhatsApp).
export { sendNotification } from "./features/admin/actions/notification-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// revokeSession - Shared export for revoke session.
export { revokeSession } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// revokeUserSessions - Shared export for revoke user sessions.
export { revokeUserSessions } from "./features/admin/actions/admin-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateSiteSettings - Helper for update site settings.
export { updateSiteSettings } from "./features/admin/actions/site-settings-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminActor - Type contract for admin actor.
export type { AdminActor } from "./features/admin/actions/admin-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.

// ./features/collector-drops/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BID_COLLECTION - Constant used across modules.
export { BID_COLLECTION } from "./features/collector-drops/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BID_INDEXED_FIELDS - Constant used across modules.
export { BID_INDEXED_FIELDS } from "./features/collector-drops/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BID_PUBLIC_FIELDS - Constant used across modules.
export { BID_PUBLIC_FIELDS } from "./features/collector-drops/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BID_UPDATABLE_FIELDS - Constant used across modules.
export { BID_UPDATABLE_FIELDS } from "./features/collector-drops/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BidStatusValues - Model for bid status values.
export { BidStatusValues } from "./features/collector-drops/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_BID_DATA - Constant used across modules.
export { DEFAULT_BID_DATA } from "./features/collector-drops/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CollectorDropBidsTable - Collapsible collectordrop-grouped bids table for buyer/store/admin portals.
export { CollectorDropBidsTable } from "./features/collector-drops/components/CollectorDropBidsTable";
export type { CollectorDropBidsTableProps, CollectorDropWithBids } from "./features/collector-drops/components/CollectorDropBidsTable";
// MarketplaceCollectorDropCard - Component for marketplace collector drop card.
export { MarketplaceCollectorDropCard } from "./features/collector-drops/components/MarketplaceCollectorDropCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MarketplaceCollectorDropGrid - Component for marketplace collector drop grid.
export { MarketplaceCollectorDropGrid } from "./features/collector-drops/components/MarketplaceCollectorDropGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectorDropAdminColumns - Shared export for collector drop admin columns.
export { collectorDropAdminColumns } from "./features/collector-drops/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectorDropItemSchema - Model for collector drop item schema.
export { collectorDropItemSchema } from "./features/collector-drops/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectorDropListParamsSchema - Model for collector drop list params schema.
export { collectorDropListParamsSchema } from "./features/collector-drops/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectorDropStatusSchema - Model for collector drop status schema.
export { collectorDropStatusSchema } from "./features/collector-drops/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// bidAdminColumns - Shared export for bid admin columns.
export { bidAdminColumns } from "./features/collector-drops/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// bidQueryHelpers - Shared export for bid query helpers.
export { bidQueryHelpers } from "./features/collector-drops/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// bidRecordSchema - Model for bid record schema.
export { bidRecordSchema } from "./features/collector-drops/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCollectorDropColumns - Helper for build collector drop columns.
export { buildCollectorDropColumns } from "./features/collector-drops/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildBidColumns - Helper for build bid columns.
export { buildBidColumns } from "./features/collector-drops/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createBidId - Helper for create bid id.
export { createBidId } from "./features/collector-drops/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCollectorDrop - React hook for use collector drop.
export { useCollectorDrop } from "./features/collector-drops/hooks/useCollectorDrops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCollectorDropBids - React hook for use collector drop bids.
export { useCollectorDropBids } from "./features/collector-drops/hooks/useCollectorDrops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCollectorDropDetail - React hook for use collector drop detail.
export { useCollectorDropDetail } from "./features/collector-drops/hooks/useCollectorDrops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCollectorDrops - React hook for use collector drops.
export { useCollectorDrops } from "./features/collector-drops/hooks/useCollectorDrops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePlaceBid - React hook for use place bid.
export { usePlaceBid } from "./features/collector-drops/hooks/usePlaceBid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useRealtimeBids - React hook for use realtime bids.
export { useRealtimeBids } from "./features/collector-drops/hooks/useRealtimeBids";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectorDropItem - Type contract for collector drop item.
export type { CollectorDropItem } from "./features/collector-drops/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectorDropListParams - Type contract for collector drop list params.
export type { CollectorDropListParams } from "./features/collector-drops/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectorDropListResponse - Type contract for collector drop list response.
export type { CollectorDropListResponse } from "./features/collector-drops/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidAdminUpdateInput - Type contract for bid admin update input.
export type { BidAdminUpdateInput } from "./features/collector-drops/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidCreateInput - Type contract for bid create input.
export type { BidCreateInput } from "./features/collector-drops/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidDocument - Type contract for bid document.
export type { BidDocument } from "./features/collector-drops/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidListResponse - Type contract for bid list response.
export type { BidListResponse } from "./features/collector-drops/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidRecord - Type contract for bid record.
export type { BidRecord } from "./features/collector-drops/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidResult - Type contract for bid result.
export type { BidResult } from "./features/collector-drops/hooks/usePlaceBid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidStatus - Type contract for bid status.
export type { BidStatus } from "./features/collector-drops/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidUpdateInput - Type contract for bid update input.
export type { BidUpdateInput } from "./features/collector-drops/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplaceCollectorDropCardData - Type contract for marketplace collector drop card data.
export type { MarketplaceCollectorDropCardData } from "./features/collector-drops/components/MarketplaceCollectorDropCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplaceCollectorDropCardLabels - Type contract for marketplace collector drop card labels.
export type { MarketplaceCollectorDropCardLabels } from "./features/collector-drops/components/MarketplaceCollectorDropCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplaceCollectorDropCardProps - Type contract for marketplace collector drop card props.
export type { MarketplaceCollectorDropCardProps } from "./features/collector-drops/components/MarketplaceCollectorDropCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplaceCollectorDropGridLabels - Type contract for marketplace collector drop grid labels.
export type { MarketplaceCollectorDropGridLabels } from "./features/collector-drops/components/MarketplaceCollectorDropGrid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplaceCollectorDropGridProps - Type contract for marketplace collector drop grid props.
export type { MarketplaceCollectorDropGridProps } from "./features/collector-drops/components/MarketplaceCollectorDropGrid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PlaceBidPayload - Type contract for place bid payload.
export type { PlaceBidPayload } from "./features/collector-drops/hooks/usePlaceBid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PublicBid - Type contract for public bid.
export type { PublicBid } from "./features/collector-drops/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RealtimeBidData - Type contract for realtime bid data.
export type { RealtimeBidData } from "./features/collector-drops/hooks/useRealtimeBids";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseRealtimeBidsReturn - Type contract for use realtime bids return.
export type { UseRealtimeBidsReturn } from "./features/collector-drops/hooks/useRealtimeBids";

// ./features/collector-drops/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// GET - Constant used across modules.
export { GET } from "./features/collector-drops/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// bidsGET - Shared export for bids get.
export { GET as bidsGET } from "./features/collector-drops/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getBidById - Helper for get bid by id.
export { getBidById } from "./features/collector-drops/actions/bid-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBidsByProduct - Helper for list bids by product.
export { listBidsByProduct } from "./features/collector-drops/actions/bid-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// placeBid / buyNowCollectorDrop - Shared export for bid + buy-now actions.
export { placeBid, buyNowCollectorDrop } from "./features/collector-drops/actions/bid-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PlaceBidInput / BuyNowCollectorDropInput - Type contracts for bid + buy-now input.
export type { PlaceBidInput, BuyNowCollectorDropInput, BuyNowCollectorDropResult } from "./features/collector-drops/actions/bid-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PlaceBidResult - Type contract for place bid result.
export type { PlaceBidResult } from "./features/collector-drops/actions/bid-actions";

// ./features/auth/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// CHECKOUT_VALUE_OTP_VERIFY_RATE_LIMIT - Constant used across modules.
export { CHECKOUT_VALUE_OTP_VERIFY_RATE_LIMIT } from "./features/auth/checkout-value-otp";
// [SERVER-ONLY] Tier PP — high-value checkout OTP gate. "use server" actions
// belong in both index.ts and server.ts per the appkit Export Rules table;
// these were only in server.ts, leaving src/actions/checkout.actions.ts's
// `import { sendCheckoutValueOtp, verifyCheckoutValueOtp } from "@mohasinac/appkit"`
// unresolved.
export {
  sendCheckoutValueOtp,
  verifyCheckoutValueOtp,
} from "./features/checkout/server";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// authMeGET - Shared export for auth me get.
export { authMeGET } from "./features/auth/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createPasswordResetToken - Helper for create password reset token.
export { createPasswordResetToken } from "./features/auth/token-store";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createVerificationToken - Helper for create verification token.
export { createVerificationToken } from "./features/auth/token-store";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteToken - Helper for delete token.
export { deleteToken } from "./features/auth/token-store";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// generateToken - Helper for generate token.
export { generateToken } from "./features/auth/token-store";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getPublicUserProfile - Helper for get public user profile.
export { getPublicUserProfile } from "./features/auth/actions/profile-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getProfileStoreProducts - Helper for get store products for public profile view.
export { getProfileStoreProducts } from "./features/auth/actions/profile-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerReviews - Helper for get seller reviews.
export { getSellerReviews } from "./features/auth/actions/profile-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUserProfile - Helper for get user profile.
export { getUserProfile } from "./features/auth/actions/profile-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getUserSessions - Helper for get user sessions.
export { getUserSessions } from "./features/auth/actions/profile-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// markPasswordResetTokenAsUsed - Shared export for mark password reset token as used.
export { markPasswordResetTokenAsUsed } from "./features/auth/token-store";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateUserProfile - Helper for update user profile.
export { updateUserProfile } from "./features/auth/actions/profile-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyEmailToken - Shared export for verify email token.
export { verifyEmailToken } from "./features/auth/token-store";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// verifyPasswordResetToken - Shared export for verify password reset token.
export { verifyPasswordResetToken } from "./features/auth/token-store";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PasswordResetTokenData - Type contract for password reset token data.
export type { PasswordResetTokenData } from "./features/auth/token-store";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TokenData - Type contract for token data.
export type { TokenData } from "./features/auth/token-store";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TokenErrorMessages - Type contract for token error messages.
export type { TokenErrorMessages } from "./features/auth/token-store";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TokenServiceConfig - Type contract for token service config.
export type { TokenServiceConfig } from "./features/auth/token-store";

// ./features/auth/schemas/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_EMAIL_VERIFICATION_TOKEN_DATA - Constant used across modules.
export { DEFAULT_EMAIL_VERIFICATION_TOKEN_DATA } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_PASSWORD_RESET_TOKEN_DATA - Constant used across modules.
export { DEFAULT_PASSWORD_RESET_TOKEN_DATA } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_SESSION_DATA - Constant used across modules.
export { DEFAULT_SESSION_DATA } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_USER_DATA - Constant used across modules.
export { DEFAULT_USER_DATA } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EMAIL_VERIFICATION_COLLECTION - Constant used across modules.
export { EMAIL_VERIFICATION_COLLECTION } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PASSWORD_RESET_COLLECTION - Constant used across modules.
export { PASSWORD_RESET_COLLECTION } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SESSION_CLEANUP_AFTER_MS - Constant used across modules.
export { SESSION_CLEANUP_AFTER_MS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SESSION_EXPIRATION_MS - Constant used across modules.
export { SESSION_EXPIRATION_MS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SESSION_FIELDS - Constant used across modules.
export { SESSION_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SESSION_INDEXED_FIELDS - Constant used across modules.
export { SESSION_INDEXED_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SESSION_PUBLIC_FIELDS - Constant used across modules.
export { SESSION_PUBLIC_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SMS_COUNTERS_COLLECTION - Constant used across modules.
export { SMS_COUNTERS_COLLECTION } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SMS_COUNTER_FIELDS - Constant used across modules.
export { SMS_COUNTER_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// SMS_DAILY_LIMIT - Constant used across modules.
export { SMS_DAILY_LIMIT } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// TOKEN_FIELDS - Constant used across modules.
export { TOKEN_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// TOKEN_INDEXED_FIELDS - Constant used across modules.
export { TOKEN_INDEXED_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// TOKEN_PUBLIC_FIELDS - Constant used across modules.
export { TOKEN_PUBLIC_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// TOKEN_UPDATABLE_FIELDS - Constant used across modules.
export { TOKEN_UPDATABLE_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// USER_COLLECTION - Constant used across modules.
export { USER_COLLECTION } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// USER_FIELDS - Constant used across modules.
export { USER_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// USER_INDEXED_FIELDS - Constant used across modules.
export { USER_INDEXED_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// USER_PUBLIC_FIELDS - Constant used across modules.
export { USER_PUBLIC_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// USER_UPDATABLE_FIELDS - Constant used across modules.
export { USER_UPDATABLE_FIELDS } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// UserSchemaDefaults - Shared export for user schema defaults.
export { UserSchemaDefaults } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// authUserSchema - Model for auth user schema.
export { authUserSchema } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// forgotPasswordSchema - Model for forgot password schema.
export { forgotPasswordSchema } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// loginSchema - Model for login schema.
export { loginSchema } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// parseUserAgent - Helper for parse user agent.
export { parseUserAgent } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// registerSchema - Helper for register schema.
export { registerSchema } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// sessionQueryHelpers - Shared export for session query helpers.
export { sessionQueryHelpers } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// tokenQueryHelpers - Shared export for token query helpers.
export { tokenQueryHelpers } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// userQueryHelpers - Shared export for user query helpers.
export { userQueryHelpers } from "./features/auth/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// userRoleSchema - Model for user role schema.
export { userRoleSchema } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AvatarMetadata - Type contract for avatar metadata.
export type { AvatarMetadata } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EmailVerificationTokenCreateInput - Type contract for email verification token create input.
export type { EmailVerificationTokenCreateInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EmailVerificationTokenDocument - Type contract for email verification token document.
export type { EmailVerificationTokenDocument } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PasswordResetTokenCreateInput - Type contract for password reset token create input.
export type { PasswordResetTokenCreateInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PasswordResetTokenDocument - Type contract for password reset token document.
export type { PasswordResetTokenDocument } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerBankAccount - Type contract for seller bank account.
export type { SellerBankAccount } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutDetails - Type contract for seller payout details.
export type { SellerPayoutDetails } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutMethod - Type contract for seller payout method.
export type { SellerPayoutMethod } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPickupAddress - Type contract for seller pickup address.
export type { SellerPickupAddress } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerShippingConfig - Type contract for seller shipping config.
export type { SellerShippingConfig } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerShippingMethod - Type contract for seller shipping method.
export type { SellerShippingMethod } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SessionCreateInput - Type contract for session create input.
export type { SessionCreateInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SessionDocument - Type contract for session document.
export type { SessionDocument } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SessionRevokeInput - Type contract for session revoke input.
export type { SessionRevokeInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SessionUpdateInput - Type contract for session update input.
export type { SessionUpdateInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SmsCounterDocument - Type contract for sms counter document.
export type { SmsCounterDocument } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserAdminUpdateInput - Type contract for user admin update input.
export type { UserAdminUpdateInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserCreateInput - Type contract for user create input.
export type { UserCreateInput } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserDocument - Type contract for user document.
export type { UserDocument } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserQueryFilter - Type contract for user query filter.
export type { UserQueryFilter } from "./features/auth/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserUpdateInput - Type contract for user update input.
export type { UserUpdateInput } from "./features/auth/schemas/index";

// ./features/before-after/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BeforeAfterGallery - Shared export for before after gallery.
export { BeforeAfterGallery } from "./features/before-after/components/BeforeAfterGallery";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BeforeAfterSlider - Shared export for before after slider.
export { BeforeAfterSlider } from "./features/before-after/components/BeforeAfterSlider";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// beforeAfterAdminColumns - Shared export for before after admin columns.
export { beforeAfterAdminColumns } from "./features/before-after/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// beforeAfterItemSchema - Model for before after item schema.
export { beforeAfterItemSchema } from "./features/before-after/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildBeforeAfterColumns - Helper for build before after columns.
export { buildBeforeAfterColumns } from "./features/before-after/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBeforeAfter - React hook for use before after.
export { useBeforeAfter } from "./features/before-after/hooks/useBeforeAfter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BeforeAfterItem - Type contract for before after item.
export type { BeforeAfterItem } from "./features/before-after/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BeforeAfterListResponse - Type contract for before after list response.
export type { BeforeAfterListResponse } from "./features/before-after/types/index";

// ./features/blog/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BLOG_ADMIN_SORT_OPTIONS - Constant used across modules.
export { BLOG_ADMIN_SORT_OPTIONS } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BLOG_FILTER_KEYS - Constant used across modules.
export { BLOG_FILTER_KEYS } from "./features/blog/components/BlogFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BLOG_POSTS_COLLECTION - Constant used across modules.
export { BLOG_POSTS_COLLECTION } from "./features/blog/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BLOG_POSTS_INDEXED_FIELDS - Constant used across modules.
export { BLOG_POSTS_INDEXED_FIELDS } from "./features/blog/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BLOG_POST_FIELDS - Constant used across modules.
export { BLOG_POST_FIELDS } from "./features/blog/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BLOG_POST_PUBLIC_FIELDS - Constant used across modules.
export { BLOG_POST_PUBLIC_FIELDS } from "./features/blog/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BLOG_PUBLIC_SORT_OPTIONS - Constant used across modules.
export { BLOG_PUBLIC_SORT_OPTIONS } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BLOG_SELLER_SORT_OPTIONS - Constant used across modules.
export { BLOG_SELLER_SORT_OPTIONS } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BLOG_SORT_OPTIONS - Constant used across modules.
export { BLOG_SORT_OPTIONS } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogCard - Component for blog card.
export { BlogCard } from "./features/blog/components/BlogListView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogCategoryTabs - Component for blog category tabs.
export { BlogCategoryTabs } from "./features/blog/components/BlogListView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogFeaturedCard - Component for blog featured card.
export { BlogFeaturedCard } from "./features/blog/components/BlogFeaturedCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogFilters - Shared export for blog filters.
export { BlogFilters } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogIndexPageView - Component for blog index page view.
// BlogIndexListing - Client listing component with search/sort/filter/pagination.
export { BlogIndexListing } from "./features/blog/components/BlogIndexListing";
export type { BlogIndexListingProps } from "./features/blog/components/BlogIndexListing";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogListView - Component for blog list view.
export { BlogListView } from "./features/blog/components/BlogListView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogPostForm - Component for blog post form.
export { BlogPostForm } from "./features/blog/components/BlogPostForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogPostStatusValues - Model for blog post status values.
export { BlogPostStatusValues } from "./features/blog/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BlogPostView - Component for blog post view.
export { BlogPostView } from "./features/blog/components/BlogPostView";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_BLOG_POST_DATA - Constant used across modules.
export { DEFAULT_BLOG_POST_DATA } from "./features/blog/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogAdminColumns - Shared export for blog admin columns.
export { blogAdminColumns } from "./features/blog/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogListParamsSchema - Model for blog list params schema.
export { blogListParamsSchema } from "./features/blog/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogPostCategorySchema - Model for blog post category schema.
export { blogPostCategorySchema } from "./features/blog/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogPostQueryHelpers - Shared export for blog post query helpers.
export { blogPostQueryHelpers } from "./features/blog/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogPostSchema - Model for blog post schema.
export { blogPostSchema } from "./features/blog/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// blogPostStatusSchema - Model for blog post status schema.
export { blogPostStatusSchema } from "./features/blog/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildBlogColumns - Helper for build blog columns.
export { buildBlogColumns } from "./features/blog/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createBlogPostId - Helper for create blog post id.
export { createBlogPostId } from "./features/blog/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getBlogFilterKeys - Helper for get blog filter keys.
export { getBlogFilterKeys } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getBlogSortOptions - Helper for get blog sort options.
export { getBlogSortOptions } from "./features/blog/components/BlogFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBlogPost - React hook for use blog post.
export { useBlogPost } from "./features/blog/hooks/useBlog";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBlogPosts - React hook for use blog posts.
export { useBlogPosts } from "./features/blog/hooks/useBlog";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogFeaturedCardProps - Type contract for blog featured card props.
export type { BlogFeaturedCardProps } from "./features/blog/components/BlogFeaturedCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogFilterVariant - Type contract for blog filter variant.
export type { BlogFilterVariant } from "./features/blog/components/BlogFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogFiltersProps - Type contract for blog filters props.
export type { BlogFiltersProps } from "./features/blog/components/BlogFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogListMeta - Type contract for blog list meta.
export type { BlogListMeta } from "./features/blog/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogListParams - Type contract for blog list params.
export type { BlogListParams } from "./features/blog/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogListResponse - Type contract for blog list response.
export type { BlogListResponse } from "./features/blog/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPost - Type contract for blog post.
export type { BlogPost } from "./features/blog/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostCategory - Type contract for blog post category.
export type { BlogPostCategory } from "./features/blog/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostCreateInput - Type contract for blog post create input.
export type { BlogPostCreateInput } from "./features/blog/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostDocument - Type contract for blog post document.
export type { BlogPostDocument } from "./features/blog/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostFormLabels - Type contract for blog post form labels.
export type { BlogPostFormLabels } from "./features/blog/components/BlogPostForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostFormOption - Type contract for blog post form option.
export type { BlogPostFormOption } from "./features/blog/components/BlogPostForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostFormProps - Type contract for blog post form props.
export type { BlogPostFormProps } from "./features/blog/components/BlogPostForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostFormValue - Type contract for blog post form value.
export type { BlogPostFormValue } from "./features/blog/components/BlogPostForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostStatus - Type contract for blog post status.
export type { BlogPostStatus } from "./features/blog/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostUpdateInput - Type contract for blog post update input.
export type { BlogPostUpdateInput } from "./features/blog/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostViewProps - Type contract for blog post view props.
export type { BlogPostViewProps } from "./features/blog/components/BlogPostView";

// ./features/blog/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// blogGET - Shared export for blog get.
export { GET as blogGET } from "./features/blog/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// blogSlugGET - Shared export for blog slug get.
export { GET as blogSlugGET } from "./features/blog/api/[slug]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createBlogPost - Helper for create blog post.
export { createBlogPost } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createBlogPostSchema - Helper for create blog post schema.
export { createBlogPostSchema } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteBlogPost - Helper for delete blog post.
export { deleteBlogPost } from "./features/blog/actions/blog-actions";
// SB-UNI-C â€" getBrandBySlug deleted with features/brands/. Use
// categoriesRepository.findBySlugAndType(slug, "brand") instead.
// getBlogPostById - Helper for get blog post by id.
export { getBlogPostById } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getBlogPostBySlug - Helper for get blog post by slug.
export { getBlogPostBySlug } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedBlogPosts - Helper for get featured blog posts.
export { getFeaturedBlogPosts } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestBlogPosts - Helper for get latest blog posts.
export { getLatestBlogPosts } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBlogPosts - Helper for list blog posts.
export { listBlogPosts } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateBlogPost - Helper for update blog post.
export { updateBlogPost } from "./features/blog/actions/blog-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateBlogPostSchema - Helper for update blog post schema.
export { updateBlogPostSchema } from "./features/blog/actions/blog-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogPostDetailResponse - Type contract for blog post detail response.
export type { BlogPostDetailResponse } from "./features/blog/api/[slug]/route";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateBlogPostInput - Type contract for create blog post input.
export type { CreateBlogPostInput } from "./features/blog/actions/blog-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateBlogPostInput - Type contract for update blog post input.
export type { UpdateBlogPostInput } from "./features/blog/actions/blog-actions";

// ./features/cart/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// addItemToCart - Helper for add item to cart.
// assertCanAddNewItems - the lane gate every add-to-cart entry point must run.
// addGroupLineToCart - add a buyer-assembled group selection as ONE line.
export {
  addItemToCart,
  assertCanAddNewItems,
  addGroupLineToCart,
  updateCartGroupMembers,
  GROUP_LINE_MAX_MEMBERS,
  type AddGroupLineToCartInput,
} from "./features/cart/server";

// Public allow-list projection for a product-group member — see
// § "Public Data Projections".
export {
  toPublicGroupMember,
  toPublicGroupMembers,
  type PublicGroupMember,
} from "./_internal/server/features/products/group-members";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// clearCart - Shared export for clear cart.
export { clearCart } from "./features/cart/actions/cart-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCart - Helper for get cart.
export { getCart } from "./features/cart/actions/cart-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// mergeGuestCart - Helper for merge guest cart.
export { mergeGuestCart } from "./features/cart/actions/cart-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// removeCartItem - Helper for remove cart item.
export { removeCartItem } from "./features/cart/actions/cart-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateCartItem - Helper for update cart item.
export { updateCartItem } from "./features/cart/actions/cart-actions";
// [SERVER-ONLY]-Server-only â€" cart item shipping provider update.
export { updateCartItemShipping } from "./features/cart/actions/cart-actions";

// ./features/cart/schemas/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CART_COLLECTION - Constant used across modules.
export { CART_COLLECTION } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CART_FIELDS - Constant used across modules.
export { CART_FIELDS } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CART_INDEXED_FIELDS - Constant used across modules.
export { CART_INDEXED_FIELDS } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_CART_DATA - Constant used across modules.
export { DEFAULT_CART_DATA } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// cartItemMetaSchema - Model for cart item meta schema.
export { cartItemMetaSchema } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// cartItemSchema - Model for cart item schema.
export { cartItemSchema } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// cartQueryHelpers - Shared export for cart query helpers.
export { cartQueryHelpers } from "./features/cart/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// cartSummarySchema - Model for cart summary schema.
export { cartSummarySchema } from "./features/cart/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AddToCartInput - Type contract for add to cart input.
export type { AddToCartInput } from "./features/cart/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CartAppliedCoupon - Type contract for applied cart coupon.
export type { CartAppliedCoupon } from "./features/cart/schemas/index";
// CartCreateInput - Type contract for cart create input.
export type { CartCreateInput } from "./features/cart/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CartDocument - Type contract for cart document.
export type { CartDocument } from "./features/cart/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CartItemDocument - Type contract for cart item document.
export type { CartItemDocument } from "./features/cart/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateCartItemInput - Type contract for update cart item input.
export type { UpdateCartItemInput } from "./features/cart/schemas/index";

// ./features/categories/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BreadcrumbTrail - Shared export for breadcrumb trail.
export { BreadcrumbTrail } from "./features/categories/components/BreadcrumbTrail";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CATEGORIES_COLLECTION - Constant used across modules.
export { CATEGORIES_COLLECTION } from "./features/categories/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CATEGORIES_INDEXED_FIELDS - Constant used across modules.
export { CATEGORIES_INDEXED_FIELDS } from "./features/categories/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CATEGORIES_PUBLIC_FIELDS - Constant used across modules.
export { CATEGORIES_PUBLIC_FIELDS } from "./features/categories/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CATEGORIES_UPDATABLE_FIELDS - Constant used across modules.
export { CATEGORIES_UPDATABLE_FIELDS } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CATEGORY_ADMIN_SORT_OPTIONS - Constant used across modules.
export { CATEGORY_ADMIN_SORT_OPTIONS } from "./features/categories/components/CategoryFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// CATEGORY_FIELDS - Constant used across modules.
export { CATEGORY_FIELDS } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CATEGORY_FILTER_KEYS - Constant used across modules.
export { CATEGORY_FILTER_KEYS } from "./features/categories/components/CategoryFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CATEGORY_PUBLIC_SORT_OPTIONS - Constant used across modules.
export { CATEGORY_PUBLIC_SORT_OPTIONS } from "./features/categories/components/CategoryFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CATEGORY_SELLER_SORT_OPTIONS - Constant used across modules.
export { CATEGORY_SELLER_SORT_OPTIONS } from "./features/categories/components/CategoryFilters";
// [SERVER-RSC]-Self-fetching index/detail page views for categories.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategoryCard - Component for category card.
export { CategoryCard } from "./features/categories/components/CategoryGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategoryFilters - Shared export for category filters.
export { CategoryFilters } from "./features/categories/components/CategoryFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategoryForm - Component for category form.
export { CategoryForm } from "./features/categories/components/CategoryForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategoryGrid - Component for category grid.
export { CategoryGrid } from "./features/categories/components/CategoryGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategoryProductsListing - Client toolbar listing for category detail pages.
export { CategoryProductsListing } from "./features/categories/components/CategoryProductsListing";
export type { CategoryProductsListingProps } from "./features/categories/components/CategoryProductsListing";
export { CategoriesIndexListing } from "./features/categories/components/CategoriesIndexListing";
export type { CategoriesIndexListingProps } from "./features/categories/components/CategoriesIndexListing";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategorySelectorCreate - Shared export for category selector create.
export { CategorySelectorCreate } from "./features/categories/components/CategorySelectorCreate";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategorySortSelect - Component for category sort select.
export { CategorySortSelect } from "./features/categories/components/CategorySortSelect";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CategoryTree - Shared export for category tree.
export { CategoryTree } from "./features/categories/components/CategoryTree";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ConcernCard - Component for concern card.
export { ConcernCard } from "./features/categories/components/ConcernCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ConcernGrid - Component for concern grid.
export { ConcernGrid } from "./features/categories/components/ConcernGrid";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_CATEGORY_DATA - Constant used across modules.
export { DEFAULT_CATEGORY_DATA } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MAX_FEATURED_CATEGORIES - Constant used across modules.
export { MAX_FEATURED_CATEGORIES } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MIN_ITEMS_FOR_FEATURED - Constant used across modules.
export { MIN_ITEMS_FOR_FEATURED } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCategoryColumns - Helper for build category columns.
export { buildCategoryColumns } from "./features/categories/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCategoryTree - Helper for build category tree.
export { buildCategoryTree } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// calculateCategoryFields - Helper for calculate category fields.
export { calculateCategoryFields } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// canBeFeatured - Shared export for can be featured.
export { canBeFeatured } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryAdminColumns - Shared export for category admin columns.
export { categoryAdminColumns } from "./features/categories/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryDisplaySchema - Model for category display schema.
export { categoryDisplaySchema } from "./features/categories/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryItemSchema - Model for category item schema.
export { categoryItemSchema } from "./features/categories/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryListParamsSchema - Model for category list params schema.
export { categoryListParamsSchema } from "./features/categories/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryMetricsSchema - Model for category metrics schema.
export { categoryMetricsSchema } from "./features/categories/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryQueryHelpers - Shared export for category query helpers.
export { categoryQueryHelpers } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categorySeoSchema - Model for category seo schema.
export { categorySeoSchema } from "./features/categories/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// categoryTypeSchema - Model for category type schema.
export { categoryTypeSchema } from "./features/categories/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createCategoryId - Helper for create category id.
export { createCategoryId } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// flattenCategories - Shared export for flatten categories.
export { flattenCategories } from "./features/categories/types/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getCategoryFilterKeys - Helper for get category filter keys.
export { getCategoryFilterKeys } from "./features/categories/components/CategoryFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getCategorySortOptions - Helper for get category sort options.
export { getCategorySortOptions } from "./features/categories/components/CategoryFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getCategoryTableColumns - Helper for get category table columns.
export { getCategoryTableColumns } from "./features/categories/components/CategoryTableColumns";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidCategoryMove - Shared export for is valid category move.
export { isValidCategoryMove } from "./features/categories/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCategories - React hook for use categories.
export { useCategories } from "./features/categories/hooks/useCategorySelector";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCategoriesList - React hook for use categories list.
export { useCategoriesList } from "./features/categories/hooks/useCategories";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCategoryDetail - React hook for use category detail.
export { useCategoryDetail } from "./features/categories/hooks/useCategories";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCategorySelector - React hook for use category selector.
export { useCategorySelector } from "./features/categories/hooks/useCategorySelector";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCreateCategory - React hook for use create category.
export { useCreateCategory } from "./features/categories/hooks/useCategorySelector";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BreadcrumbTrailProps - Type contract for breadcrumb trail props.
export type { BreadcrumbTrailProps } from "./features/categories/components/BreadcrumbTrail";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoriesResponse - Type contract for categories response.
export type { CategoriesResponse } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Category - Type contract for category.
export type { Category } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryAncestor - Type contract for category ancestor.
export type { CategoryAncestor } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryCardProps - Type contract for category card props.
export type { CategoryCardProps } from "./features/categories/components/CategoryGrid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryCreateInput - Type contract for category create input.
export type { CategoryCreateInput } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryDisplay - Type contract for category display.
export type { CategoryDisplay } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryDocument - Type contract for category document.
export type { CategoryDocument } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryDocumentDisplay - Type contract for category document display.
export type { CategoryDocumentDisplay } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryDocumentMetrics - Type contract for category document metrics.
export type { CategoryDocumentMetrics } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryDocumentSEO - Type contract for category document seo.
export type { CategoryDocumentSEO } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryDrawerMode - Type contract for category drawer mode.
export type { CategoryDrawerMode } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryFilterVariant - Type contract for category filter variant.
export type { CategoryFilterVariant } from "./features/categories/components/CategoryFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryFiltersProps - Type contract for category filters props.
export type { CategoryFiltersProps } from "./features/categories/components/CategoryFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryFormLabels - Type contract for category form labels.
export type { CategoryFormLabels } from "./features/categories/components/CategoryForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryFormProps - Type contract for category form props.
export type { CategoryFormProps } from "./features/categories/components/CategoryForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryGridProps - Type contract for category grid props.
export type { CategoryGridProps } from "./features/categories/components/CategoryGrid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryItem - Type contract for category item.
export type { CategoryItem } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryMetrics - Type contract for category metrics.
export type { CategoryMetrics } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryMoveInput - Type contract for category move input.
export type { CategoryMoveInput } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryProductsViewProps - Type contract for category products view props.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategorySelectorCreateLabels - Type contract for category selector create labels.
export type { CategorySelectorCreateLabels } from "./features/categories/components/CategorySelectorCreate";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategorySelectorCreateProps - Type contract for category selector create props.
export type { CategorySelectorCreateProps } from "./features/categories/components/CategorySelectorCreate";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategorySeo - Type contract for category seo.
export type { CategorySeo } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategorySortSelectProps - Type contract for category sort select props.
export type { CategorySortSelectProps } from "./features/categories/components/CategorySortSelect";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryTableColumnsLabels - Type contract for category table columns labels.
export type { CategoryTableColumnsLabels } from "./features/categories/components/CategoryTableColumns";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryTreeNode - Type contract for category tree node.
export type { CategoryTreeNode } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryTreeProps - Type contract for category tree props.
export type { CategoryTreeProps } from "./features/categories/components/CategoryTree";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryType - Type contract for category type.
export type { CategoryType } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoryUpdateInput - Type contract for category update input.
export type { CategoryUpdateInput } from "./features/categories/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Concern - Type contract for concern.
export type { Concern } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ConcernListResponse - Type contract for concern list response.
export type { ConcernListResponse } from "./features/categories/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseCategorySelectorOptions - Type contract for use category selector options.
export type { UseCategorySelectorOptions } from "./features/categories/hooks/useCategorySelector";

// ./features/categories/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// POST - Constant used across modules.
export { POST } from "./features/categories/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoriesGET - Shared export for categories get.
export { GET as categoriesGET } from "./features/categories/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoryItemDELETE - Shared export for category item delete.
export { categoryItemDELETE } from "./features/categories/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoryItemGET - Shared export for category item get.
export { categoryItemGET } from "./features/categories/api/[id]/route";
// categoryDescriptionTemplateGET - the seller form's inherited-template read.
export { GET as categoryDescriptionTemplateGET } from "./features/categories/api/[id]/description-template/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// categoryItemPATCH - Shared export for category item patch.
export { categoryItemPATCH } from "./features/categories/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createCategory - Helper for create category.
export { createCategory } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteCategory - Helper for delete category.
export { deleteCategory } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// fetchCategoryTree - Shared export for fetch category tree.
export { fetchCategoryTree } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCategoryById - Helper for get category by id.
export { getCategoryById } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCategoryBySlug - Helper for get category by slug.
export { getCategoryBySlug } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getCategoryChildren - Helper for get category children.
export { getCategoryChildren } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBrandCategories - Helper for list brand categories.
export { listBrandCategories } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listCategories - Helper for list categories.
export { listCategories } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listTopLevelCategories - Helper for list top level categories.
export { listTopLevelCategories } from "./features/categories/actions/category-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateCategory - Helper for update category.
export { updateCategory } from "./features/categories/actions/category-actions";

// ./features/checkout/schemas/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// FAILED_CHECKOUTS_COLLECTION - Constant used across modules.
export { FAILED_CHECKOUTS_COLLECTION } from "./features/checkout/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// FAILED_PAYMENTS_COLLECTION - Constant used across modules.
export { FAILED_PAYMENTS_COLLECTION } from "./features/checkout/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FailedCheckoutDocument - Type contract for failed checkout document.
export type { FailedCheckoutDocument } from "./features/checkout/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FailedCheckoutReason - Type contract for failed checkout reason.
export type { FailedCheckoutReason } from "./features/checkout/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FailedPaymentDocument - Type contract for failed payment document.
export type { FailedPaymentDocument } from "./features/checkout/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FailedPaymentReason - Type contract for failed payment reason.
export type { FailedPaymentReason } from "./features/checkout/schemas/firestore";

// ./features/cms/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CMS_FEATURE - Constant used across modules.
export { CMS_FEATURE } from "./features/cms/index";

// ./features/collections/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CollectionCard - Component for collection card.
export { CollectionCard } from "./features/collections/components/CollectionCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CollectionGrid - Component for collection grid.
export { CollectionGrid } from "./features/collections/components/CollectionCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCollectionColumns - Helper for build collection columns.
export { buildCollectionColumns } from "./features/collections/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectionAdminColumns - Shared export for collection admin columns.
export { collectionAdminColumns } from "./features/collections/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectionItemSchema - Model for collection item schema.
export { collectionItemSchema } from "./features/collections/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// collectionListItemSchema - Model for collection list item schema.
export { collectionListItemSchema } from "./features/collections/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCollection - React hook for use collection.
export { useCollection } from "./features/collections/hooks/useCollections";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCollections - React hook for use collections.
export { useCollections } from "./features/collections/hooks/useCollections";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectionItem - Type contract for collection item.
export type { CollectionItem } from "./features/collections/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectionListItem - Type contract for collection list item.
export type { CollectionListItem } from "./features/collections/types/index";

// ./features/consultation/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ConsultationForm - Component for consultation form.
export { ConsultationForm } from "./features/consultation/components/ConsultationForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// bookConsultationSchema - Model for book consultation schema.
export { bookConsultationSchema } from "./features/consultation/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildConsultationColumns - Helper for build consultation columns.
export { buildConsultationColumns } from "./features/consultation/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// consultationAdminColumns - Shared export for consultation admin columns.
export { consultationAdminColumns } from "./features/consultation/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// consultationBookingSchema - Model for consultation booking schema.
export { consultationBookingSchema } from "./features/consultation/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// consultationModeSchema - Model for consultation mode schema.
export { consultationModeSchema } from "./features/consultation/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// consultationStatusSchema - Model for consultation status schema.
export { consultationStatusSchema } from "./features/consultation/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBookConsultation - React hook for use book consultation.
export { useBookConsultation } from "./features/consultation/hooks/useBookConsultation";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BookConsultationInput - Type contract for book consultation input.
export type { BookConsultationInput } from "./features/consultation/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ConsultationBooking - Type contract for consultation booking.
export type { ConsultationBooking } from "./features/consultation/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ConsultationListResponse - Type contract for consultation list response.
export type { ConsultationListResponse } from "./features/consultation/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ConsultationMode - Type contract for consultation mode.
export type { ConsultationMode } from "./features/consultation/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ConsultationStatus - Type contract for consultation status.
export type { ConsultationStatus } from "./features/consultation/types/index";

// ./features/consultation/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// ConsultationsRepository - Shared export for consultations repository.
export { ConsultationsRepository } from "./features/consultation/repository/consultations.repository";

// ./features/contact/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ContactForm - Component for contact form.
export { ContactForm } from "./features/contact/components/ContactForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ContactInfoSidebar - Shared export for contact info sidebar.
export { ContactInfoSidebar } from "./features/contact/components/ContactInfoSidebar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ContactPageView - Shared export for contact page view.
export { ContactPageView } from "./features/contact/components/ContactPageView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useContactSubmit - React hook for use contact submit.
export { useContactSubmit } from "./features/contact/hooks/useContactSubmit";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ContactFormProps - Type contract for contact form props.
export type { ContactFormProps } from "./features/contact/components/ContactForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ContactInfoItem - Type contract for contact info item.
export type { ContactInfoItem } from "./features/contact/components/ContactInfoSidebar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ContactInfoSidebarProps - Type contract for contact info sidebar props.
export type { ContactInfoSidebarProps } from "./features/contact/components/ContactInfoSidebar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseContactSubmitOptions - Type contract for use contact submit options.
export type { UseContactSubmitOptions } from "./features/contact/hooks/useContactSubmit";

// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.

// ./features/corporate/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CorporateInquiryForm - Component for corporate inquiry form.
export { CorporateInquiryForm } from "./features/corporate/components/CorporateInquiryForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCorporateColumns - Helper for build corporate columns.
export { buildCorporateColumns } from "./features/corporate/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// corporateAdminColumns - Shared export for corporate admin columns.
export { corporateAdminColumns } from "./features/corporate/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// corporateInquirySchema - Model for corporate inquiry schema.
export { corporateInquirySchema } from "./features/corporate/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// corporateInquiryStatusSchema - Model for corporate inquiry status schema.
export { corporateInquiryStatusSchema } from "./features/corporate/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// submitCorporateInquirySchema - Model for submit corporate inquiry schema.
export { submitCorporateInquirySchema } from "./features/corporate/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSubmitCorporateInquiry - React hook for use submit corporate inquiry.
export { useSubmitCorporateInquiry } from "./features/corporate/hooks/useSubmitCorporateInquiry";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CorporateInquiry - Type contract for corporate inquiry.
export type { CorporateInquiry } from "./features/corporate/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CorporateInquiryListResponse - Type contract for corporate inquiry list response.
export type { CorporateInquiryListResponse } from "./features/corporate/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CorporateInquiryStatus - Type contract for corporate inquiry status.
export type { CorporateInquiryStatus } from "./features/corporate/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SubmitCorporateInquiryInput - Type contract for submit corporate inquiry input.
export type { SubmitCorporateInquiryInput } from "./features/corporate/types/index";

// ./features/corporate/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// CorporateRepository - Shared export for corporate repository.
export { CorporateRepository } from "./features/corporate/repository/corporate.repository";

// ./features/cron/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// _resetCronRegistry - Shared export for reset cron registry.
export { _resetCronRegistry } from "./features/cron/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createCronJob - Helper for create cron job.
export { createCronJob } from "./features/cron/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createPreOrderReminderJob - Helper for create pre order reminder job.
export { createPreOrderReminderJob } from "./features/cron/jobs/preorder-reminder.job";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// findCronJob - Shared export for find cron job.
export { findCronJob } from "./features/cron/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getCronRegistry - Helper for get cron registry.
export { getCronRegistry } from "./features/cron/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getCronRegistrySummary - Helper for get cron registry summary.
export { getCronRegistrySummary } from "./features/cron/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// runJob - Helper for run job.
export { runJob } from "./features/cron/registry";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// wrapPubSub - Shared export for wrap pub sub.
export { wrapPubSub } from "./features/cron/firebase-adapters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// wrapScheduled - Shared export for wrap scheduled.
export { wrapScheduled } from "./features/cron/firebase-adapters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateCronJobOptions - Type contract for create cron job options.
export type { CreateCronJobOptions } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CronJobDefinition - Type contract for cron job definition.
export type { CronJobDefinition } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CronRegistry - Type contract for cron registry.
export type { CronRegistry } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CronRegistrySummary - Type contract for cron registry summary.
export type { CronRegistrySummary } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// JobContext - Type contract for job context.
export type { JobContext } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// JobResult - Type contract for job result.
export type { JobResult } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PubSubJobFn - Type contract for pub sub job fn.
export type { PubSubJobFn } from "./features/cron/types";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ScheduledJobFn - Type contract for scheduled job fn.
export type { ScheduledJobFn } from "./features/cron/types";

// ./features/events/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminEventEntriesView - Component for admin event entries view.
export { AdminEventEntriesView } from "./features/events/components/AdminEventEntriesView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AdminEventsView - Component for admin events view.
export { AdminEventsView } from "./features/events/components/AdminEventsView";
// AdminEventEditorView - Component for admin event create/edit form.
export { AdminEventEditorView } from "./features/events/components/AdminEventEditorView";
export type { AdminEventEditorViewProps } from "./features/events/components/AdminEventEditorView";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EVENTS_COLLECTION - Constant used across modules.
export { EVENTS_COLLECTION } from "./features/events/schemas/firestore";
/*
 * [SHARED] RAFFLE_MAX_ENTRIES_PER_USER — one entry per person in a raffle.
 *
 * Public because the consumer's participate page must hand the SAME number to
 * `EventGiveawayEntryForm` that `enterEvent` enforces server-side. Two mirrored
 * literals is the shape that caused the bug: the form already said "you've
 * used all 1 entry slot" while the server enforced nothing at all.
 */
export { RAFFLE_MAX_ENTRIES_PER_USER } from "./_internal/shared/features/events/config";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EVENT_ADMIN_SORT_OPTIONS - Constant used across modules.
export { EVENT_ADMIN_SORT_OPTIONS } from "./features/events/components/EventFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EVENT_ENTRIES_COLLECTION - Constant used across modules.
export { EVENT_ENTRIES_COLLECTION } from "./features/events/schemas/firestore";
// LOTTERY_ENTRIES_COLLECTION - New lotteryEntries collection constant.
export { LOTTERY_ENTRIES_COLLECTION } from "./features/lottery/schemas/firestore";
export { supportTicketCreateSchema } from "./features/support/schemas/ticket-create-form";
export type { SupportTicketCreateValues } from "./features/support/schemas/ticket-create-form";
// The lotteryConfig WRITE contract + the booking-preserving merge. The only
// sanctioned way to write lotteryConfig — see the schema module's header.
export { lotteryConfigWriteSchema, lotterySlotWriteSchema, mergeLotteryConfig } from "./features/lottery/schemas/config-write";
export type { LotteryConfigWriteInput, LotteryMergeResult } from "./features/lottery/schemas/config-write";
// lotteryEntriesSeedData - Seed data for the lotteryEntries collection.
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// LOTTERY_ENTRY_FIELDS - Canonical field name constants for lotteryEntries collection.
export { LOTTERY_ENTRY_FIELDS } from "./features/lottery/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EVENT_ENTRY_FIELDS - Constant used across modules.
export { EVENT_ENTRY_FIELDS } from "./features/events/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EVENT_ENTRY_INDEXED_FIELDS - Constant used across modules.
export { EVENT_ENTRY_INDEXED_FIELDS } from "./features/events/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EVENT_FIELDS - Constant used across modules.
export { EVENT_FIELDS } from "./features/events/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EVENT_FILTER_KEYS - Constant used across modules.
export { EVENT_FILTER_KEYS } from "./features/events/components/EventFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// EVENT_INDEXED_FIELDS - Constant used across modules.
export { EVENT_INDEXED_FIELDS } from "./features/events/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EVENT_PUBLIC_SORT_OPTIONS - Constant used across modules.
export { EVENT_PUBLIC_SORT_OPTIONS } from "./features/events/components/EventFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EVENT_SELLER_SORT_OPTIONS - Constant used across modules.
export { EVENT_SELLER_SORT_OPTIONS } from "./features/events/components/EventFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EVENT_SORT_OPTIONS - Constant used across modules.
export { EVENT_SORT_OPTIONS } from "./features/events/components/EventFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventBanner - Shared export for event banner.
export { EventBanner } from "./features/events/components/EventBanner";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventCard - Component for event card.
export { EventCard } from "./features/events/components/EventCard";
// RelatedEventsCarousel - Component for related events carousel (tag overlap).
export { RelatedEventsCarousel } from "./features/events/components/RelatedEventsCarousel";
export type { RelatedEventItem } from "./features/events/components/RelatedEventsCarousel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventDetailView - Component for event detail view.
export { EventDetailView } from "./features/events/components/EventDetailView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventFilters - Shared export for event filters.
export { EventFilters } from "./features/events/components/EventFilters";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// EventFormDrawer - Component for event form drawer.
export { EventFormDrawer } from "./features/events/components/EventFormDrawer";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventLeaderboard - Shared export for event leaderboard.
export { EventLeaderboard } from "./features/events/components/EventLeaderboard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventParticipateView - Component for event participate view.
export { EventParticipateView } from "./features/events/components/EventParticipateView";
// EventPollWidget - Inline poll voting widget for event detail pages.
export { EventPollWidget } from "./features/events/components/EventPollWidget";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventStatusBadge - Component for event status badge.
export { EventStatusBadge } from "./features/events/components/EventStatusBadge";
// EventGiveawayWinnerView - Public-facing winner card for a `giveaway` event's draw.
export { EventGiveawayWinnerView } from "./features/events/components/EventGiveawayWinnerView";
export type { EventGiveawayWinnerViewProps } from "./features/events/components/EventGiveawayWinnerView";
// BonusSpinView - Spin-the-wheel client component for `bonus-spin` events.
export { BonusSpinView } from "./features/events/components/BonusSpinView";
export type { BonusSpinViewProps } from "./features/events/components/BonusSpinView";
// EventGiveawayEntryForm - Giveaway entry form (prize hero + eligibility + optional message).
export { EventGiveawayEntryForm } from "./features/events/components/EventGiveawayEntryForm";
export type { EventGiveawayEntryFormProps } from "./features/events/components/EventGiveawayEntryForm";
// EventOfferCard - Coupon code display + copy-to-clipboard for offer events.
export { EventOfferCard } from "./features/events/components/EventOfferCard";
export type { EventOfferCardProps } from "./features/events/components/EventOfferCard";
// Lottery feature — client components
export { LotterySlotGrid } from "./_internal/client/features/lottery/LotterySlotGrid";
export { LotteryPullForm } from "./_internal/client/features/lottery/LotteryPullForm";
export { LotteryListView } from "./_internal/client/features/lottery/LotteryListView";
export { LotteryDetailView } from "./_internal/client/features/lottery/LotteryDetailView";
export { LotteryEntriesView } from "./_internal/client/features/lottery/LotteryEntriesView";
export { LotteryAdminSlotView } from "./_internal/client/features/lottery/LotteryAdminSlotView";
export { LotteryAdminEditView } from "./_internal/client/features/lottery/LotteryAdminEditView";
export { RandomLotsLotteryDetailView } from "./_internal/client/features/lottery/RandomLotsLotteryDetailView";
// Lottery feature — types
export type { LotteryConfig, LotterySlot, ClientLotterySlot, ClientLotteryConfig, LotteryPricingMode, LotteryEntryStatus } from "./features/lottery/types";
export { LotteryError, computeWeight, pickWeightedSlot, assignSlotWeights } from "./features/lottery/types";
// Lottery feature — Firestore schema
export type { LotteryEntryDocument } from "./features/lottery/schemas/firestore";
export type { SpinPrize } from "./features/events/types/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// EventsListView - Component for events list view.
export { EventsListView } from "./features/events/components/EventsListView";
// EventsListPageView - Server component for public events listing with toolbar.
// EventsIndexListing - Client listing component with search/sort/filter/pagination.
export { EventsIndexListing } from "./features/events/components/EventsIndexListing";
export type { EventsIndexListingProps } from "./features/events/components/EventsIndexListing";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildEventColumns - Helper for build event columns.
export { buildEventColumns } from "./features/events/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventAdminColumns - Shared export for event admin columns.
export { eventAdminColumns } from "./features/events/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventItemSchema - Model for event item schema.
export { eventItemSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventListParamsSchema - Model for event list params schema.
export { eventListParamsSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventQueryHelpers - Shared export for event query helpers.
export { eventQueryHelpers } from "./features/events/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventStatusSchema - Model for event status schema.
export { eventStatusSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// eventTypeSchema - Model for event type schema.
export { eventTypeSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getEventFilterKeys - Helper for get event filter keys.
export { getEventFilterKeys } from "./features/events/components/EventFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getEventSortOptions - Helper for get event sort options.
export { getEventSortOptions } from "./features/events/components/EventFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// offerConfigSchema - Model for offer config schema.
export { offerConfigSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// pollConfigSchema - Model for poll config schema.
export { pollConfigSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// saleConfigSchema - Model for sale config schema.
export { saleConfigSchema } from "./features/events/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBulkEvent - React hook for use bulk event.
export { useBulkEvent } from "./features/events/hooks/useBulkEvent";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useEvent - React hook for use event.
export { useEvent } from "./features/events/hooks/useEvent";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useEventEntries - React hook for use event entries.
export { useEventEntries } from "./features/events/hooks/useEvent";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useEventLeaderboard - React hook for use event leaderboard.
export { useEventLeaderboard } from "./features/events/hooks/useEvent";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useEvents - React hook for use events.
export { useEvents } from "./features/events/hooks/useEvents";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminEventEntriesViewProps - Type contract for admin event entries view props.
export type { AdminEventEntriesViewProps } from "./features/events/components/AdminEventEntriesView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AdminEventsViewProps - Type contract for admin events view props.
export type { AdminEventsViewProps } from "./features/events/components/AdminEventsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BulkEventStatus - Type contract for bulk event status.
export type { BulkEventStatus } from "./features/events/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateEventEntryInput - Type contract for create event entry input.
export type { CreateEventEntryInput } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EntryReviewStatus - Type contract for entry review status.
export type { EntryReviewStatus } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventBannerProps - Type contract for event banner props.
export type { EventBannerProps } from "./features/events/components/EventBanner";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventCreateInput - Type contract for event create input.
export type { EventCreateInput } from "./features/events/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventDetailViewProps - Type contract for event detail view props.
export type { EventDetailViewProps } from "./features/events/components/EventDetailView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventDocument - Type contract for event document.
export type { EventDocument } from "./features/events/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventEntryCreateInput - Type contract for event entry create input.
export type { EventEntryCreateInput } from "./features/events/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventEntryDocument - Type contract for event entry document.
export type { EventEntryDocument } from "./features/events/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventEntryItem - Type contract for event entry item.
export type { EventEntryItem } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventEntryListResponse - Type contract for event entry list response.
export type { EventEntryListResponse } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventFilterVariant - Type contract for event filter variant.
export type { EventFilterVariant } from "./features/events/components/EventFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventFiltersProps - Type contract for event filters props.
export type { EventFiltersProps } from "./features/events/components/EventFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventFormDrawerProps - Type contract for event form drawer props.
export type { EventFormDrawerProps } from "./features/events/components/EventFormDrawer";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventItem - Type contract for event item.
export type { EventItem } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventLeaderboardProps - Type contract for event leaderboard props.
export type { EventLeaderboardProps } from "./features/events/components/EventLeaderboard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventListParams - Type contract for event list params.
export type { EventListParams } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventListResponse - Type contract for event list response.
export type { EventListResponse } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventParticipateViewProps - Type contract for event participate view props.
export type { EventParticipateViewProps } from "./features/events/components/EventParticipateView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventStatus - Type contract for event status.
export type { EventStatus } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventType - Type contract for event type.
export type { EventType } from "./features/events/types/index";
// ALL_EVENT_TYPES / ALL_EVENT_STATUSES - derived from a `Record<Union, true>`,
// so a union member missing from either is a COMPILE error rather than a
// silently short list. Exported because consumers were hand-writing their own
// copies and drifting (Root Cause #61).
export { ALL_EVENT_TYPES, ALL_EVENT_STATUSES } from "./features/events/types/index";
// normalizeEventType - maps a stored or inbound event `type` onto the current
// union, tolerating the three pre-2026-10-31 spellings (`raffle` ->
// `giveaway`, `spin_wheel` -> `bonus-spin`, `lottery` -> `random-draw`).
// Returns undefined for anything unrecognised, never a plausible default.
// 🛑 Every READ-side comparison must go through this: documents written before
// the rename migration still hold the old values, and a bare `===` silently
// treats each one as "not that type".
export { normalizeEventType } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventUpdateInput - Type contract for event update input.
export type { EventUpdateInput } from "./features/events/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeedbackConfig - Type contract for feedback config.
export type { FeedbackConfig } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FormFieldType - Type contract for form field type.
export type { FormFieldType } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LeaderboardEntry - Type contract for leaderboard entry.
export type { LeaderboardEntry } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PollResultEntry - Type contract for a tallied poll-option result.
export type { PollResultEntry } from "./features/events/types/index";
// SpinResultEntry - Type contract for a spin_wheel event's winning-spin history row.
export type { SpinResultEntry } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OfferConfig - Type contract for offer config.
export type { OfferConfig } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PollConfig - Type contract for poll config.
export type { PollConfig } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PollResultsVisibility - Type contract for poll results visibility.
export type { PollResultsVisibility } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SaleConfig - Type contract for sale config.
export type { SaleConfig } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SurveyConfig - Type contract for survey config.
export type { SurveyConfig } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SurveyFormField - Type contract for survey form field.
export type { SurveyFormField } from "./features/events/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseBulkEventOptions - Type contract for use bulk event options.
export type { UseBulkEventOptions } from "./features/events/hooks/useBulkEvent";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseBulkEventReturn - Type contract for use bulk event return.
export type { UseBulkEventReturn } from "./features/events/hooks/useBulkEvent";

// ./features/events/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminGetEventById - Shared export for admin get event by id.
export { adminGetEventById } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminGetEventEntries - Shared export for admin get event entries.
export { adminGetEventEntries } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminGetEventStats - Shared export for admin get event stats.
export { adminGetEventStats } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminListEvents - Shared export for admin list events.
export { adminListEvents } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateEventEntry - Model for admin update event entry.
export { adminUpdateEventEntry } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// changeEventStatus - Model for change event status.
export { changeEventStatus } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createEvent - Helper for create event.
export { createEvent } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteEvent - Helper for delete event.
export { deleteEvent } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// enterEvent - Model for enter event.
export { enterEvent } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// eventIdGET - Shared export for event id get.
export { GET as eventIdGET } from "./features/events/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getEventLeaderboard - Helper for get event leaderboard.
export { getEventLeaderboard } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getEventPollResults - Helper for get event poll results (per-option vote tally).
export { getEventPollResults } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getEventSpinResults - Last N winning spins for a spin_wheel event, most recent first.
export { getEventSpinResults } from "./features/events/actions/event-actions";
// getUserSpinResultsForEvent - The CALLER'S OWN spins for an event, unmasked. Companion to the masked public feed above.
export { getUserSpinResultsForEvent } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getPublicEventById - Helper for get public event by id.
export { getPublicEventById } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listPublicEvents - Helper for list public events.
export { listPublicEvents } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getRelatedEvents - Helper for get related events (tag overlap).
export { getRelatedEvents } from "./features/events/actions/event-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateEvent - Helper for update event.
export { updateEvent } from "./features/events/actions/event-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateEventInput - Type contract for create event input.
export type { CreateEventInput } from "./features/events/actions/event-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EnterEventInput - Type contract for enter event input.
export type { EnterEventInput } from "./features/events/actions/event-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateEventInput - Type contract for update event input.
export type { UpdateEventInput } from "./features/events/actions/event-actions";

// ./features/faq/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ContactCTA - Shared export for contact cta.
export { ContactCTA } from "./features/faq/components/ContactCTA";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_FAQ_DATA - Constant used across modules.
export { DEFAULT_FAQ_DATA } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQAccordion - Shared export for faqaccordion.
export { FAQAccordion } from "./features/faq/components/FAQAccordion";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQCategorySidebar - Shared export for faqcategory sidebar.
export { FAQCategorySidebar } from "./features/faq/components/FAQCategorySidebar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQCategoryTabs - Component for faqcategory tabs.
export { FAQCategoryTabs } from "./features/faq/components/FAQAccordion";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQHelpfulButtons - Shared export for faqhelpful buttons.
export { FAQHelpfulButtons } from "./features/faq/components/FAQHelpfulButtons";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQPageContent - Shared export for faqpage content.
export { FAQPageContent } from "./features/faq/components/FAQPageContent";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// FAQS_COLLECTION - Constant used across modules.
export { FAQS_COLLECTION } from "./features/faq/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// FAQS_INDEXED_FIELDS - Constant used across modules.
export { FAQS_INDEXED_FIELDS } from "./features/faq/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant — Zod validator, default-value object, or Firestore collection/field name constant.
// TESTER_CHECKLIST_ITEM_COLLECTION - Constant used across modules.
export { TESTER_CHECKLIST_ITEM_COLLECTION } from "./features/tester/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant — Zod validator, default-value object, or Firestore collection/field name constant.
// TESTER_CHECKLIST_RESPONSE_COLLECTION - Constant used across modules.
export { TESTER_CHECKLIST_RESPONSE_COLLECTION } from "./features/tester/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant — Zod validator, default-value object, or Firestore collection/field name constant.
// TESTER_CHECKLIST_ITEM_FIELDS - Constant used across modules.
export { TESTER_CHECKLIST_ITEM_FIELDS } from "./features/tester/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant — Zod validator, default-value object, or Firestore collection/field name constant.
// TESTER_CHECKLIST_RESPONSE_FIELDS - Constant used across modules.
export { TESTER_CHECKLIST_RESPONSE_FIELDS } from "./features/tester/schemas/firestore";
// TesterChecklistItemDocument - Type contract for tester checklist item document.
export type { TesterChecklistItemDocument } from "./features/tester/schemas/firestore";
// TesterChecklistResponseDocument - Type contract for tester checklist response document.
export type { TesterChecklistResponseDocument } from "./features/tester/schemas/firestore";
// TesterAnswer - Type contract for tester answer.
export type { TesterAnswer } from "./features/tester/schemas/firestore";
// TesterFeedbackStatus - Type contract for tester feedback status.
export type { TesterFeedbackStatus } from "./features/tester/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// FAQS_PUBLIC_FIELDS - Constant used across modules.
export { FAQS_PUBLIC_FIELDS } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQSortDropdown - Shared export for faqsort dropdown.
export { FAQSortDropdown } from "./features/faq/components/FAQSortDropdown";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQ_CATEGORY_LABELS - Constant used across modules.
export { FAQ_CATEGORY_LABELS } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// RelatedFAQs - Shared export for related faqs.
export { RelatedFAQs } from "./features/faq/components/RelatedFAQs";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildFaqColumns - Helper for build faq columns.
export { buildFaqColumns } from "./features/faq/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createFAQId - Helper for create faqid.
export { createFAQId } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// extractVariablePlaceholders - Shared export for extract variable placeholders.
export { extractVariablePlaceholders } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqAdminColumns - Shared export for faq admin columns.
export { faqAdminColumns } from "./features/faq/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqAnswerFormatSchema - Model for faq answer format schema.
export { faqAnswerFormatSchema } from "./features/faq/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqAnswerSchema - Model for faq answer schema.
export { faqAnswerSchema } from "./features/faq/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqCategorySchema - Model for faq category schema.
export { faqCategorySchema } from "./features/faq/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqListParamsSchema - Model for faq list params schema.
export { faqListParamsSchema } from "./features/faq/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqQueryHelpers - Shared export for faq query helpers.
export { faqQueryHelpers } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqSchema - Model for faq schema.
export { faqSchema } from "./features/faq/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// faqStatsSchema - Model for faq stats schema.
export { faqStatsSchema } from "./features/faq/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getHelpfulnessPercentage - Helper for get helpfulness percentage.
export { getHelpfulnessPercentage } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isPopularFAQ - Shared export for is popular faq.
export { isPopularFAQ } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// slugifyQuestion - Shared export for slugify question.
export { slugifyQuestion } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useFaqList - React hook for use faq list.
export { useFaqList } from "./features/faq/hooks/useFaqList";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useFaqVote - React hook for use faq vote.
export { useFaqVote } from "./features/faq/hooks/useFaqVote";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usesVariableInterpolation - Shared export for uses variable interpolation.
export { usesVariableInterpolation } from "./features/faq/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// validateFAQVariables - Helper for validate faqvariables.
export { validateFAQVariables } from "./features/faq/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQ - Type contract for faq.
export type { FAQ } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQAnswer - Type contract for faqanswer.
export type { FAQAnswer } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQAnswerFormat - Type contract for faqanswer format.
export type { FAQAnswerFormat } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQCategory - Type contract for faqcategory.
export type { FAQCategory } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQCategoryItem - Type contract for faqcategory item.
export type { FAQCategoryItem } from "./features/faq/components/FAQCategorySidebar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQCreateInput - Type contract for faqcreate input.
export type { FAQCreateInput } from "./features/faq/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQDocument - Type contract for faqdocument.
export type { FAQDocument } from "./features/faq/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQListParams - Type contract for faqlist params.
export type { FAQListParams } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQListResponse - Type contract for faqlist response.
export type { FAQListResponse } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQSEO - Type contract for faqseo.
export type { FAQSEO } from "./features/faq/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQSortOption - Type contract for faqsort option.
export type { FAQSortOption } from "./features/faq/components/FAQSortDropdown";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQStats - Type contract for faqstats.
export type { FAQStats } from "./features/faq/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQUpdateInput - Type contract for faqupdate input.
export type { FAQUpdateInput } from "./features/faq/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQWithInterpolatedAnswer - Type contract for faqwith interpolated answer.
export type { FAQWithInterpolatedAnswer } from "./features/faq/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseFaqVoteOptions - Type contract for use faq vote options.
export type { UseFaqVoteOptions } from "./features/faq/hooks/useFaqVote";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// VoteFaqInput - Type contract for vote faq input.
export type { VoteFaqInput } from "./features/faq/hooks/useFaqVote";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// VoteFaqResult - Type contract for vote faq result.
export type { VoteFaqResult } from "./features/faq/hooks/useFaqVote";

// ./features/faq/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createFaq - Helper for create faq.
export { createFaq } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteFaq - Helper for delete faq.
export { deleteFaq } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// faqCreateSchema - Model for faq create schema.
export { faqCreateSchema } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// faqUpdateSchema - Model for faq update schema.
export { faqUpdateSchema } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFaqById - Helper for get faq by id.
export { getFaqById } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listFaqs - Helper for list faqs.
export { listFaqs } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listPublicFaqs - Helper for list public faqs.
export { listPublicFaqs } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateFaq - Helper for update faq.
export { updateFaq } from "./features/faq/actions/faq-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// voteFaq - Shared export for vote faq.
export { voteFaq } from "./features/faq/actions/faq-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FaqCreateInput - Type contract for faq create input.
export type { FaqCreateInput } from "./features/faq/actions/faq-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FaqUpdateInput - Type contract for faq update input.
export type { FaqUpdateInput } from "./features/faq/actions/faq-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// VoteFaqActionInput - Type contract for vote faq action input.
export type { VoteFaqActionInput } from "./features/faq/actions/faq-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// VoteFaqActionResult - Type contract for vote faq action result.
export type { VoteFaqActionResult } from "./features/faq/actions/faq-actions";

// ./features/filters/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FilterFacetSection - Shared export for filter facet section.
export { FilterFacetSection } from "./features/filters/FilterFacetSection";
// AsyncFacetSection - Async paginated filter section (replaces FilterFacetSection for large datasets).
export { AsyncFacetSection } from "./features/filters/AsyncFacetSection";
export type { AsyncFacetSectionProps } from "./features/filters/AsyncFacetSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FilterPanel - Shared export for filter panel.
export { FilterPanel } from "./features/filters/FilterPanel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// RangeFilter - Shared export for range filter.
export { RangeFilter } from "./features/filters/RangeFilter";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SwitchFilter - Shared export for switch filter.
export { SwitchFilter } from "./features/filters/SwitchFilter";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getFilterLabel - Helper for get filter label.
export { getFilterLabel } from "./features/filters/filterUtils";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getFilterValue - Helper for get filter value.
export { getFilterValue } from "./features/filters/filterUtils";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FacetMultiConfig - Type contract for facet multi config.
export type { FacetMultiConfig } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FacetOption - Type contract for facet option.
export type { FacetOption } from "./features/filters/FilterFacetSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FacetSingleConfig - Type contract for facet single config.
export type { FacetSingleConfig } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterConfig - Type contract for filter config.
export type { FilterConfig } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterFacetSectionProps - Type contract for filter facet section props.
export type { FilterFacetSectionProps } from "./features/filters/FilterFacetSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FilterPanelProps - Type contract for filter panel props.
export type { FilterPanelProps } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RangeDateConfig - Type contract for range date config.
export type { RangeDateConfig } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RangeFilterProps - Type contract for range filter props.
export type { RangeFilterProps } from "./features/filters/RangeFilter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RangeNumberConfig - Type contract for range number config.
export type { RangeNumberConfig } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SwitchConfig - Type contract for switch config.
export type { SwitchConfig } from "./features/filters/FilterPanel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SwitchFilterProps - Type contract for switch filter props.
export type { SwitchFilterProps } from "./features/filters/SwitchFilter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UrlTable - Type contract for url table.
export type { UrlTable } from "./features/filters/FilterPanel";
export type { UsePendingFiltersOptions, UsePendingFiltersResult } from "./features/filters/usePendingFilters";
export {
 parseRouteFilterSegments,
 serializeRouteFilterSegments,
 buildFilterUrl,
 extractFilterStateFromParams,
 mergeFilterUpdate,
} from "./features/filters/index";
export type { RouteFilterState } from "./features/filters/routeFilterState";

// ./features/forms/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// INPUT_BASE - Constant used across modules.
export { INPUT_BASE } from "./features/forms/utils";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// INPUT_DISABLED - Constant used across modules.
export { INPUT_DISABLED } from "./features/forms/utils";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// INPUT_ERROR - Constant used across modules.
export { INPUT_ERROR } from "./features/forms/utils";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// INPUT_SUCCESS - Constant used across modules.
export { INPUT_SUCCESS } from "./features/forms/utils";

// AdSlot - Ad placement slot renderer.
export { AdSlot } from "./features/homepage/components/AdSlot";
export type { AdSlotProps } from "./features/homepage/components/AdSlot";
// Ad registry API
export {
  registerAdSlot,
  registerAdSlots,
  getAdSlot,
  getAllAdSlots,
  unregisterAdSlot,
  clearAdRegistry,
  setAdConsentGranted,
  isAdConsentGranted,
  isAdSlotRenderable,
} from "./features/homepage/index";
export type { AdSlotId, AdProvider, AdSlotConfig } from "./features/homepage/ad-registry";
// MarketplaceHomepageView - Server component with optional ad slot injection.
export type {
  MarketplaceHomepageViewProps,
  MarketplaceHomepageViewAdSlots,
} from "./features/homepage/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CharacterHotspot - Shared export for character hotspot.
export { CharacterHotspot } from "./features/homepage/components/CharacterHotspot";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CharacterHotspotForm - Component for character hotspot form.
export { CharacterHotspotForm } from "./features/homepage/components/CharacterHotspotForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CustomerReviewsSection - Shared export for customer reviews section.
export { CustomerReviewsSection } from "./features/homepage/components/CustomerReviewsSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FAQSection - Shared export for faqsection.
export { FAQSection } from "./features/homepage/components/FAQSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HeroCarousel - Shared export for hero carousel.
export { HeroCarousel } from "./features/homepage/components/HeroCarousel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// HowItWorksSection - Shared export for how it works section.
export { HowItWorksSection } from "./features/homepage/components/HowItWorksSection";

// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// NewsletterSection - Shared export for newsletter section.
export { NewsletterSection } from "./features/homepage/components/NewsletterSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PromoGrid - Component for promo grid.
export { PromoGrid } from "./features/homepage/components/PromoGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SectionCarousel - Shared export for section carousel.
export { SectionCarousel } from "./features/homepage/components/SectionCarousel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SecurityHighlightsSection - Shared export for security highlights section.
export { SecurityHighlightsSection } from "./features/homepage/components/SecurityHighlightsSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StatsCounterSection - Shared export for stats counter section.
export { StatsCounterSection } from "./features/homepage/components/StatsCounterSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TestimonialsCarousel - Shared export for testimonials carousel.
export { TestimonialsCarousel } from "./features/homepage/components/TestimonialsCarousel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TrustFeaturesSection - Shared export for trust features section.
export { TrustFeaturesSection } from "./features/homepage/components/TrustFeaturesSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WelcomeSection - Shared export for welcome section.
export { WelcomeSection } from "./features/homepage/components/WelcomeSection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WhatsAppCommunitySection - Shared export for whats app community section.
export { WhatsAppCommunitySection } from "./features/homepage/components/WhatsAppCommunitySection";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBlogArticles - React hook for use blog articles.
export { useBlogArticles } from "./features/homepage/hooks/useBlogArticles";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useFeaturedCollectorDrops - React hook for use featured collector drops.
export { useFeaturedCollectorDrops } from "./features/homepage/hooks/useFeaturedCollectorDrops";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useFeaturedPreOrders - React hook for use featured pre orders.
export { useFeaturedPreOrders } from "./features/homepage/hooks/useFeaturedPreOrders";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useFeaturedProducts - React hook for use featured products.
export { useFeaturedProducts } from "./features/homepage/hooks/useFeaturedProducts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useHeroCarousel - React hook for use hero carousel.
export { useHeroCarousel } from "./features/homepage/hooks/useHeroCarousel";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useHomepageReviews - React hook for use homepage reviews.
export { useHomepageReviews } from "./features/homepage/hooks/useHomepageReviews";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useNewsletter - React hook for use newsletter.
export { useNewsletter } from "./features/homepage/hooks/useNewsletter";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useTopBrands - React hook for use top brands.
export { useTopBrands } from "./features/homepage/hooks/useTopBrands";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useTopCategories - React hook for use top categories.
export { useTopCategories } from "./features/homepage/hooks/useTopCategories";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Banner - Type contract for banner.
export type { Banner } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogListResult - Type contract for blog list result.
export type { BlogListResult } from "./features/homepage/hooks/useBlogArticles";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CarouselSlide - Type contract for carousel slide.
export type { CarouselSlide } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CarouselSlideCard - Type contract for carousel slide card.
export type { CarouselSlideCard } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CharacterHotspotConfig - Type contract for character hotspot config.
export type { CharacterHotspotConfig } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CharacterHotspotFormProps - Type contract for character hotspot form props.
export type { CharacterHotspotFormProps } from "./features/homepage/components/CharacterHotspotForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CharacterHotspotProps - Type contract for character hotspot props.
export type { CharacterHotspotProps } from "./features/homepage/components/CharacterHotspot";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CustomerReviewsSectionProps - Type contract for customer reviews section props.
export type { CustomerReviewsSectionProps } from "./features/homepage/components/CustomerReviewsSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQItem - Type contract for faqitem.
export type { FAQItem } from "./features/homepage/components/FAQSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQSectionProps - Type contract for faqsection props.
export type { FAQSectionProps } from "./features/homepage/components/FAQSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQTab - Type contract for faqtab.
export type { FAQTab } from "./features/homepage/components/FAQSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HeroCarouselProps - Type contract for hero carousel props.
export type { HeroCarouselProps } from "./features/homepage/components/HeroCarousel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HotspotPin - Type contract for hotspot pin.
export type { HotspotPin } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowItWorksInfoDetail - Type contract for how it works info detail.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowItWorksInfoStep - Type contract for how it works info step.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowItWorksInfoViewProps - Type contract for how it works info view props.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowItWorksSectionProps - Type contract for how it works section props.
export type { HowItWorksSectionProps } from "./features/homepage/components/HowItWorksSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HowItWorksStep - Type contract for how it works step.
export type { HowItWorksStep } from "./features/homepage/components/HowItWorksSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NewsletterSectionProps - Type contract for newsletter section props.
export type { NewsletterSectionProps } from "./features/homepage/components/NewsletterSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromoGridProps - Type contract for promo grid props.
export type { PromoGridProps } from "./features/homepage/components/PromoGrid";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SectionCarouselProps - Type contract for section carousel props.
export type { SectionCarouselProps } from "./features/homepage/components/SectionCarousel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SecurityHighlightItem - Type contract for security highlight item.
export type { SecurityHighlightItem } from "./features/homepage/components/SecurityHighlightsSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SecurityHighlightsSectionProps - Type contract for security highlights section props.
export type { SecurityHighlightsSectionProps } from "./features/homepage/components/SecurityHighlightsSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StatsCounterSectionProps - Type contract for stats counter section props.
export type { StatsCounterSectionProps } from "./features/homepage/components/StatsCounterSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SubscribeNewsletterInput - Type contract for subscribe newsletter input.
export type { SubscribeNewsletterInput } from "./features/homepage/hooks/useNewsletter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SubscribeNewsletterResult - Type contract for subscribe newsletter result.
export type { SubscribeNewsletterResult } from "./features/homepage/hooks/useNewsletter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TestimonialsCarouselProps - Type contract for testimonials carousel props.
export type { TestimonialsCarouselProps } from "./features/homepage/components/TestimonialsCarousel";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrustBadge - Type contract for trust badge.
export type { TrustBadge } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrustBadgeIconKey - Type contract for trust badge icon key.
export type { TrustBadgeIconKey } from "./features/homepage/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrustFeatureItem - Type contract for trust feature item.
export type { TrustFeatureItem } from "./features/homepage/components/TrustFeaturesSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrustFeaturesSectionProps - Type contract for trust features section props.
export type { TrustFeaturesSectionProps } from "./features/homepage/components/TrustFeaturesSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseHomepageReviewsOptions - Type contract for use homepage reviews options.
export type { UseHomepageReviewsOptions } from "./features/homepage/hooks/useHomepageReviews";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseNewsletterOptions - Type contract for use newsletter options.
export type { UseNewsletterOptions } from "./features/homepage/hooks/useNewsletter";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WelcomeSectionChip - Type contract for welcome section chip.
export type { WelcomeSectionChip } from "./features/homepage/components/WelcomeSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WelcomeSectionProps - Type contract for welcome section props.
export type { WelcomeSectionProps } from "./features/homepage/components/WelcomeSection";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WhatsAppCommunitySectionProps - Type contract for whats app community section props.
export type { WhatsAppCommunitySectionProps } from "./features/homepage/components/WhatsAppCommunitySection";

// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// carouselGET - Shared export for carousel get.
export { carouselGET } from "./features/homepage/api/carousel/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createHomepageSection - Helper for create homepage section.
export { createHomepageSection } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSectionSchema - Helper for create section schema.
export { createSectionSchema } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteHomepageSection - Helper for delete homepage section.
export { deleteHomepageSection } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getHomepageSectionById - Helper for get homepage section by id.
export { getHomepageSectionById } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listEnabledHomepageSections - Helper for list enabled homepage sections.
export { listEnabledHomepageSections } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listHomepageSections - Helper for list homepage sections.
export { listHomepageSections } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reorderHomepageSections - Shared export for reorder homepage sections.
export { reorderHomepageSections } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateHomepageSection - Helper for update homepage section.
export { updateHomepageSection } from "./features/homepage/actions/homepage-section-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateSectionSchema - Helper for update section schema.
export { updateSectionSchema } from "./features/homepage/actions/homepage-section-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateHomepageSectionInput - Type contract for create homepage section input.
export type { CreateHomepageSectionInput } from "./features/homepage/actions/homepage-section-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateHomepageSectionInput - Type contract for update homepage section input.
export type { UpdateHomepageSectionInput } from "./features/homepage/actions/homepage-section-actions";

// ./features/layout/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AppLayoutShell - Component for app layout shell.
export { AppLayoutShell } from "./features/layout/AppLayoutShell";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AutoBreadcrumbs - Shared export for auto breadcrumbs.
export { AutoBreadcrumbs } from "./features/layout/AutoBreadcrumbs";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BackToTop - Shared export for back to top.
export { BackToTop } from "./features/layout/BackToTop";
// [CLIENT-SSR]-Runs in both SSR and browser — React component or hook that does not depend on browser-only APIs.
// AssistantWidget - the site-wide floating "chat with us" bubble for the customer assistant.
export { AssistantWidget, type AssistantWidgetProps } from "./features/assistant/components/AssistantWidget";
// [CLIENT-SSR]-Runs in both SSR and browser — React component or hook that does not depend on browser-only APIs.
// AssistantPageView - the assistant's dedicated full-chat page, the widget's "expand" target.
export { AssistantPageView } from "./features/assistant/components/AssistantPageView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BottomActions - Shared export for bottom actions. @deprecated — alias of SideActionDock.
export { BottomActions } from "./features/layout/index";
// [CLIENT-SSR]-Runs in both SSR and browser — React component or hook that does not depend on browser-only APIs.
// SideActionDock - The floating action dock that replaced the bottom action bar.
export { SideActionDock } from "./features/layout/index";
// [SHARED]-Pure helper — marks a page's inline primary CTA so the dock reveals only after it scrolls out of view.
export { ctaAnchorProps, CTA_ANCHOR_ATTR } from "./features/layout/cta-anchor";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BottomActionsProvider - Component for bottom actions provider.
export { BottomActionsProvider } from "./features/layout/BottomActionsContext";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BottomNavItem - Model for bottom nav item.
export { BottomNavItem } from "./features/layout/BottomNavItem";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BottomNavLayout - Component for bottom nav layout.
export { BottomNavLayout } from "./features/layout/BottomNavLayout";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BottomNavbar - Shared export for bottom navbar.
export { BottomNavbar } from "./features/layout/BottomNavbar";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// BottomSheet - Shared export for bottom sheet.
export { BottomSheet } from "./features/layout/BottomSheet";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Breadcrumbs - Shared export for breadcrumbs.
export { Breadcrumbs } from "./features/layout/Breadcrumbs";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// DashboardNavProvider - Component for dashboard nav provider.
export { DashboardNavProvider } from "./features/layout/DashboardNavContext";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// FooterLayout - Component for footer layout.
export { FooterLayout } from "./features/layout/FooterLayout";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// LayoutClient - Shared export for layout client.
export { LayoutClient } from "./features/layout/LayoutClient";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// LocaleSwitcher - Shared export for locale switcher.
export { LocaleSwitcher } from "./features/layout/LocaleSwitcher";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MainNavbar - Shared export for main navbar.
export { MainNavbar } from "./features/layout/MainNavbar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// NavbarLayout - Component for navbar layout.
export { NavbarLayout } from "./features/layout/NavbarLayout";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SidebarLayout - Component for sidebar layout.
export { SidebarLayout } from "./features/layout/SidebarLayout";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TitleBar - Shared export for title bar.
export { TitleBar } from "./features/layout/TitleBar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// TitleBarLayout - Component for title bar layout.
export { TitleBarLayout } from "./features/layout/TitleBarLayout";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBottomActions - React hook for use bottom actions.
export { useBottomActions } from "./features/layout/hooks/useBottomActions";
export { RecordStatusTimeline } from "./features/status-history/components/RecordStatusTimeline";

// useFormBottomActions - pins a form's Save/Cancel row + error sheet to the mobile bottom-chrome tier.
export { useFormBottomActions } from "./features/layout/hooks/useFormBottomActions";
export { FormErrorList } from "./ui/forms/FormErrorList";
export { OverlayContext, useIsInsideOverlay } from "./ui/components/overlay-context";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBottomActionsContext - React hook for use bottom actions context.
export { useBottomActionsContext } from "./features/layout/BottomActionsContext";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useDashboardNav - React hook for use dashboard nav.
export { useDashboardNav } from "./features/layout/DashboardNavContext";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AppLayoutShellProps - Type contract for app layout shell props.
export type { AppLayoutShellProps } from "./features/layout/AppLayoutShell";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AutoBreadcrumbsProps - Type contract for auto breadcrumbs props.
export type { AutoBreadcrumbsProps } from "./features/layout/AutoBreadcrumbs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BackToTopProps - Type contract for back to top props.
export type { BackToTopProps } from "./features/layout/BackToTop";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomAction - Type contract for bottom action.
export type { BottomAction } from "./features/layout/BottomActionsContext";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomActionsState - Type contract for bottom actions state.
export type { BottomActionsState } from "./features/layout/BottomActionsContext";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomBulkConfig - Type contract for bottom bulk config.
export type { BottomBulkConfig } from "./features/layout/BottomActionsContext";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomNavItemProps - Type contract for bottom nav item props.
export type { BottomNavItemProps } from "./features/layout/BottomNavItem";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomNavLayoutProps - Type contract for bottom nav layout props.
export type { BottomNavLayoutProps } from "./features/layout/BottomNavLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomNavbarProps - Type contract for bottom navbar props.
export type { BottomNavbarProps } from "./features/layout/BottomNavbar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BottomSheetProps - Type contract for bottom sheet props.
export type { BottomSheetProps } from "./features/layout/BottomSheet";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BreadcrumbItemProps - Type contract for breadcrumb item props.
export type { BreadcrumbItemProps } from "./features/layout/Breadcrumbs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BreadcrumbsProps - Type contract for breadcrumbs props.
export type { BreadcrumbsProps } from "./features/layout/Breadcrumbs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DashboardNavState - Type contract for dashboard nav state.
export type { DashboardNavState } from "./features/layout/DashboardNavContext";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FooterLayoutProps - Type contract for footer layout props.
export type { FooterLayoutProps } from "./features/layout/FooterLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FooterLinkGroup - Type contract for footer link group.
export type { FooterLinkGroup } from "./features/layout/FooterLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FooterSocialLink - Type contract for footer social link.
export type { FooterSocialLink } from "./features/layout/FooterLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FooterBottomLink - Type contract for footer bottom utility links.
export type { FooterBottomLink } from "./features/layout/FooterLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LayoutClientProps - Type contract for layout client props.
export type { LayoutClientProps } from "./features/layout/LayoutClient";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LayoutProvider - Type contract for layout provider.
export type { LayoutProvider } from "./features/layout/LayoutClient";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LocaleSwitcherOption - Type contract for locale switcher option.
export type { LocaleSwitcherOption } from "./features/layout/LocaleSwitcher";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LocaleSwitcherProps - Type contract for locale switcher props.
export type { LocaleSwitcherProps } from "./features/layout/LocaleSwitcher";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MainNavbarItem - Type contract for main navbar item.
export type { MainNavbarItem } from "./features/layout/MainNavbar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MainNavbarProps - Type contract for main navbar props.
export type { MainNavbarProps } from "./features/layout/MainNavbar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NavItemProps - Type contract for nav item props.
export type { NavItemProps } from "./features/layout/NavItem";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NavbarLayoutItem - Type contract for navbar layout item.
export type { NavbarLayoutItem } from "./features/layout/NavbarLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NavbarLayoutProps - Type contract for navbar layout props.
export type { NavbarLayoutProps } from "./features/layout/NavbarLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SidebarLayoutProps - Type contract for sidebar layout props.
export type { SidebarLayoutProps } from "./features/layout/SidebarLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TitleBarLayoutProps - Type contract for title bar layout props.
export type { TitleBarLayoutProps } from "./features/layout/TitleBarLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TitleBarProps - Type contract for title bar props.
export type { TitleBarProps } from "./features/layout/TitleBar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TitleBarUser - Type contract for title bar user.
export type { TitleBarUser } from "./features/layout/TitleBarLayout";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseBottomActionsOptions - Type contract for use bottom actions options.
export type { UseBottomActionsOptions } from "./features/layout/hooks/useBottomActions";

// ./features/media/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// AvatarUpload - Shared export for avatar upload.
export { AvatarUpload } from "./features/media/AvatarUpload";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CameraCapture - Shared export for camera capture.
export { CameraCapture } from "./features/media/index";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// ImageCropModal - Component for image crop modal.
export { ImageCropModal } from "./features/media/modals/ImageCropModal";
// [CLIENT-ONLY]-Cannot run in SSR mode — uses browser-only APIs.
// ImageEditor - Advanced crop/rotate/zoom editor (react-advanced-cropper).
export { ImageEditor } from "./features/media/modals/ImageEditor";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ImageUpload - Shared export for image upload.
export { ImageUpload } from "./features/media/upload/ImageUpload";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaAvatar - Shared export for media avatar.
export { MediaAvatar } from "./features/media/MediaAvatar";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaImage - Shared export for media image.
export { MediaImage } from "./features/media/MediaImage";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaLightbox - Shared export for media lightbox.
export { MediaLightbox } from "./features/media/MediaLightbox";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaSlider - Shared export for media slider.
export { MediaSlider } from "./features/media/components/MediaSlider";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaPickerModal - Modal for picking or uploading a media file.
export type { MediaPickerModalProps } from "./features/media/MediaPickerModal";
export { MediaPickerModal } from "./features/media/MediaPickerModal";
// MediaUploadField - Shared export for media upload field.
export { MediaUploadField } from "./features/media/upload/MediaUploadField";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaUploadList - Shared export for media upload list.
export { MediaUploadList } from "./features/media/upload/MediaUploadList";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MediaVideo - Shared export for media video.
export { MediaVideo } from "./features/media/MediaVideo";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// VideoThumbnailSelector - Shared export for video thumbnail selector.
export { VideoThumbnailSelector } from "./features/media/modals/VideoThumbnailSelector";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// VideoTrimModal - Component for video trim modal.
export { VideoTrimModal } from "./features/media/modals/VideoTrimModal";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaAbort - React hook for use media abort.
export { useMediaAbort } from "./features/media/hooks/useMedia";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaCleanup - React hook for use media cleanup.
export { useMediaCleanup } from "./features/media/hooks/useMedia";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaCrop - React hook for use media crop.
export { useMediaCrop } from "./features/media/hooks/useMedia";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaTrim - React hook for use media trim.
export { useMediaTrim } from "./features/media/hooks/useMedia";
// [CLIENT-ONLY]-Cannot run in SSR mode â€" uses browser-only APIs (window, navigator, localStorage, matchMedia, DOM events) that do not exist in Node.js.
// useMediaUpload - React hook for use media upload.
export { useMediaUpload } from "./features/media/hooks/useMedia";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AvatarUploadProps - Type contract for avatar upload props.
export type { AvatarUploadProps } from "./features/media/AvatarUpload";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CameraCaptureProps - Type contract for camera capture props.
export type { CameraCaptureProps } from "./features/media/upload/CameraCapture";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ImageCropData - Type contract for image crop data.
export type { ImageCropData } from "./features/media/modals/ImageCropModal";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ImageEditorProps - Type contract for image editor props.
export type { ImageEditorProps } from "./features/media/modals/ImageEditor";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ImageCropModalProps - Type contract for image crop modal props.
export type { ImageCropModalProps } from "./features/media/modals/ImageCropModal";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ImageUploadProps - Type contract for image upload props.
export type { ImageUploadProps } from "./features/media/upload/ImageUpload";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LightboxItem - Type contract for lightbox item.
export type { LightboxItem } from "./features/media/MediaLightbox";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// LightboxLabels - Type contract for lightbox labels.
export type { LightboxLabels } from "./features/media/MediaLightbox";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaAvatarProps - Type contract for media avatar props.
export type { MediaAvatarProps } from "./features/media/MediaAvatar";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaCropInput - Type contract for media crop input.
export type { MediaCropInput } from "./features/media/hooks/useMedia";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaImageProps - Type contract for media image props.
export type { MediaImageProps } from "./features/media/MediaImage";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaImageSize - Type contract for media image size.
export type { MediaImageSize } from "./features/media/MediaImage";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaLightboxProps - Type contract for media lightbox props.
export type { MediaLightboxProps } from "./features/media/MediaLightbox";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaSliderProps - Type contract for media slider props.
export type { MediaSliderProps } from "./features/media/components/MediaSlider";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaTrimInput - Type contract for media trim input.
export type { MediaTrimInput } from "./features/media/hooks/useMedia";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaUploadFieldProps - Type contract for media upload field props.
export type { MediaUploadFieldProps } from "./features/media/upload/MediaUploadField";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaUploadListProps - Type contract for media upload list props.
export type { MediaUploadListProps } from "./features/media/upload/MediaUploadList";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaUploadResult - Type contract for media upload result.
export type { MediaUploadResult } from "./features/media/hooks/useMedia";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MediaVideoProps - Type contract for media video props.
export type { MediaVideoProps } from "./features/media/MediaVideo";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// VideoThumbnailSelectorProps - Type contract for video thumbnail selector props.
export type { VideoThumbnailSelectorProps } from "./features/media/modals/VideoThumbnailSelector";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// VideoTrimModalProps - Type contract for video trim modal props.
export type { VideoTrimModalProps } from "./features/media/modals/VideoTrimModal";

// ./features/media/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaArray - Shared export for finalize staged media array.
export { finalizeStagedMediaArray } from "./features/media/finalize";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaField - Shared export for finalize staged media field.
export { finalizeStagedMediaField } from "./features/media/finalize";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaObject - Shared export for finalize staged media object.
export { finalizeStagedMediaObject } from "./features/media/finalize";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaObjectArray - Shared export for finalize staged media object array.
export { finalizeStagedMediaObjectArray } from "./features/media/finalize";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// finalizeStagedMediaUrl - Shared export for finalize staged media url.
export { finalizeStagedMediaUrl } from "./features/media/finalize";

// ./features/orders/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_ORDER_DATA - Constant used across modules.
export { DEFAULT_ORDER_DATA } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ORDER_ADMIN_SORT_OPTIONS - Constant used across modules.
export { ORDER_ADMIN_SORT_OPTIONS } from "./features/orders/components/OrderFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ORDER_COLLECTION - Constant used across modules.
export { ORDER_COLLECTION } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ORDER_FILTER_KEYS - Constant used across modules.
export { ORDER_FILTER_KEYS } from "./features/orders/components/OrderFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ORDER_INDEXED_FIELDS - Constant used across modules.
export { ORDER_INDEXED_FIELDS } from "./features/orders/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ORDER_PUBLIC_FIELDS - Constant used across modules.
export { ORDER_PUBLIC_FIELDS } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ORDER_SELLER_SORT_OPTIONS - Constant used across modules.
export { ORDER_SELLER_SORT_OPTIONS } from "./features/orders/components/OrderFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// ORDER_UPDATABLE_FIELDS - Constant used across modules.
export { ORDER_UPDATABLE_FIELDS } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ORDER_USER_SORT_OPTIONS - Constant used across modules.
export { ORDER_USER_SORT_OPTIONS } from "./features/orders/components/OrderFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OrderCard - Component for order card.
export { OrderCard } from "./features/orders/components/OrdersList";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OrderFilters - Shared export for order filters.
export { OrderFilters } from "./features/orders/components/OrderFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OrderStatusValues - Model for order status values.
export { OrderStatusValues } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OrdersList - Shared export for orders list.
export { OrdersList } from "./features/orders/components/OrdersList";
export { OrderSiblingPayments } from "./features/orders/components/OrderSiblingPayments";
export type { OrderSiblingPaymentsProps } from "./features/orders/components/OrderSiblingPayments";
export { OrderPaymentSummary } from "./features/orders/components/OrderPaymentSummary";
export type { OrderPaymentSummaryProps } from "./features/orders/components/OrderPaymentSummary";
export { OrderStatusTimeline } from "./features/orders/components/OrderStatusTimeline";
// OrderProvenanceCard — renders sourceContext, the record of HOW the buyer
// earned this price. Mounted on the buyer, seller AND admin order detail.
export { OrderProvenanceCard } from "./features/orders/components/OrderProvenanceCard";
export type { OrderProvenanceCardProps } from "./features/orders/components/OrderProvenanceCard";
// OrderCompletionPanel - Per-line ratings + Mark complete, the buyer's fast path.
export { OrderCompletionPanel } from "./features/orders/components/OrderCompletionPanel";
// [CLIENT] StatusTimeline — the ONE rail both orders and offers render.
// Each feature supplies only its phase vocabulary; the never-fabricate-a-
// timestamp rule and the dot/connector rail live in one place.
export { StatusTimeline, stepsFromEntries } from "./features/status-history/components/StatusTimeline";
export type { StatusTimelineProps, TimelineEntry, TimelineStep } from "./features/status-history/components/StatusTimeline";
export { OfferPhaseTimeline } from "./features/seller/components/OfferPhaseTimeline";
export type { OfferPhaseTimelineProps, OfferChainRound } from "./features/seller/components/OfferPhaseTimeline";
export type { OrderStatusTimelineProps } from "./features/orders/components/OrderStatusTimeline";
export type { OrderCompletionPanelProps, RateableLine } from "./features/orders/components/OrderCompletionPanel";
export type {
  OrderPaymentRecord,
  OrderPaymentRecordMethod,
  OrderPaymentVerificationMethod,
} from "./features/orders/index";
export { RefundHistoryTable } from "./features/orders/components/RefundHistoryTable";
export type { RefundHistoryTableProps } from "./features/orders/components/RefundHistoryTable";
export { RefundRequestView } from "./features/orders/components/RefundRequestView";
export type { RefundRequestViewProps } from "./features/orders/components/RefundRequestView";
export type { RefundRequestSubmission } from "./features/orders/components/RefundRequestView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PaymentMethodValues - Model for payment method values.
export { PaymentMethodValues } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OutOfStockPolicyValues - Model for the buyer-chosen out-of-stock checkout policy values.
export { OutOfStockPolicyValues } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OutOfStockPolicy - Type contract for the buyer-chosen out-of-stock checkout policy.
export type { OutOfStockPolicy } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PaymentStatusValues - Model for payment status values.
export { PaymentStatusValues } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// RefundStatusValues - Model for refund status values.
export { RefundStatusValues } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ShippingMethodValues - Model for shipping method values.
export { ShippingMethodValues } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildOrderColumns - Helper for build order columns.
export { buildOrderColumns } from "./features/orders/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createOrderId - Helper for create order id.
export { createOrderId } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getOrderFilterKeys - Helper for get order filter keys.
export { getOrderFilterKeys } from "./features/orders/components/OrderFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getOrderSortOptions - Helper for get order sort options.
export { getOrderSortOptions } from "./features/orders/components/OrderFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderAdminColumns - Shared export for order admin columns.
export { orderAdminColumns } from "./features/orders/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderItemSchema - Model for order item schema.
export { orderItemSchema } from "./features/orders/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderListParamsSchema - Model for order list params schema.
export { orderListParamsSchema } from "./features/orders/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderQueryHelpers - Shared export for order query helpers.
export { orderQueryHelpers } from "./features/orders/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderSchema - Model for order schema.
export { orderSchema } from "./features/orders/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderStatusSchema - Model for order status schema.
export { orderStatusSchema } from "./features/orders/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// orderTimelineSchema - Model for order timeline schema.
export { orderTimelineSchema } from "./features/orders/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useOrder - React hook for use order.
export { useOrder } from "./features/orders/hooks/useOrders";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useOrders - React hook for use orders.
export { useOrders } from "./features/orders/hooks/useOrders";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useTrackOrder - React hook for use track order.
export { useTrackOrder } from "./features/orders/hooks/useOrders";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Order - Type contract for order.
export type { Order } from "./features/orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderAdminUpdateInput - Type contract for order admin update input.
export type { OrderAdminUpdateInput } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// AppliedOrderDiscount - Type contract for applied order discount.
export type { AppliedOrderDiscount } from "./features/orders/schemas/firestore";
// OrderCreateInput - Type contract for order create input.
export type { OrderCreateInput } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderDocument - Type contract for order document.
export type { OrderDocument } from "./features/orders/schemas/firestore";
// OrderSourceContext — the provenance union. Public because
// `OrderProvenanceCardProps` takes it, so a consumer passing that prop needs
// to be able to name the type.
export type { OrderSourceContext } from "./features/orders/schemas/firestore";
export type { OrderRefundEvent, RefundType } from "./features/orders/schemas/firestore";
// Manual-payment (cash / UPI / EMI) shared constants + the payment-review
// queue discriminator. Pure data + predicates — no firebase-admin in the
// import chain, so safe on the main barrel (see "appkit Export Rules").
export {
  MANUAL_PAYMENT_METHODS,
  isManualPaymentMethod,
  PAYMENT_REVIEW_QUEUE_MODES,
  isPaymentReviewQueueMode,
  PAYMENT_REVIEW_QUEUE_SCAN_LIMIT,
} from "./features/orders/constants/payment-window";
export type { PaymentReviewQueueMode } from "./features/orders/constants/payment-window";
/*
 * The order status machine. Safe in the MAIN barrel — `constants/transitions.ts`
 * imports only a type from `../types/index`, so its chain never reaches
 * `providers/db-firebase` and therefore never reaches `firebase-admin`
 * (Root Cause #6/#24). The guard that consumes it lives in the repository,
 * which stays server-only; these are the pure predicates a client surface can
 * legitimately use to decide which status buttons to render.
 */
export {
  ORDER_STATUS_TRANSITIONS,
  ORDER_TERMINAL_STATUSES,
  isLegalOrderTransition,
  describeIllegalTransition,
} from "./features/orders/constants/transitions";

/*
 * Obligations — the PURE half only.
 *
 * `deadlinesFor(order)` is a pure function over the policy registry with no
 * reads and no writes, which is the entire reason deadlines are derived rather
 * than stored: a buyer or seller page renders "Dispatch by Thu 3 Nov" from an
 * order it already has. Safe in the main barrel because nothing here reaches
 * `providers/db-firebase` — the repository does, and stays in `server.ts`.
 */
export {
  OBLIGATION_POLICIES,
  durationToMinutes,
} from "./features/obligations/constants/policies";
export type {
  ObligationPolicy,
  Duration,
  DurationUnit,
} from "./features/obligations/constants/policies";
export {
  OBLIGATIONS_COLLECTION,
  OBLIGATION_FIELDS,
  ALL_OBLIGATION_KINDS,
  createObligationId,
} from "./features/obligations/schemas/firestore";
export type {
  ObligationDocument,
  ObligationKind,
  ObligationState,
  ObligationDueAction,
} from "./features/obligations/schemas/firestore";
export {
  deadlinesFor,
  resolveDueAt,
  reconcileObligations,
} from "./_internal/shared/obligations/deadlines";
export type { ResolvedDeadline } from "./_internal/shared/obligations/deadlines";
export {
  ORDER_SCOPE_VALUES,
  ORDER_SCOPE_TABS,
  isOrderScope,
  statusesForScope,
  mergeOrderScopeFilter,
} from "./features/orders/constants/order-scope";
export type { OrderScope } from "./features/orders/constants/order-scope";

// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderDocumentItem - Type contract for order document item.
export type { OrderDocumentItem } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderFilterVariant - Type contract for order filter variant.
export type { OrderFilterVariant } from "./features/orders/components/OrderFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderFiltersProps - Type contract for order filters props.
export type { OrderFiltersProps } from "./features/orders/components/OrderFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderListParams - Type contract for order list params.
export type { OrderListParams } from "./features/orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderListResponse - Type contract for order list response.
export type { OrderListResponse } from "./features/orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderPayoutStatus - Type contract for order payout status.
export type { OrderPayoutStatus } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderTimeline - Type contract for order timeline.
export type { OrderTimeline } from "./features/orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderUpdateInput - Type contract for order update input.
export type { OrderUpdateInput } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RefundStatus - Type contract for refund status.
export type { RefundStatus } from "./features/orders/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ShippingMethod - Type contract for shipping method.
export type { ShippingMethod } from "./features/orders/schemas/firestore";

// ./features/orders/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// cancelOrderForUser - Shared export for cancel order for user.
export { cancelOrderForUser } from "./features/orders/actions/order-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// cancelOrderItemsForUser - Cancels a subset of line items on an order and continues with the rest.
export { cancelOrderItemsForUser } from "./features/orders/actions/order-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getOrderByIdForUser - Helper for get order by id for user.
export { getOrderByIdForUser } from "./features/orders/actions/order-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getOrderTrackingHandler - Helper for get order tracking handler.
export { GET as getOrderTrackingHandler } from "./features/orders/api/track/[trackingId]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getTrackingInfo - Helper for get tracking info.
export { getTrackingInfo } from "./features/orders/actions/order-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// issuePartialRefund - Shared export for issue partial refund.
export { issuePartialRefund } from "./features/orders/actions/refund-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listOrdersForUser - Helper for list orders for user.
export { listOrdersForUser } from "./features/orders/actions/order-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// previewCancellationRefund - Shared export for preview cancellation refund.
export { previewCancellationRefund } from "./features/orders/actions/refund-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PartialRefundResult - Type contract for partial refund result.
export type { PartialRefundResult } from "./features/orders/actions/refund-actions";

// ./features/payments/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_PAYOUT_DATA - Constant used across modules.
export { DEFAULT_PAYOUT_DATA } from "./features/payments/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_PLATFORM_FEE_RATE - Constant used across modules.
export { DEFAULT_PLATFORM_FEE_RATE } from "./features/payments/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PAYOUT_ADMIN_UPDATEABLE_FIELDS - Constant used across modules.
export { PAYOUT_ADMIN_UPDATEABLE_FIELDS } from "./features/payments/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PAYOUT_COLLECTION - Constant used across modules.
export { PAYOUT_COLLECTION } from "./features/payments/schemas/firestore";
// SHIPMENT_COLLECTION / SHIPMENT_LOT_COLLECTION / SHIPMENT_ITEM_COLLECTION - procurement shipments collections.
export {
  SHIPMENT_COLLECTION,
  SHIPMENT_LOT_COLLECTION,
  SHIPMENT_ITEM_COLLECTION,
  SHIPMENT_FIELDS,
  SHIPMENT_LOT_FIELDS,
  SHIPMENT_ITEM_FIELDS,
  SHIPMENT_STATUS_VALUES,
  DEFAULT_SHIPMENT_TOTALS,
  MAX_ITEMS_PER_LOT,
  MAX_LOTS_PER_SHIPMENT,
  createShipmentId,
  shipmentQueryHelpers,
} from "./features/shipments/index";
export type {
  ShipmentDocument,
  ShipmentLot,
  ShipmentItem,
  ShipmentStatus,
  ShipmentTotals,
  ShipmentCreateInput,
  ShipmentUpdateInput,
  ShipmentLotCreateInput,
  ShipmentLotUpdateInput,
  ShipmentItemCreateInput,
  ShipmentItemUpdateInput,
  ProductDraftFields,
} from "./features/shipments/index";
export {
  createShipmentSchema,
  updateShipmentSchema,
  createShipmentLotSchema,
  updateShipmentLotSchema,
  createShipmentItemSchema,
  updateShipmentItemSchema,
  bulkShipmentItemsSchema,
} from "./features/shipments/index";
export { allocateShipmentCosts } from "./features/shipments/utils/cost-allocation";
export type { AllocateShipmentCostsInput, AllocateShipmentCostsResult, LotAllocationInput, LotAllocationResult } from "./features/shipments/utils/cost-allocation";
export { AdminShipmentsView } from "./features/shipments/components/AdminShipmentsView";
export type { AdminShipmentsViewProps } from "./features/shipments/components/AdminShipmentsView";
export { AdminShipmentEditorView } from "./features/shipments/components/AdminShipmentEditorView";
export type { AdminShipmentEditorViewProps } from "./features/shipments/components/AdminShipmentEditorView";
export { AdminShipmentLotItemsView } from "./features/shipments/components/AdminShipmentLotItemsView";
export type { AdminShipmentLotItemsViewProps } from "./features/shipments/components/AdminShipmentLotItemsView";
export { AdminShipmentProjectionsView } from "./features/shipments/components/AdminShipmentProjectionsView";
export {
  useShipments,
  useShipment,
  useShipmentItems,
  useShipmentProjections,
} from "./features/shipments/index";
export type {
  UseShipmentsParams,
  UseShipmentItemsParams,
  UseShipmentProjectionsParams,
} from "./features/shipments/index";
export {
  CATALOGUE_COLLECTION,
  CATALOGUE_FIELDS,
  CATALOGUE_IMAGE_FRESHNESS_DAYS,
  createCatalogueItemId,
} from "./features/catalogue/index";
export type {
  CatalogueItemDocument,
  CatalogueVisibility,
  CatalogueOwnerRole,
  CatalogueListingStatus,
  CatalogueItemCreateInput,
  CatalogueItemUpdateInput,
} from "./features/catalogue/index";
export {
  createCatalogueItemSchema,
  updateCatalogueItemSchema,
} from "./features/catalogue/index";
export { assertCatalogueImagesFresh } from "./features/catalogue/utils/freshness";
export { listFromCatalogueAction } from "./features/catalogue/actions/list-from-catalogue";
export { submitCatalogueItemForApprovalAction } from "./features/catalogue/actions/submit-for-approval";
export {
  approveCatalogueListingAction,
  rejectCatalogueListingAction,
} from "./features/catalogue/index";
export { UserCatalogueView } from "./features/catalogue/components/UserCatalogueView";
export type { UserCatalogueViewProps } from "./features/catalogue/components/UserCatalogueView";
export { CatalogueItemEditorView } from "./features/catalogue/components/CatalogueItemEditorView";
export type { CatalogueItemEditorViewProps } from "./features/catalogue/components/CatalogueItemEditorView";
export { PublicCatalogueView } from "./features/catalogue/components/PublicCatalogueView";
export type { PublicCatalogueViewProps } from "./features/catalogue/components/PublicCatalogueView";
export { PublicCatalogueItemDetailView } from "./features/catalogue/components/PublicCatalogueItemDetailView";
export type { PublicCatalogueItemDetailViewProps } from "./features/catalogue/components/PublicCatalogueItemDetailView";
export { AdminCatalogueApprovalsView } from "./features/catalogue/components/AdminCatalogueApprovalsView";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PAYOUT_FIELDS - Constant used across modules.
export { PAYOUT_FIELDS } from "./features/payments/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PAYOUT_INDEXED_FIELDS - Constant used across modules.
export { PAYOUT_INDEXED_FIELDS } from "./features/payments/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PAYOUT_PUBLIC_FIELDS - Constant used across modules.
export { PAYOUT_PUBLIC_FIELDS } from "./features/payments/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PayoutStatusValues - Model for payout status values.
export { PayoutStatusValues } from "./features/payments/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildPaymentColumns - Helper for build payment columns.
export { buildPaymentColumns } from "./features/payments/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createPayoutId - Helper for create payout id.
export { createPayoutId } from "./features/payments/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// paymentAdminColumns - Shared export for payment admin columns.
export { paymentAdminColumns } from "./features/payments/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// payoutQueryHelpers - Shared export for payout query helpers.
export { payoutQueryHelpers } from "./features/payments/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// payoutStatusSchema - Model for payout status schema.
export { payoutStatusSchema } from "./features/payments/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePaymentEvent - React hook for use payment event.
export { usePaymentEvent } from "./features/payments/hooks/usePaymentEvent";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePaymentSettings - React hook for use payment settings.
export { usePaymentSettings } from "./features/payments/hooks/usePayments";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentEventStatus - Type contract for payment event status.
export type { PaymentEventStatus } from "./features/payments/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentGatewayConfig - Type contract for payment gateway config.
export type { PaymentGatewayConfig } from "./features/payments/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentRecord - Type contract for payment record.
export type { PaymentRecord } from "./features/payments/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PaymentSettings - Type contract for payment settings.
export type { PaymentSettings } from "./features/payments/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutBankAccount - Type contract for payout bank account.
export type { PayoutBankAccount } from "./features/payments/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutCreateInput - Type contract for payout create input.
export type { PayoutCreateInput } from "./features/payments/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutDocument - Type contract for payout document.
export type { PayoutDocument } from "./features/payments/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutRefundDeduction - Type contract for payout refund deduction entry.
export type { PayoutRefundDeduction } from "./features/payments/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutPaymentMethod - Type contract for payout payment method.
export type { PayoutPaymentMethod } from "./features/payments/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutUpdateInput - Type contract for payout update input.
export type { PayoutUpdateInput } from "./features/payments/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UsePaymentEventOptions - Type contract for use payment event options.
export type { UsePaymentEventOptions } from "./features/payments/hooks/usePaymentEvent";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UsePaymentEventReturn - Type contract for use payment event return.
export type { UsePaymentEventReturn } from "./features/payments/hooks/usePaymentEvent";

// ./features/payments/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// PaymentsRepository - Shared export for payments repository.
export { PaymentsRepository } from "./features/payments/repository/payments.repository";

// ./features/pre-orders/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// MarketplacePreorderCard - Component for marketplace preorder card.
export { MarketplacePreorderCard } from "./features/pre-orders/components/MarketplacePreorderCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PreorderBadge - Component for preorder badge.
export { PreorderBadge } from "./features/pre-orders/components/PreorderCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [SERVER-RSC]-Self-fetching index/detail page views for pre-orders.
export { PreOrdersIndexListing } from "./features/pre-orders/components/PreOrdersIndexListing";
export type { PreOrdersIndexListingProps } from "./features/pre-orders/components/PreOrdersIndexListing";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildPreorderColumns - Helper for build preorder columns.
export { buildPreorderColumns } from "./features/pre-orders/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getPreorderStatus - Helper for get preorder status.
export { getPreorderStatus } from "./features/pre-orders/types/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// preorderAdminColumns - Shared export for preorder admin columns.
export { preorderAdminColumns } from "./features/pre-orders/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// preorderItemSchema - Model for preorder item schema.
export { preorderItemSchema } from "./features/pre-orders/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePreorder - React hook for use preorder.
export { usePreorder } from "./features/pre-orders/hooks/usePreOrders";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePreorders - React hook for use preorders.
export { usePreorders } from "./features/pre-orders/hooks/usePreOrders";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplacePreorderCardData - Type contract for marketplace preorder card data.
export type { MarketplacePreorderCardData } from "./features/pre-orders/components/MarketplacePreorderCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplacePreorderCardLabels - Type contract for marketplace preorder card labels.
export type { MarketplacePreorderCardLabels } from "./features/pre-orders/components/MarketplacePreorderCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MarketplacePreorderCardProps - Type contract for marketplace preorder card props.
export type { MarketplacePreorderCardProps } from "./features/pre-orders/components/MarketplacePreorderCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PreOrderItem - Type contract for pre order item.
export type { PreOrderItem } from "./features/pre-orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PreOrderStatus - Type contract for pre order status.
export type { PreOrderStatus } from "./features/pre-orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PreorderItem - Type contract for preorder item.
export type { PreorderItem } from "./features/pre-orders/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PreorderStatus - Type contract for preorder status.
export type { PreorderStatus } from "./features/pre-orders/types/index";

// ./features/pre-orders/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// preOrdersGET - Shared export for pre orders get.
export { GET as preOrdersGET } from "./features/pre-orders/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// preOrdersPOST - Shared export for pre orders post.
export { POST as preOrdersPOST } from "./features/pre-orders/api/route";

// ./features/products/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CollectorDropDetailView - Component for collector drop detail view.
export { CollectorDropDetailView } from "./features/products/components/CollectorDropDetailView";
// [SERVER-RSC]-Self-fetching detail page view for collector drops.
// [SERVER-RSC]-Self-fetching index page view for collector drops.
// [SERVER-RSC]-Self-fetching index page view for `/bundles` (categoryType:"bundle" rows).
export type { BundlesListViewProps } from "./features/categories/components/BundlesListView";

// S-SBUNI-3 2026-05-13 â€" public bundle detail view (rebuilt after SB-UNI-V deletion).
export { BundleDetailView } from "./features/categories/components/BundleDetailView";
export type { BundleDetailViewProps } from "./features/categories/components/BundleDetailView";
export { BundleCollage } from "./features/categories/components/BundleCollage";
export type { BundleCollageProps } from "./features/categories/components/BundleCollage";
// S-SBUNI-5 2026-05-13 â€" functional Add-to-cart CTA client island.
export { BundleBuyNowCta } from "./features/categories/components/BundleBuyNowCta";
export type { BundleBuyNowCtaProps } from "./features/categories/components/BundleBuyNowCta";
// CategoryBundlesListing is also re-exported lower in this file (line ~8871);
// the canonical export lives there next to BUNDLE_MIN_ITEMS / BUNDLE_MAX_ITEMS.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// BidHistory - Shared export for bid history.
export { BidHistory } from "./features/products/components/BidHistory";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_PRODUCT_DATA - Constant used across modules.
export { DEFAULT_PRODUCT_DATA } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// InteractiveProductCard - Component for interactive product card.
export { InteractiveProductCard } from "./features/products/components/InteractiveProductCard";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ACTION_ID / ACTION_META / DETAIL_ACTIONS / MOBILE_PRIMARY_ACTIONS / LISTING_BULK_ACTIONS - Single source of truth for all product-type action constants.
// Product / listing actions
export { ACTION_ID, ACTION_META, DETAIL_ACTIONS, MOBILE_PRIMARY_ACTIONS, LISTING_BULK_ACTIONS } from "./features/products/constants/action-defs";
export type { ActionId, ActionMeta, ActionVariant } from "./features/products/constants/action-defs";
// Row / table actions (admin, seller, user dashboards)
export { ROW_ACTION_ID, ROW_ACTION_META, ADMIN_ROW_ACTIONS, SELLER_ROW_ACTIONS, USER_ROW_ACTIONS, ADMIN_BULK_ACTIONS, SELLER_BULK_ACTIONS } from "./features/products/constants/action-defs";
export type { RowActionId, RowActionMeta } from "./features/products/constants/action-defs";
// Form shell actions
export { FORM_ACTION_ID, FORM_ACTION_META, FORM_FOOTER_PRESET } from "./features/products/constants/action-defs";
export type { FormActionId, FormActionMeta } from "./features/products/constants/action-defs";
// Dashboard quick actions
export { DASHBOARD_QUICK_ACTION_ID, DASHBOARD_QUICK_ACTION_META, DASHBOARD_QUICK_ACTIONS } from "./features/products/constants/action-defs";
export type { DashboardQuickActionId, DashboardQuickActionMeta } from "./features/products/constants/action-defs";
// Action dispatch hook + panel store
export { useActionDispatch } from "./react/hooks/use-action-dispatch";
export type { DispatchAction, UseActionDispatchOptions } from "./react/hooks/use-action-dispatch";
export { usePanelStore } from "./stores/panel-store";
export { usePanelUrlSync } from "./react/hooks/use-panel-url-sync";
export type { PanelUrlSync } from "./react/hooks/use-panel-url-sync";
// PRODUCT_ADMIN_SORT_OPTIONS - Constant used across modules.
export { PRODUCT_ADMIN_SORT_OPTIONS } from "./features/products/components/ProductFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PRODUCT_COLLECTION - Constant used across modules.
export { PRODUCT_COLLECTION } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PRODUCT_FILTER_KEYS - Constant used across modules.
export { PRODUCT_FILTER_KEYS } from "./features/products/components/ProductFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PRODUCT_INDEXED_FIELDS - Constant used across modules.
export { PRODUCT_INDEXED_FIELDS } from "./features/products/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PRODUCT_PUBLIC_FIELDS - Constant used across modules.
export { PRODUCT_PUBLIC_FIELDS } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PRODUCT_PUBLIC_SORT_OPTIONS - Constant used across modules.
export { PRODUCT_PUBLIC_SORT_OPTIONS } from "./features/products/components/ProductFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PRODUCT_SELLER_SORT_OPTIONS - Constant used across modules.
export { PRODUCT_SELLER_SORT_OPTIONS } from "./features/products/components/ProductFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PRODUCT_SORT_VALUES - Constant used across modules.
export { PRODUCT_SORT_VALUES } from "./features/products/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PRODUCT_STATUS_OPTIONS - Constant used across modules.
export { PRODUCT_STATUS_OPTIONS } from "./features/products/components/ProductForm";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// PRODUCT_UPDATABLE_FIELDS - Constant used across modules.
export { PRODUCT_UPDATABLE_FIELDS } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PlaceBidForm - Component for place bid form.
export { PlaceBidForm } from "./features/products/components/PlaceBidForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PreOrderDetailView - Component for pre order detail view.
export { PreOrderDetailView } from "./features/products/components/PreOrderDetailView";
// [SERVER-RSC]-Public listing for random-lots products (SB4-F).
export type { RandomLotsListingViewProps } from "./features/products/components/RandomLotsListingView";
// [CLIENT]-Client toolbar+grid for random lots (SB4-F).
export { RandomLotsIndexListing } from "./features/products/components/RandomLotsIndexListing";
export type { RandomLotsIndexListingProps } from "./features/products/components/RandomLotsIndexListing";
// [CLIENT]-Marketplace card for random lots (SB4-F).
export { MarketplaceRandomLotCard } from "./features/products/components/MarketplaceRandomLotCard";
export type {
 MarketplaceRandomLotCardProps,
 MarketplaceRandomLotCardData,
 MarketplaceRandomLotCardLabels,
} from "./features/products/index";
// [SERVER-RSC]-Public detail page for a random-lots product (SB4-G).
export type { RandomLotsDetailPageViewProps } from "./features/products/components/RandomLotsDetailPageView";
// [CLIENT]-Buy panel client for random-lots detail (consent + add-to-cart) (SB4-G).
export { RandomLotsEntryActions } from "./features/products/components/RandomLotsEntryActions";
export type { RandomLotsEntryActionsProps } from "./features/products/components/RandomLotsEntryActions";
// [CLIENT]-Theatrical reveal-mode random-lots modal (SB4-I) — fully-automatic reveal, animates to the winning slot.
export { PrizeRevealModal } from "./features/products/components/PrizeRevealModal";
export type { PrizeRevealModalProps, PrizeRevealResult } from "./features/products/components/PrizeRevealModal";
export { RandomLotsWinnerMappingView } from "./features/products/components/RandomLotsWinnerMappingView";
export type {
  RandomLotsWinnerMappingViewProps,
  RandomLotsWinnerMappingRow,
} from "./features/products/components/RandomLotsWinnerMappingView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductCard - Component for product card.
export { ProductCard } from "./features/products/components/ProductGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductDetailView - Component for product detail view.
export { ProductDetailView } from "./features/products/components/ProductDetailView";
// [SERVER-RSC]-Self-fetching detail page view for products.
export type { ProductDetailPageViewProps } from "./features/products/components/ProductDetailPageView";
// [CLIENT]-Share button with native Web Share API + clipboard fallback.
export { ShareButton } from "./features/products/components/ShareButton";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductFeatureBadges - Shared export for product feature badges.
export { ProductFeatureBadges } from "./features/products/components/ProductFeatureBadges";
// FeatureBadge / FeatureBadgeList - productFeatures-backed pill badges (FI6).
export { FeatureBadge, FeatureBadgeList } from "./features/products/components/FeatureBadge";
export type { FeatureBadgeProps, FeatureBadgeListProps } from "./features/products/components/FeatureBadge";
// ProductFeaturesProvider / useProductFeatures - context for ProductCard feature badges (FI6).
export { ProductFeaturesProvider, useProductFeatures } from "./features/products/components/ProductFeaturesContext";
export type { ProductFeaturesProviderProps } from "./features/products/components/ProductFeaturesContext";
// ProductFeaturesSelector - product-form checkbox grid (FI5).
export { ProductFeaturesSelector } from "./features/products/components/ProductFeaturesSelector";
export type { ProductFeaturesSelectorProps } from "./features/products/components/ProductFeaturesSelector";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductFilters - Shared export for product filters.
export { ProductFilters } from "./features/products/components/ProductFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductForm - Component for product form.
export { ProductForm } from "./features/products/components/ProductForm";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductGrid - Component for product grid.
export { ProductGrid } from "./features/products/components/ProductGrid";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductInfo - Shared export for product info.
export { ProductInfo } from "./features/products/components/ProductInfo";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductStatusValues - Model for product status values.
export { ProductStatusValues } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductTabs - Component for product tabs.
export { ProductTabs } from "./features/products/components/ProductTabs";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ProductsIndexPageView - Component for products index page view.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// RelatedProducts - Shared export for related products.
export { RelatedProducts } from "./features/products/components/RelatedProducts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildProductColumns - Helper for build product columns.
export { buildProductColumns } from "./features/products/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createCollectorDropId - Helper for create collector drop id.
export { createCollectorDropId } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createPreOrderId - Helper for create pre order id.
export { createPreOrderId } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createProductId - Helper for create product id.
export { createProductId } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getProductFilterKeys - Helper for get product filter keys.
export { getProductFilterKeys } from "./features/products/components/ProductFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getProductSortOptions - Helper for get product sort options.
export { getProductSortOptions } from "./features/products/components/ProductFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getProductTableColumns - Helper for get product table columns.
export { getProductTableColumns } from "./features/products/columns/productTableColumns";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// normalizeListingType + predicate helpers â€" canonical SB1-G accessors.
// SB-UNI-F 2026-05-13 â€" Phase 2 predicates added (classified/digital-code/live).
export {
 normalizeListingType,
 isCollectorDropListing,
 isPreOrderListing,
 isStandardListing,
 isRandomLotListing,
 isClassifiedListing,
 isDigitalCodeListing,
 isLiveListing,
 isArtListing,
 isStickersListing,
} from "./features/products/index";
// Final sale — ABSENT MEANS TRUE, so these are the only legal reads of the
// `finalSale` field. See the module docstring for why `!p.finalSale` is wrong.
export {
  isFinalSale,
  acceptsChangeOfMindReturns,
} from "./features/products/constants/final-sale";
// SB-UNI-X4 2026-05-13 â€" per-type feature-flag helpers.
export {
  isListingTypeEnabled,
  isCategoryTypeEnabled,
  enabledListingTypes,
  enabledCategoryTypes,
  ALL_LISTING_TYPES,
  isListingType,
  // Browse-section gates — /categories, /brands, /franchise, /stores.
  // Exported HERE rather than from server.ts for the reason given in that
  // file's ALL_LISTING_TYPES note: `server-entry.ts` re-exports index, so a
  // Server Component already reaches these from the bare specifier and a
  // second path would leak an `_internal/` symbol through a third barrel.
  isBrowsePageEnabled,
  enabledBrowsePages,
  ALL_BROWSE_PAGES,
  isBrowsePageKey,
  // Auto-hide gates — same barrel choice as the browse-section ones above.
  isListingSurfaceVisible,
  isCountedSurfaceVisible,
  visibleListingTypes,
} from "./_internal/shared/listing-types/feature-flags";
export type {
  BrowsePageKey,
  SurfaceCountSnapshot,
} from "./_internal/shared/listing-types/feature-flags";
// Basic/advanced listing-type split — which types a store may create.
// Pure (no firebase-admin in its import chain), so it is safe in index.ts.
export {
  ADVANCED_LISTING_TYPE_CAPABILITY,
  ADVANCED_LISTING_TYPES,
  BASIC_LISTING_TYPES,
  LISTING_TYPE_TIER,
  assertListingTypeAllowed,
  hasAdvancedListingTypes,
  isAdvancedListingType,
  isListingTypeAllowedFor,
  listingTypesAllowedFor,
} from "./_internal/shared/listing-types/tiers";
export type {
  ListingTypeAccessContext,
  ListingTypeTier,
} from "./_internal/shared/listing-types/tiers";
// SB-UNI-X5 2026-05-13 â€" action telemetry sink.
export {
 actionTracker,
 setActionTrackerSink,
 resetActionTrackerSink,
 type ActionEvent,
 type ActionTrackerSink,
} from "./_internal/shared/listing-types/action-tracker";
// SB-UNI-S 2026-05-13 â€" cart-level shipping-requirement helpers.
export {
  cartRequiresShipping,
  cartIsDigitalOnly,
  cartIsChatOnly,
} from "./_internal/shared/listing-types/cart-shipping";
// SB-UNI-W-1 2026-05-13 â€" CTA action registry shell.
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
// Shared fee calculator — platform/gateway/GST/COD handling/WhatsApp-addon fee math (pure, client-safe).
export {
  computeCheckoutFees,
  // The per-group split of the ONE capped commission. Exported for the capture
  // route's points tender: the tender is applied per order group against the
  // same base the order path uses, and that base includes this share. Without
  // it the route would have to re-derive the apportionment — and the allocator
  // also carries the `minimumTransactionFee` floor (D41), which already spent
  // a release being re-implemented by hand in that very file.
  allocateCheckoutFees,
  computePayoutDeduction,
  computeCodHandlingFee,
  computeWhatsAppNotifyFee,
  computeGiftWrapFee,
  computeShipmentProtectionFee,
  computeSaleProtectionFee,
  calculateGst,
} from "./_internal/shared/fees/calculator";
// C5e buyer protections — the pure three-tier gate plus the one fee pair
// every money path must agree on. Public API because the capture route
// (/api/payment/create-order) is one of the three sites that must agree.
// The realised-price search tool (C1 + the search-first redirect). SERVER
// only: it reads Firestore through two repositories, so it must never reach
// client.ts (verify-entries would catch firebase-admin, but the import chain
// is the thing to keep clean — Root Cause #6).
export { searchPriceIndex, PRICE_INDEX_SEARCH_LIMIT, PRICE_INDEX_MIN_QUERY_LENGTH } from "./_internal/server/features/price-index/search";
export type {
  PriceIndexSearchResponse,
  PriceIndexSearchResult,
  PriceIndexSearchResultBand,
} from "./_internal/server/features/price-index/search";
export {
  protectionAvailability,
  computeProtectionFees,
  adjudicateClaim,
  badgesFor,
  showsRiskNotice,
  showsSafetyBadge,
  returnDestination,
  rtoDestination,
  PROTECTION_KINDS,
} from "./_internal/shared/features/shipping/protections";
export type {
  ProtectionKind,
  ProtectionAvailability,
  ProtectionTierInput,
  ProtectionUnavailableReason,
  ClaimFinding,
  ClaimOutcome,
} from "./_internal/shared/features/shipping/protections";
export type {
  FeeCommissionRates,
  CheckoutFees,
  PayoutDeduction,
  CodHandlingFeeRates,
  WhatsAppNotifyFeeRates,
  GiftWrapFeeRates,
  ShipmentProtectionFeeRates,
  SaleProtectionFeeRates,
  GstBreakdown,
} from "./_internal/shared/fees/calculator";
// EMI eligibility + schedule computation (pure, client-safe — used for checkout quotes).
export { checkEmiEligibility, computeEmiSchedule, computeBuyerEmiQuote } from "./_internal/shared/features/emi/schedule";
export type { BuyerEmiQuote } from "./_internal/shared/features/emi/schedule";
/*
 * 0f — the per-group instalment helpers. Exported because the CAPTURE amount
 * is computed in a consumer route (`/api/payment/create-order`), and that
 * route is one of the four money paths that must agree about an EMI order.
 * There is no `./_internal/*` subpath, deliberately, so the barrel is how a
 * consumer reaches shared checkout maths — exactly as `lineTotalFor` and
 * `resolveShippingCost` already are.
 */
export { amountDueNow, groupEmiGate, groupEmiQuote, groupEmiSchedule, emiOrderFields } from "./_internal/shared/features/emi/group";
export { emiTenderFor, resolveEmiChoice, emiTenderBlockReason, isTenderCompatibleWithEmi } from "./_internal/shared/features/emi/choice";
export type { EmiChoice, EmiTender } from "./_internal/shared/features/emi/choice";
// Buyer-facing projections of siteSettings.commissions / .emi — the single
// definition of "safe to send to a browser" for fee data. See fees.ts header.
export {
  toBuyerFacingFees,
  toBuyerEmiSettings,
} from "./_internal/shared/features/site-settings/fees";
export type {
  BuyerFacingFees,
  BuyerEmiSettings,
} from "./_internal/shared/features/site-settings/fees";
// The gate on turning product GST on. Exported because BOTH ends need the same
// implementation — `/api/admin/site` refuses the write and the admin form
// shows the problem inline — and two copies of a compliance rule is the shape
// of Root Cause #75.
export {
  GSTIN_PATTERN,
  gstinCheckCharacter,
  isValidGstin,
  validateGstEnablement,
  canEnableGst,
} from "./_internal/shared/features/site-settings/gst-registration";
export type {
  GstEnablementInput,
  GstEnablementProblems,
} from "./_internal/shared/features/site-settings/gst-registration";
/*
 * The ONE definition of "is this payout destination well-formed", exported for
 * exactly the reason the GSTIN gate above it is: BOTH ends need the same
 * implementation. The seller's route and the appkit write path both decide
 * `isConfigured` from it, and the IFSC/VPA patterns existed in FIVE
 * disagreeing copies before this (Root Cause #75). Pure — no node imports, so
 * it is safe on the client entry too.
 */
export {
  IFSC_PATTERN,
  UPI_VPA_PATTERN,
  PAN_PATTERN,
  isValidIfsc,
  isValidUpiVpa,
  isValidPan,
  normalisePan,
  PAYOUT_VERIFICATION,
  payoutDestinationIssues,
  payoutDestinationIsWellFormed,
  resetVerificationOnChange,
} from "./_internal/shared/features/payouts/destination";
export type {
  PayoutVerificationStatus,
  PayoutDestinationIssue,
  PayoutDestinationLike,
} from "./_internal/shared/features/payouts/destination";
export type {
  EmiSettings,
  EmiIneligibleReason,
  EmiEligibility,
  EmiInstallmentPlan,
  EmiScheduleResult,
} from "./_internal/shared/features/emi/schedule";
// User-role predicates â€" SB-UNI-E 2026-05-13.
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
// [SERVER-ONLY]-Safe in browser but intended for server routes.
// sanitizeProductForPublic - Strip sellerId/sellerName/sellerEmail/ownerId before returning a product in a public response.
export { sanitizeProductForPublic, sanitizeProductsForPublic } from "./features/products/utils/sanitize";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productAdminColumns - Shared export for product admin columns.
export { productAdminColumns } from "./features/products/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productImageSchema - Model for product image schema.
export { productImageSchema } from "./features/products/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productItemSchema - Model for product item schema.
export { productItemSchema } from "./features/products/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productListParamsSchema - Model for product list params schema.
export { productListParamsSchema } from "./features/products/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productQueryHelpers - Shared export for product query helpers.
export { productQueryHelpers } from "./features/products/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// productSeoSchema - Model for product seo schema.
export { productSeoSchema } from "./features/products/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBrands - React hook for use brands.
export { useBrands } from "./features/products/hooks/useBrands";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useProduct - React hook for use product.
export { useProduct } from "./features/products/hooks/useProducts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useProductDetail - React hook for use product detail.
export { useProductDetail } from "./features/products/hooks/useProductDetail";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useProducts - React hook for use products.
export { useProducts } from "./features/products/hooks/useProducts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useRelatedProducts - React hook for use related products.
export { useRelatedProducts } from "./features/products/hooks/useRelatedProducts";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectorDropDetailViewProps - Type contract for collector drop detail view props.
export type { CollectorDropDetailViewProps } from "./features/products/components/CollectorDropDetailView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidHistoryEntry - Type contract for bid history entry.
export type { BidHistoryEntry } from "./features/products/components/BidHistory";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BidHistoryProps - Type contract for bid history props.
export type { BidHistoryProps } from "./features/products/components/BidHistory";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// InteractiveProductCardProps - Type contract for interactive product card props.
export type { InteractiveProductCardProps } from "./features/products/components/InteractiveProductCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ListingType - Type contract for listing type.
export type { ListingType } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PlaceBidFormProps - Type contract for place bid form props.
export type { PlaceBidFormProps } from "./features/products/components/PlaceBidForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PreOrderDetailViewProps - Type contract for pre order detail view props.
export type { PreOrderDetailViewProps } from "./features/products/components/PreOrderDetailView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductAdminUpdateInput - Type contract for product admin update input.
export type { ProductAdminUpdateInput } from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductCondition - Type contract for product condition.
export type { ProductCondition } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductCreateInput - Type contract for product create input.
export type { ProductCreateInput } from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductDetailViewProps - Type contract for product detail view props.
export type { ProductDetailViewProps } from "./features/products/components/ProductDetailView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductDocument - Type contract for product document.
export type { ProductDocument } from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductFilterVariant - Type contract for product filter variant.
export type { ProductFilterVariant } from "./features/products/components/ProductFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductFiltersProps - Type contract for product filters props.
export type { ProductFiltersProps } from "./features/products/components/ProductFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductFormProps - Type contract for product form props.
export type { ProductFormProps } from "./features/products/components/ProductForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductFormValue - Type contract for product form value.
export type { ProductFormValue } from "./features/products/components/ProductForm";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductImage - Type contract for product image.
export type { ProductImage } from "./features/products/types/index";
// A6 — the `ProductImage[]` normaliser and its URL projection. Public because
// consumer pages hand `images` to client shapes that still want `string[]`.
export {
  toProductImages,
  productImageUrls,
} from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductInfoProps - Type contract for product info props.
export type { ProductInfoProps } from "./features/products/components/ProductInfo";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductItem - Type contract for product item.
export type { ProductItem } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductListParams - Type contract for product list params.
export type { ProductListParams } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductListResponse - Type contract for product list response.
export type { ProductListResponse } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductSeo - Type contract for product seo.
export type { ProductSeo } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductSortValue - Type contract for product sort value.
export type { ProductSortValue } from "./features/products/columns/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductSpecification - Type contract for product specification.
export type { ProductSpecification } from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductStatus - Type contract for product status.
export type { ProductStatus } from "./features/products/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductTab - Type contract for product tab.
export type { ProductTab } from "./features/products/components/ProductTabs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductTableColumnLabels - Type contract for product table column labels.
export type { ProductTableColumnLabels } from "./features/products/columns/productTableColumns";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductTableColumnsConfig - Type contract for product table columns config.
export type { ProductTableColumnsConfig } from "./features/products/columns/productTableColumns";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductTabsProps - Type contract for product tabs props.
export type { ProductTabsProps } from "./features/products/components/ProductTabs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductUpdateInput - Type contract for product update input.
export type { ProductUpdateInput } from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductVideoField - Type contract for product video field.
export type { ProductVideoField } from "./features/products/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductsViewProps - Type contract for products view props.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RelatedProductsProps - Type contract for related products props.
export type { RelatedProductsProps } from "./features/products/components/RelatedProducts";

// ./features/products/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedCollectorDrops - Helper for get featured collector drops.
export { getFeaturedCollectorDrops } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedPreOrders - Helper for get featured pre orders.
export { getFeaturedPreOrders } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getFeaturedProducts - Helper for get featured products.
export { getFeaturedProducts } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestCollectorDrops - Helper for get latest collector drops.
export { getLatestCollectorDrops } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestPreOrders - Helper for get latest pre orders.
export { getLatestPreOrders } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getLatestProducts - Helper for get latest products.
export { getLatestProducts } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getProductById - Helper for get product by id.
export { getProductById } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getRelatedProducts - Helper for get related products.
export { getRelatedProducts } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreStorefrontProducts - Helper for get store storefront products.
export { getStoreStorefrontProducts } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listCollectorDrops - Helper for list collector drops.
export { listCollectorDrops } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listPreOrders - Helper for list pre orders.
export { listPreOrders } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listProducts - Helper for list products.
export { listProducts } from "./features/products/actions/product-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productItemDELETE - Shared export for product item delete.
export { DELETE as productItemDELETE } from "./features/products/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productItemGET - Shared export for product item get.
export { GET as productItemGET } from "./features/products/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// productItemPATCH - Shared export for product item patch.
export { PATCH as productItemPATCH } from "./features/products/api/[id]/route";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductListActionParams - Type contract for product list action params.
export type { ProductListActionParams } from "./features/products/actions/product-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductListResult - Type contract for product list result.
export type { ProductListResult } from "./features/products/actions/product-actions";

// ./features/promotions/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// COUPONS_COLLECTION - Constant used across modules.
export { COUPONS_COLLECTION } from "./features/promotions/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// COUPONS_INDEXED_FIELDS - Constant used across modules.
export { COUPONS_INDEXED_FIELDS } from "./features/promotions/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// COUPONS_PUBLIC_FIELDS - Constant used across modules.
export { COUPONS_PUBLIC_FIELDS } from "./features/promotions/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// COUPONS_UPDATABLE_FIELDS - Constant used across modules.
export { COUPONS_UPDATABLE_FIELDS } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// COUPON_FIELDS - Field-name constants + scope/type value enums for coupons.
export { COUPON_FIELDS } from "./features/promotions/schemas/firestore";
// COUPON_TYPE_LABELS - Constant used across modules.
export { COUPON_TYPE_LABELS } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// COUPON_USAGE_SUBCOLLECTION - Constant used across modules.
export { COUPON_USAGE_SUBCOLLECTION } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// CouponCard - Component for coupon card.
export { CouponCard } from "./features/promotions/components/CouponCard";
// CouponHelpDetails - Expandable "How coupons work" explainer (scoping + stacking rules).
export { CouponHelpDetails } from "./features/promotions/components/CouponHelpDetails";
export type { CouponHelpDetailsProps } from "./features/promotions/components/CouponHelpDetails";
// CouponsIndexListing - Client component for browsing coupons with search/filter/sort.
export { CouponsIndexListing } from "./features/promotions/components/CouponsIndexListing";
export type { CouponsIndexListingProps } from "./features/promotions/components/CouponsIndexListing";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_COUPON_DATA - Constant used across modules.
export { DEFAULT_COUPON_DATA } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PromotionsView - Component for promotions view.
export { PromotionsView, PromotionsHero } from "./features/promotions/components/PromotionsView";
export type { PromotionsHeroProps } from "./features/promotions/components/PromotionsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// PromotionsViewProductSection - Shared export for promotions view product section.
export { PromotionsViewProductSection } from "./features/promotions/components/PromotionsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildCouponColumns - Helper for build coupon columns.
export { buildCouponColumns } from "./features/promotions/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildSellerCouponCode - Helper for build seller coupon code.
export { buildSellerCouponCode } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// calculateDiscount - Helper for calculate discount.
export { calculateDiscount } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// canUserUseCoupon - Shared export for can user use coupon.
export { canUserUseCoupon } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// couponAdminColumns - Shared export for coupon admin columns.
export { couponAdminColumns } from "./features/promotions/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// couponItemSchema - Model for coupon item schema.
export { couponItemSchema } from "./features/promotions/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// couponQueryHelpers - Shared export for coupon query helpers.
export { couponQueryHelpers } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// couponScopeSchema - Model for coupon scope schema.
export { couponScopeSchema } from "./features/promotions/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// couponTypeSchema - Model for coupon type schema.
export { couponTypeSchema } from "./features/promotions/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createCouponId - Helper for create coupon id.
export { createCouponId } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getTieredDiscount - Helper for get tiered discount.
export { getTieredDiscount } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isCouponValid - Shared export for is coupon valid.
export { isCouponValid } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// isValidCouponCode - Shared export for is valid coupon code.
export { isValidCouponCode } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// promotionsListParamsSchema - Model for promotions list params schema.
export { promotionsListParamsSchema } from "./features/promotions/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// sellerCouponCodePrefix - Shared export for seller coupon code prefix.
export { sellerCouponCodePrefix } from "./features/promotions/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCoupon - React hook for use coupon.
export { useCoupon } from "./features/promotions/hooks/usePromotions";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCouponValidate - React hook for use coupon validate.
export { useCouponValidate } from "./features/promotions/hooks/useCouponValidate";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// usePromotions - React hook for use promotions.
export { usePromotions } from "./features/promotions/hooks/usePromotions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ApplyCouponResult - Type contract for apply coupon result.
export type { ApplyCouponResult } from "./features/promotions/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BXGYConfig - Type contract for bxgyconfig.
export type { BXGYConfig } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponCreateInput - Type contract for coupon create input.
export type { CouponCreateInput } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponDocument - Type contract for coupon document.
export type { CouponDocument } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponItem - Type contract for coupon item.
export type { CouponItem } from "./features/promotions/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponScope - Type contract for coupon scope.
export type { CouponScope } from "./features/promotions/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponStats - Type contract for coupon stats.
export type { CouponStats } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponType - Type contract for coupon type.
export type { CouponType } from "./features/promotions/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponUpdateInput - Type contract for coupon update input.
export type { CouponUpdateInput } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponUsageDocument - Type contract for coupon usage document.
export type { CouponUsageDocument } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponValidationResult - Type contract for coupon validation result.
export type { CouponValidationResult } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// DiscountConfig - Type contract for discount config.
export type { DiscountConfig } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromotionProductItem - Type contract for promotion product item.
export type { PromotionProductItem } from "./features/promotions/components/PromotionsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromotionsListParams - Type contract for promotions list params.
export type { PromotionsListParams } from "./features/promotions/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromotionsListResponse - Type contract for promotions list response.
export type { PromotionsListResponse } from "./features/promotions/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromotionsViewProductSectionProps - Type contract for promotions view product section props.
export type { PromotionsViewProductSectionProps } from "./features/promotions/components/PromotionsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromotionsViewProps - Type contract for promotions view props.
export type { PromotionsViewProps } from "./features/promotions/components/PromotionsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RestrictionsConfig - Type contract for restrictions config.
export type { RestrictionsConfig } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TieredDiscount - Type contract for tiered discount.
export type { TieredDiscount } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UsageConfig - Type contract for usage config.
export type { UsageConfig } from "./features/promotions/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ValidityConfig - Type contract for validity config.
export type { ValidityConfig } from "./features/promotions/schemas/firestore";

// ./features/promotions/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// detectCouponConflict - Coupon stacking rule: one seller coupon per store + one admin coupon per cart.
export { detectCouponConflict } from "./features/promotions/actions/coupon-stacking";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IncomingCoupon - Type contract for the coupon being added, passed to detectCouponConflict.
export type { IncomingCoupon } from "./features/promotions/actions/coupon-stacking";
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// getPromotions - Helper for get promotions.
export { getPromotions } from "./features/promotions/actions/promotions-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// promotionsGET - Shared export for promotions get.
export { GET as promotionsGET } from "./features/promotions/api/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerCreateCoupon - Shared export for seller create coupon.
export { sellerCreateCoupon } from "./features/promotions/actions/seller-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerDeleteCoupon - Shared export for seller delete coupon.
export { sellerDeleteCoupon } from "./features/promotions/actions/seller-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerUpdateCoupon - Shared export for seller update coupon.
export { sellerUpdateCoupon } from "./features/promotions/actions/seller-coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// validateCoupon - Helper for validate coupon.
export { validateCoupon } from "./features/promotions/actions/coupon-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// validateCouponForCart - Helper for validate coupon for cart.
export { validateCouponForCart } from "./features/promotions/actions/coupon-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponCartItem - Type contract for coupon cart item.
export type { CouponCartItem } from "./features/promotions/actions/coupon-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CouponCartValidationResult - Type contract for coupon cart validation result.
export type { CouponCartValidationResult } from "./features/promotions/actions/coupon-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PromotionsResult - Type contract for promotions result.
export type { PromotionsResult } from "./features/promotions/actions/promotions-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerCreateCouponInput - Type contract for seller create coupon input.
export type { SellerCreateCouponInput } from "./features/promotions/actions/seller-coupon-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerUpdateCouponInput - Type contract for seller update coupon input.
export type { SellerUpdateCouponInput } from "./features/promotions/actions/seller-coupon-actions";

// ./features/reviews/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_REVIEW_DATA - Constant used across modules.
export { DEFAULT_REVIEW_DATA } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_ADMIN_SORT_OPTIONS - Constant used across modules.
export { REVIEW_ADMIN_SORT_OPTIONS } from "./features/reviews/components/ReviewFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// REVIEW_COLLECTION - Constant used across modules.
export { REVIEW_COLLECTION } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_FILTER_KEYS - Constant used across modules.
export { REVIEW_FILTER_KEYS } from "./features/reviews/components/ReviewFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// REVIEW_INDEXED_FIELDS - Constant used across modules.
export { REVIEW_INDEXED_FIELDS } from "./features/reviews/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// REVIEW_PUBLIC_FIELDS - Constant used across modules.
export { REVIEW_PUBLIC_FIELDS } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_PUBLIC_SORT_OPTIONS - Constant used across modules.
export { REVIEW_PUBLIC_SORT_OPTIONS } from "./features/reviews/components/ReviewFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_SELLER_SORT_OPTIONS - Constant used across modules.
export { REVIEW_SELLER_SORT_OPTIONS } from "./features/reviews/components/ReviewFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// REVIEW_SORT_OPTIONS - Constant used across modules.
export { REVIEW_SORT_OPTIONS } from "./features/reviews/components/ReviewFilters";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// REVIEW_UPDATABLE_FIELDS - Constant used across modules.
export { REVIEW_UPDATABLE_FIELDS } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ReviewCard - Component for review card.
export { ReviewCard } from "./features/reviews/components/ReviewsList";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ReviewFilters - Shared export for review filters.
export { ReviewFilters } from "./features/reviews/components/ReviewFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ReviewStatusValues - Model for review status values.
export { ReviewStatusValues } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ReviewSummary - Shared export for review summary.
export { ReviewSummary } from "./features/reviews/components/ReviewSummary";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ReviewsList - Shared export for reviews list.
export { ReviewsList } from "./features/reviews/components/ReviewsList";
// [SERVER-RSC]-Self-fetching index page view for reviews.
// [SERVER-RSC]-Self-fetching review detail page view.
export type { ReviewDetailPageViewProps } from "./features/reviews/components/ReviewDetailPageView";
// ReviewsIndexListing - Client listing component with sort/filter/pagination.
export { ReviewsIndexListing } from "./features/reviews/components/ReviewsIndexListing";
export type { ReviewsIndexListingProps } from "./features/reviews/components/ReviewsIndexListing";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// ViewReviewModal - Component for view review modal.
export { ViewReviewModal } from "./features/reviews/components/ReviewModal";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildReviewColumns - Helper for build review columns.
export { buildReviewColumns } from "./features/reviews/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createReviewId - Helper for create review id.
export { createReviewId } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getReviewFilterKeys - Helper for get review filter keys.
export { getReviewFilterKeys } from "./features/reviews/components/ReviewFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// getReviewSortOptions - Helper for get review sort options.
export { getReviewSortOptions } from "./features/reviews/components/ReviewFilters";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewAdminColumns - Shared export for review admin columns.
export { reviewAdminColumns } from "./features/reviews/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewImageSchema - Model for review image schema.
export { reviewImageSchema } from "./features/reviews/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewListParamsSchema - Model for review list params schema.
export { reviewListParamsSchema } from "./features/reviews/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewQueryHelpers - Shared export for review query helpers.
export { reviewQueryHelpers } from "./features/reviews/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewSchema - Model for review schema.
export { reviewSchema } from "./features/reviews/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewStatusSchema - Model for review status schema.
export { reviewStatusSchema } from "./features/reviews/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// reviewVideoSchema - Model for review video schema.
export { reviewVideoSchema } from "./features/reviews/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useCreateReview - React hook for use create review.
export { useCreateReview } from "./features/reviews/hooks/useCreateReview";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useProductReviews - React hook for use product reviews.
export { useProductReviews } from "./features/reviews/hooks/useReviews";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useReviews - React hook for use reviews.
export { useReviews } from "./features/reviews/hooks/useReviews";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateReviewHookInput - Type contract for create review hook input.
export type { CreateReviewHookInput } from "./features/reviews/hooks/useCreateReview";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateReviewInput - Type contract for create review input.
export type { CreateReviewInput } from "./features/reviews/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// Review - Type contract for review.
export type { Review } from "./features/reviews/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewCardProps - Type contract for review card props.
export type { ReviewCardProps } from "./features/reviews/components/ReviewsList";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewCreateInput - Type contract for review create input.
export type { ReviewCreateInput } from "./features/reviews/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewDocument - Type contract for review document.
export type { ReviewDocument } from "./features/reviews/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewFilterVariant - Type contract for review filter variant.
export type { ReviewFilterVariant } from "./features/reviews/components/ReviewFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewFiltersProps - Type contract for review filters props.
export type { ReviewFiltersProps } from "./features/reviews/components/ReviewFilters";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewListParams - Type contract for review list params.
export type { ReviewListParams } from "./features/reviews/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewListResponse - Type contract for review list response.
export type { ReviewListResponse } from "./features/reviews/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewModerationInput - Type contract for review moderation input.
export type { ReviewModerationInput } from "./features/reviews/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewStatus - Type contract for review status.
export type { ReviewStatus } from "./features/reviews/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewSummaryProps - Type contract for review summary props.
export type { ReviewSummaryProps } from "./features/reviews/components/ReviewSummary";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewUpdateInput - Type contract for review update input.
export type { ReviewUpdateInput } from "./features/reviews/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewVideo - Type contract for review video.
export type { ReviewVideo } from "./features/reviews/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewVideoField - Type contract for review video field.
export type { ReviewVideoField } from "./features/reviews/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewsListProps - Type contract for reviews list props.
export type { ReviewsListProps } from "./features/reviews/components/ReviewsList";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ViewReviewModalProps - Type contract for view review modal props.
export type { ViewReviewModalProps } from "./features/reviews/components/ReviewModal";

// ./features/reviews/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminDeleteReview - Shared export for admin delete review.
export { adminDeleteReview } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// adminUpdateReview - Shared export for admin update review.
export { adminUpdateReview } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createReview - Helper for create review.
export { createReview } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteReview - Helper for delete review.
export { deleteReview } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getHomepageReviews - Helper for get homepage reviews.
export { getHomepageReviews } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getReviewById - Helper for get review by id.
export { getReviewById } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listAdminReviews - Helper for list admin reviews.
export { listAdminReviews } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listReviewsByProduct - Helper for list reviews by product.
export { listReviewsByProduct } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listReviewsBySeller - Helper for list reviews by seller.
export { listReviewsBySeller } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewItemDELETE - Shared export for review item delete.
export { reviewItemDELETE } from "./features/reviews/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewItemGET - Shared export for review item get.
export { reviewItemGET } from "./features/reviews/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// reviewItemPATCH - Shared export for review item patch.
export { reviewItemPATCH } from "./features/reviews/api/[id]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateReview - Helper for update review.
export { updateReview } from "./features/reviews/actions/review-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// voteReviewHelpful - Shared export for vote review helpful.
export { voteReviewHelpful } from "./features/reviews/actions/review-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateReviewActionInput - Type contract for create review action input.
export type { CreateReviewActionInput } from "./features/reviews/actions/review-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateReviewActionInput - Type contract for update review action input.
export type { UpdateReviewActionInput } from "./features/reviews/actions/review-actions";

// ./features/search/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// Search - Shared export for search.
export { Search } from "./features/search/components/Search";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useNavSuggestions - React hook for use nav suggestions.
export { useNavSuggestions } from "./features/search/hooks/useNavSuggestions";
// [CLIENT]-Browser only. Fetches the public search artifact once per page session.
// Exported from the defining module, not the feature barrel — see client.ts.
export { useSearchIndex, ensureSearchIndex } from "./features/search/hooks/useSearchIndex";
export { useSiteSearch } from "./features/search/hooks/useSiteSearch";
export type { UseSiteSearchOptions, UseSiteSearchResult } from "./features/search/hooks/useSiteSearch";
export type {
  SearchIndexState,
  SearchIndexStatus,
  LoadedSearchIndex,
  UseSearchIndexOptions,
} from "./features/search/hooks/useSearchIndex";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NavSuggestionRecord - Type contract for nav suggestion record.
export type { NavSuggestionRecord } from "./features/search/hooks/useNavSuggestions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchLabels - Type contract for search labels.
export type { SearchLabels } from "./features/search/components/Search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchResourceType - Type union for search resource types.
export type { SearchResourceType } from "./features/search/components/Search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchResourceTypeOption - Type contract for search resource type option.
export type { SearchResourceTypeOption } from "./features/search/components/Search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchProps - Type contract for search props.
export type { SearchProps } from "./features/search/components/Search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchQuickLink - Type contract for search quick link.
export type { SearchQuickLink } from "./features/search/components/Search";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SearchRouterAdapter - Type contract for search router adapter.
export type { SearchRouterAdapter } from "./features/search/components/Search";

// ./features/seller/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// OFFER_COLLECTION - Constant used across modules.
export { OFFER_COLLECTION } from "./features/seller/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// OFFER_FIELDS - Constant used across modules.
export { OFFER_FIELDS } from "./features/seller/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// OFFER_INDEXED_FIELDS - Constant used across modules.
export { OFFER_INDEXED_FIELDS } from "./features/seller/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// OfferStatusValues - Model for offer status values.
export { OfferStatusValues } from "./features/seller/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerAddressesView - Component for seller addresses view.
export { SellerAddressesView } from "./features/seller/components/SellerAddressesView";
// SellerFeaturesView - Seller store custom features CRUD (FI4).
export { SellerFeaturesView } from "./features/seller/components/SellerFeaturesView";
export { SellerFeaturesView as StoreFeaturesView } from "./features/seller/components/SellerFeaturesView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerAnalyticsStats - Shared export for seller analytics stats.
export { SellerAnalyticsStats } from "./features/seller/components/analytics/SellerAnalyticsStats";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerAnalyticsView - Component for seller analytics view.
export { SellerAnalyticsView } from "./features/seller/components/SellerAnalyticsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerCouponsView - Component for seller coupons view.
export { SellerCouponsView } from "./features/seller/components/SellerCouponsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerCouponEditorView - Form component for creating/editing seller coupons.
export { SellerCouponEditorView } from "./features/seller/components/SellerCouponEditorView";
export type { SellerCouponEditorViewProps, CouponEditorDraft } from "./features/seller/components/SellerCouponEditorView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerBidsView - Read-only view showing all bids on a seller's collector drop products.
export { SellerBidsView } from "./features/seller/components/SellerBidsView";
export type { SellerBidsViewProps } from "./features/seller/components/SellerBidsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerCreateProductView - Component for seller create product view.
export { SellerCreateProductView } from "./features/seller/components/SellerCreateProductView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerDashboardView - Component for seller dashboard view.
export { SellerDashboardView } from "./features/seller/components/SellerDashboardView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerEditProductView - Component for seller edit product view.
export { SellerEditProductView } from "./features/seller/components/SellerEditProductView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerGuideView - Component for seller guide view.
export { SellerGuideView } from "./features/seller/components/SellerGuideView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerOffersView - Component for seller offers view.
export { SellerOffersView } from "./features/seller/components/SellerOffersView";
export { SellerGroupedListingsView } from "./features/seller/components/SellerGroupedListingsView";
export type { SellerGroupedListingsViewProps } from "./features/seller/components/SellerGroupedListingsView";
export { SellerGroupedListingsView as StoreGroupedListingsView } from "./features/seller/components/SellerGroupedListingsView";
export { SellerAnalyticsAlertsView } from "./features/seller/components/SellerAnalyticsAlertsView";
export type { SellerAnalyticsAlertsViewProps } from "./features/seller/components/SellerAnalyticsAlertsView";
export { SellerAnalyticsAlertsView as StoreAnalyticsAlertsView } from "./features/seller/components/SellerAnalyticsAlertsView";
// [CLIENT]-Runs in browser only â€" uses useState/useEffect/fetch.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerOrdersView - Component for seller orders view.
export { SellerOrdersView } from "./features/seller/components/SellerOrdersView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerOrderDetailPanel - Shared order-detail content (items/address/payment/EMI/status form), used by both the seller orders list drawer and the standalone /store/orders/[id]/view page.
export { SellerOrderDetailPanel } from "./features/seller/components/SellerOrdersView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerPayoutHistoryTable - Component for seller payout history table.
export { SellerPayoutHistoryTable } from "./features/seller/components/SellerPayoutHistoryTable";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerPayoutDetailContent - Shared payout-detail body, used by both the payouts list drawer and the standalone /store/payouts/[id]/view page.
export { SellerPayoutDetailContent } from "./features/seller/components/SellerPayoutsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerPayoutSettingsView - Component for seller payout settings view.
export { SellerPayoutSettingsView } from "./features/seller/components/SellerPayoutSettingsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerPayoutStats - Shared export for seller payout stats.
export { SellerPayoutStats } from "./features/seller/components/SellerPayoutStats";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerPayoutsView - Component for seller payouts view.
export { SellerPayoutsView } from "./features/seller/components/SellerPayoutsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerProductsView - Component for seller products view.
export { SellerProductsView } from "./features/seller/components/SellerProductsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerRevenueChart - Shared export for seller revenue chart.
export { SellerRevenueChart } from "./features/seller/components/analytics/SellerRevenueChart";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerShippingView - Component for seller shipping view.
export { SellerShippingView } from "./features/seller/components/SellerShippingView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerStoreSetupView - Component for seller store setup view.
export { SellerStoreSetupView } from "./features/seller/components/SellerStoreSetupView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerStorefrontView - Component for seller storefront view.
export { SellerStorefrontView } from "./features/seller/components/SellerStorefrontView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellerTopProducts - Shared export for seller top products.
export { SellerTopProducts } from "./features/seller/components/analytics/SellerTopProducts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// SellersListView - Component for sellers list view.
export { SellersListView } from "./features/seller/components/SellersListView";
// [CLIENT-SSR]-Store* aliases â€" same components, renamed for store-centric terminology
// StoreAddressesView - Alias for SellerAddressesView.
export { SellerAddressesView as StoreAddressesView } from "./features/seller/components/SellerAddressesView";
// StoreBidsView - Alias for SellerBidsView.
export { SellerBidsView as StoreBidsView } from "./features/seller/components/SellerBidsView";
// StoreAnalyticsView - Alias for SellerAnalyticsView.
export { SellerAnalyticsView as StoreAnalyticsView } from "./features/seller/components/SellerAnalyticsView";
// StoreCouponsView - Alias for SellerCouponsView.
export { SellerCouponsView as StoreCouponsView } from "./features/seller/components/SellerCouponsView";
// StoreCreateProductView - Alias for SellerCreateProductView.
export { SellerCreateProductView as StoreCreateProductView } from "./features/seller/components/SellerCreateProductView";
// StoreEditProductView - Alias for SellerEditProductView.
export { SellerEditProductView as StoreEditProductView } from "./features/seller/components/SellerEditProductView";
// StoreOffersView - Alias for SellerOffersView.
export { SellerOffersView as StoreOffersView } from "./features/seller/components/SellerOffersView";
// StoreOrdersView - Alias for SellerOrdersView.
export { SellerOrdersView as StoreOrdersView } from "./features/seller/components/SellerOrdersView";
// StorePayoutSettingsView - Alias for SellerPayoutSettingsView.
export { SellerPayoutSettingsView as StorePayoutSettingsView } from "./features/seller/components/SellerPayoutSettingsView";
// StorePayoutsView - Alias for SellerPayoutsView.
export { SellerPayoutsView as StorePayoutsView } from "./features/seller/components/SellerPayoutsView";
// StoreProductListingsView - Alias for SellerProductsView.
export { SellerProductsView as StoreProductListingsView } from "./features/seller/components/SellerProductsView";
// StoreShippingView - Alias for SellerShippingView.
export { SellerShippingView as StoreShippingView } from "./features/seller/components/SellerShippingView";
// StoreStorefrontView - Alias for SellerStorefrontView.
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildPayoutColumns - Helper for build payout columns.
export { buildPayoutColumns } from "./features/seller/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildSellerColumns - Helper for build seller columns.
export { buildSellerColumns } from "./features/seller/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// createOfferId - Helper for create offer id.
export { createOfferId } from "./features/seller/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// offerQueryHelpers - Shared export for offer query helpers.
export { offerQueryHelpers } from "./features/seller/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// payoutAdminColumns - Shared export for payout admin columns.
export { payoutAdminColumns } from "./features/seller/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// payoutListParamsSchema - Model for payout list params schema.
export { payoutListParamsSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// payoutPaymentMethodSchema - Model for payout payment method schema.
export { payoutPaymentMethodSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// payoutRecordSchema - Model for payout record schema.
export { payoutRecordSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// sellerAdminColumns - Shared export for seller admin columns.
export { sellerAdminColumns } from "./features/seller/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// sellerListParamsSchema - Model for seller list params schema.
export { sellerListParamsSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// sellerStoreSchema - Model for seller store schema.
export { sellerStoreSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// socialLinksSchema - Model for social links schema.
export { socialLinksSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// storeStatusSchema - Model for store status schema.
export { storeStatusSchema } from "./features/seller/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useBecomeSeller - React hook for use become seller.
export { useBecomeSeller } from "./features/seller/hooks/useBecomeSeller";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSellerAnalytics - React hook for use seller analytics.
export { useSellerAnalytics } from "./features/seller/hooks/useSellerStore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSellerDashboard - React hook for use seller dashboard.
export { useSellerDashboard } from "./features/seller/hooks/useSellerStore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSellerPayoutSettings - React hook for use seller payout settings.
export { useSellerPayoutSettings } from "./features/seller/hooks/useSellerPayouts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSellerPayouts - React hook for use seller payouts.
export { useSellerPayouts } from "./features/seller/hooks/useSellerPayouts";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSellerStore - React hook for use seller store.
export { useSellerStore } from "./features/seller/hooks/useSellerStore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useSellerStorefront - React hook for use seller storefront.
export { useSellerStorefront } from "./features/seller/hooks/useSellerStorefront";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BecomeSellerResult - Type contract for become seller result.
export type { BecomeSellerResult } from "./features/seller/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OfferCreateInput - Type contract for offer create input.
export type { OfferCreateInput } from "./features/seller/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OfferDocument - Type contract for offer document.
export type { OfferDocument } from "./features/seller/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OfferUpdateInput - Type contract for offer update input.
export type { OfferUpdateInput } from "./features/seller/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutListResponse - Type contract for payout list response.
export type { PayoutListResponse } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// PayoutRecord - Type contract for payout record.
export type { PayoutRecord } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAddressesViewProps - Type contract for seller addresses view props.
export type { SellerAddressesViewProps } from "./features/seller/components/SellerAddressesView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalytics - Type contract for seller analytics.
export type { SellerAnalytics } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalyticsMonthEntry - Type contract for seller analytics month entry.
export type { SellerAnalyticsMonthEntry } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalyticsStatsLabels - Type contract for seller analytics stats labels.
export type { SellerAnalyticsStatsLabels } from "./features/seller/components/analytics/SellerAnalyticsStats";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalyticsStatsProps - Type contract for seller analytics stats props.
export type { SellerAnalyticsStatsProps } from "./features/seller/components/analytics/SellerAnalyticsStats";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalyticsSummary - Type contract for seller analytics summary.
export type { SellerAnalyticsSummary } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalyticsTopProduct - Type contract for seller analytics top product.
export type { SellerAnalyticsTopProduct } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerAnalyticsViewProps - Type contract for seller analytics view props.
export type { SellerAnalyticsViewProps } from "./features/seller/components/SellerAnalyticsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerCouponsViewProps - Type contract for seller coupons view props.
export type { SellerCouponsViewProps } from "./features/seller/components/SellerCouponsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerCreateProductViewProps - Type contract for seller create product view props.
export type { SellerCreateProductViewProps } from "./features/seller/components/SellerCreateProductView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerDashboardStats - Type contract for seller dashboard stats.
export type { SellerDashboardStats } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerDashboardViewProps - Type contract for seller dashboard view props.
export type { SellerDashboardViewProps } from "./features/seller/components/SellerDashboardView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerEditProductViewProps - Type contract for seller edit product view props.
export type { SellerEditProductViewProps } from "./features/seller/components/SellerEditProductView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerGuideViewProps - Type contract for seller guide view props.
export type { SellerGuideViewProps } from "./features/seller/components/SellerGuideView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerListResponse - Type contract for seller list response.
export type { SellerListResponse } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerOffersViewProps - Type contract for seller offers view props.
export type { SellerOffersViewProps } from "./features/seller/components/SellerOffersView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerOrdersViewProps - Type contract for seller orders view props.
export type { SellerOrdersViewProps } from "./features/seller/components/SellerOrdersView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutHistoryTableLabels - Type contract for seller payout history table labels.
export type { SellerPayoutHistoryTableLabels } from "./features/seller/components/SellerPayoutHistoryTable";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutHistoryTableProps - Type contract for seller payout history table props.
export type { SellerPayoutHistoryTableProps } from "./features/seller/components/SellerPayoutHistoryTable";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutSettings - Type contract for seller payout settings.
export type { SellerPayoutSettings } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutSettingsViewProps - Type contract for seller payout settings view props.
export type { SellerPayoutSettingsViewProps } from "./features/seller/components/SellerPayoutSettingsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutStatsProps - Type contract for seller payout stats props.
export type { SellerPayoutStatsProps } from "./features/seller/components/SellerPayoutStats";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerPayoutsViewProps - Type contract for seller payouts view props.
export type { SellerPayoutsViewProps } from "./features/seller/components/SellerPayoutsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerProductsViewProps - Type contract for seller products view props.
export type { SellerProductsViewProps } from "./features/seller/components/SellerProductsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerRevenueChartLabels - Type contract for seller revenue chart labels.
export type { SellerRevenueChartLabels } from "./features/seller/components/analytics/SellerRevenueChart";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerRevenueChartProps - Type contract for seller revenue chart props.
export type { SellerRevenueChartProps } from "./features/seller/components/analytics/SellerRevenueChart";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerRevenueDataPoint - Type contract for seller revenue data point.
export type { SellerRevenueDataPoint } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerShippingViewProps - Type contract for seller shipping view props.
export type { SellerShippingViewProps } from "./features/seller/components/SellerShippingView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerStore - Type contract for seller store.
export type { SellerStore } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerStoreSetupViewProps - Type contract for seller store setup view props.
export type { SellerStoreSetupViewProps } from "./features/seller/components/SellerStoreSetupView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerStoreViewProps - Type contract for seller store view props.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerStorefrontViewProps - Type contract for seller storefront view props.
export type { SellerStorefrontViewProps, StorefrontDraft } from "./features/seller/components/SellerStorefrontView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerTopProductsLabels - Type contract for seller top products labels.
export type { SellerTopProductsLabels } from "./features/seller/components/analytics/SellerTopProducts";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerTopProductsProps - Type contract for seller top products props.
export type { SellerTopProductsProps } from "./features/seller/components/analytics/SellerTopProducts";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellersListViewProps - Type contract for sellers list view props.
export type { SellersListViewProps } from "./features/seller/components/SellersListView";
// [TYPE]-Store*ViewProps aliases â€" same types, renamed for store-centric terminology
// StoreAddressesViewProps - Type alias for SellerAddressesViewProps.
export type { SellerAddressesViewProps as StoreAddressesViewProps } from "./features/seller/components/SellerAddressesView";
// StoreAnalyticsViewProps - Type alias for SellerAnalyticsViewProps.
export type { SellerAnalyticsViewProps as StoreAnalyticsViewProps } from "./features/seller/components/SellerAnalyticsView";
// StoreCouponsViewProps - Type alias for SellerCouponsViewProps.
export type { SellerCouponsViewProps as StoreCouponsViewProps } from "./features/seller/components/SellerCouponsView";
// StoreCreateProductViewProps - Type alias for SellerCreateProductViewProps.
export type { SellerCreateProductViewProps as StoreCreateProductViewProps } from "./features/seller/components/SellerCreateProductView";
// StoreEditProductViewProps - Type alias for SellerEditProductViewProps.
export type { SellerEditProductViewProps as StoreEditProductViewProps } from "./features/seller/components/SellerEditProductView";
// StoreOffersViewProps - Type alias for SellerOffersViewProps.
export type { SellerOffersViewProps as StoreOffersViewProps } from "./features/seller/components/SellerOffersView";
// StoreOrdersViewProps - Type alias for SellerOrdersViewProps.
export type { SellerOrdersViewProps as StoreOrdersViewProps } from "./features/seller/components/SellerOrdersView";
// StorePayoutSettingsViewProps - Type alias for SellerPayoutSettingsViewProps.
export type { SellerPayoutSettingsViewProps as StorePayoutSettingsViewProps } from "./features/seller/components/SellerPayoutSettingsView";
// StorePayoutsViewProps - Type alias for SellerPayoutsViewProps.
export type { SellerPayoutsViewProps as StorePayoutsViewProps } from "./features/seller/components/SellerPayoutsView";
// StoreProductListingsViewProps - Type alias for SellerProductsViewProps.
export type { SellerProductsViewProps as StoreProductListingsViewProps } from "./features/seller/components/SellerProductsView";
// StoreShippingViewProps - Type alias for SellerShippingViewProps.
export type { SellerShippingViewProps as StoreShippingViewProps } from "./features/seller/components/SellerShippingView";
// StoreStorefrontViewProps - Type alias for SellerStorefrontViewProps.
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreStatus - Type contract for store status.
export type { StoreStatus } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateSellerStoreInput - Type contract for update seller store input.
export type { UpdateSellerStoreInput } from "./features/seller/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseBecomeSellerOptions - Type contract for use become seller options.
export type { UseBecomeSellerOptions } from "./features/seller/hooks/useBecomeSeller";

// ./features/seller/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// acceptCounterOffer - Shared export for accept counter offer.
export { acceptCounterOffer } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// becomeSeller - Shared export for become seller.
export { becomeSeller } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// bulkSellerOrder - Shared export for bulk seller order.
export { bulkSellerOrder } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// checkoutOffer - Shared export for checkout offer.
export { checkoutOffer } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// counterOfferByBuyer - Shared export for counter offer by buyer.
export { counterOfferByBuyer } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createSellerProduct - Helper for create seller product.
export { createSellerProduct } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// createStore - Helper for create store.
export { createStore } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// customShipOrder - Shared export for custom ship order.
export { customShipOrder } from "./features/seller/actions/seller-actions";
// assertEmiShippable - the single EMI shipment-gate choke point; any code path that transitions an order to "shipped" must call this first.
export { assertEmiShippable } from "./features/seller/actions/seller-actions";
// markEmiInstallmentPaid - records collection of one EMI installment; recomputes emiRemainingBalance/emiComplete.
export { markEmiInstallmentPaid } from "./features/seller/actions/seller-actions";
export type { MarkEmiInstallmentPaidInput } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerAnalytics - Helper for get seller analytics.
export { getSellerAnalytics } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerPayoutSettings - Helper for get seller payout settings.
export { getSellerPayoutSettings } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerShipping - Helper for get seller shipping.
export { getSellerShipping } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getSellerStore - Helper for get seller store.
export { getSellerStore } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listBuyerOffers - Helper for list buyer offers.
export { listBuyerOffers } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerCoupons - Helper for list seller coupons.
export { listSellerCoupons } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerMyProducts - Helper for list seller my products.
export { listSellerMyProducts } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerOffers - Helper for list seller offers.
export { listSellerOffers } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerOrders - Helper for list seller orders.
export { listSellerOrders } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listSellerPayouts - Helper for list seller payouts.
export { listSellerPayouts } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// makeOffer - Shared export for make offer.
export { makeOffer } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// requestPayout - Shared export for request payout.
export { requestPayout } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// respondToOffer - Shared export for respond to offer.
export { respondToOffer } from "./features/seller/actions/offer-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerCouponsGET - Shared export for seller coupons get.
export { GET as sellerCouponsGET } from "./features/seller/api/coupons/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerDeleteProduct - Shared export for seller delete product.
export { sellerDeleteProduct } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerProductsGET - Shared export for seller products get.
export { GET as sellerProductsGET } from "./features/seller/api/products/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerStoreGET - Shared export for seller store get.
export { GET as sellerStoreGET } from "./features/seller/api/store/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sellerUpdateProduct - Shared export for seller update product.
export { sellerUpdateProduct } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updatePayoutSettings - Helper for update payout settings.
export { updatePayoutSettings } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateStore - Helper for update store.
export { updateStore } from "./features/seller/actions/seller-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// withdrawOffer - Shared export for withdraw offer.
export { withdrawOffer } from "./features/seller/actions/offer-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BulkSellerOrderResult - Type contract for bulk seller order result.
export type { BulkSellerOrderResult } from "./features/seller/actions/seller-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BuyerCounterInput - Type contract for buyer counter input.
export type { BuyerCounterInput } from "./features/seller/actions/offer-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CreateStoreInput - Type contract for create store input.
export type { CreateStoreInput } from "./features/seller/actions/seller-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CustomShipOrderInput - Type contract for custom ship order input.
export type { CustomShipOrderInput } from "./features/seller/actions/seller-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// MakeOfferInput - Type contract for make offer input.
export type { MakeOfferInput } from "./features/seller/actions/offer-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RequestPayoutInput - Type contract for request payout input.
export type { RequestPayoutInput } from "./features/seller/actions/seller-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// RespondToOfferInput - Type contract for respond to offer input.
export type { RespondToOfferInput } from "./features/seller/actions/offer-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SellerListParams - Type contract for seller list params.
export type { SellerListParams } from "./features/seller/actions/seller-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdatePayoutSettingsInput - Type contract for update payout settings input.
export type { UpdatePayoutSettingsInput } from "./features/seller/actions/seller-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UpdateStoreInput - Type contract for update store input.
export type { UpdateStoreInput } from "./features/seller/actions/seller-actions";

// ./features/stores/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_STORE_ADDRESS_DATA - Constant used across modules.
export { DEFAULT_ADDRESS_DATA as DEFAULT_STORE_ADDRESS_DATA } from "./features/addresses/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_STORE_DATA - Constant used across modules.
export { DEFAULT_STORE_DATA } from "./features/stores/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// InteractiveStoreCard - Component for interactive store card.
export { InteractiveStoreCard } from "./features/stores/components/InteractiveStoreCard";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// STORE_ADDRESS_FIELDS - Constant used across modules.
export { ADDRESS_FIELDS as STORE_ADDRESS_FIELDS } from "./features/addresses/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// STORE_ADDRESS_INDEXED_FIELDS - Constant used across modules.
export { ADDRESS_INDEXED_FIELDS as STORE_ADDRESS_INDEXED_FIELDS } from "./features/addresses/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// STORE_ADDRESS_PUBLIC_FIELDS - Constant used across modules.
export { ADDRESS_PUBLIC_FIELDS as STORE_ADDRESS_PUBLIC_FIELDS } from "./features/addresses/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// STORE_ADDRESS_SUBCOLLECTION - Constant used across modules.
export { STORE_ADDRESS_SUBCOLLECTION } from "./features/stores/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// STORE_ADDRESS_UPDATABLE_FIELDS - Constant used across modules.
export { ADDRESS_UPDATABLE_FIELDS as STORE_ADDRESS_UPDATABLE_FIELDS } from "./features/addresses/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// STORE_COLLECTION - Constant used across modules.
export { STORE_COLLECTION } from "./features/stores/schemas/firestore";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// STORE_FIELDS - Constant used across modules.
export { STORE_FIELDS } from "./features/stores/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreAboutView - Component for store about view.
export { StoreAboutView } from "./features/stores/components/StoreAboutView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreAddressSelectorCreate - Shared export for store address selector create.
export { StoreAddressSelectorCreate } from "./features/stores/components/StoreAddressSelectorCreate";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreCollectorDropsView - Component for store collector drops view.
export { StoreCollectorDropsView } from "./features/stores/components/StoreCollectorDropsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreHeader - Shared export for store header.
export { StoreHeader } from "./features/stores/components/StoreHeader";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreNavTabs - Component for store nav tabs.
export { StoreNavTabs } from "./features/stores/components/StoreNavTabs";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreProductsView - Component for store products view.
export { StoreProductsView } from "./features/stores/components/StoreProductsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreReviewsView - Component for store reviews view.
export { StoreReviewsView } from "./features/stores/components/StoreReviewsView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// StoreStatusValues - Model for store status values.
export { StoreStatusValues } from "./features/stores/schemas/firestore";
// [SERVER-RSC] â€" Self-fetching RSC page views for store tab pages.
export { StoresIndexListing } from "./features/stores/components/StoresIndexListing";
export type { StoresIndexListingProps } from "./features/stores/components/StoresIndexListing";
export { StoreProductsListing } from "./features/stores/components/StoreProductsListing";
export type { StoreProductsListingProps } from "./features/stores/components/StoreProductsListing";
export { StoreCollectorDropsListing } from "./features/stores/components/StoreCollectorDropsListing";
export type { StoreCollectorDropsListingProps } from "./features/stores/components/StoreCollectorDropsListing";
export { StoreReviewsListing } from "./features/stores/components/StoreReviewsListing";
export type { StoreReviewsListingProps } from "./features/stores/components/StoreReviewsListing";
export { StoreReviewsPageView } from "./features/stores/components/StoreReviewsPageView";
// [SERVER-RSC]-Public store â†’ Random Lots tab (SB7-D).
export type { StoreRandomLotsPageViewProps } from "./features/stores/components/StoreRandomLotsPageView";
// [SERVER-RSC]-Public store â†’ Bundles tab (SB7-D / S7-PrizeDraws-3).
export type { StoreBundlesPageViewProps } from "./features/stores/components/StoreBundlesPageView";
// [CLIENT-SSR]-Admin guide hub — static view, permission-aware card grid.
export { AdminGuideHubView } from "./features/admin/components/AdminGuideHubView";
export type { AdminGuideHubViewProps } from "./features/admin/components/AdminGuideHubView";
// [CLIENT-SSR]-Admin users guide — static view, no firebase-admin.
export { AdminUsersGuideView } from "./features/admin/components/AdminUsersGuideView";
// [CLIENT-SSR]-Admin catalog guide — static view, no firebase-admin.
export { AdminCatalogGuideView } from "./features/admin/components/AdminCatalogGuideView";
// [CLIENT-SSR]-Admin stores guide — static view, no firebase-admin.
export { AdminStoresGuideView } from "./features/admin/components/AdminStoresGuideView";
// [CLIENT-SSR]-Admin orders guide — static view, no firebase-admin.
export { AdminOrdersGuideView } from "./features/admin/components/AdminOrdersGuideView";
// [CLIENT-SSR]-Admin content guide — static view, no firebase-admin.
export { AdminContentGuideView } from "./features/admin/components/AdminContentGuideView";
// [CLIENT-SSR]-Admin site config guide — static view, no firebase-admin.
export { AdminSiteConfigGuideView } from "./features/admin/components/AdminSiteConfigGuideView";
// [CLIENT-SSR]-Admin team guide — static view, no firebase-admin.
export { AdminTeamGuideView } from "./features/admin/components/AdminTeamGuideView";
// [CLIENT-SSR]-Admin analytics guide — static view, no firebase-admin.
export { AdminAnalyticsGuideView } from "./features/admin/components/AdminAnalyticsGuideView";
// [CLIENT-SSR]-Admin trust & safety guide — static view, no firebase-admin.
export { AdminTrustGuideView } from "./features/admin/components/AdminTrustGuideView";
// [CLIENT-SSR]-Admin WhatsApp integration guide — static view, no firebase-admin.
// [CLIENT-SSR]-Admin payments (Razorpay) guide — static view, no firebase-admin.
export { AdminPaymentsGuideView } from "./features/admin/components/AdminPaymentsGuideView";
// [CLIENT-SSR]-Buyer shopping guide — static view, no firebase-admin.
export { BuyerShoppingGuideView } from "./features/account/components/BuyerShoppingGuideView";
// [CLIENT-SSR]-Buyer collector drops & pre-orders guide — static view, no firebase-admin.
export { BuyerCollectorDropsGuideView } from "./features/account/components/BuyerCollectorDropsGuideView";
// [CLIENT-SSR]-Buyer orders & returns guide — static view, no firebase-admin.
export { BuyerOrdersGuideView } from "./features/account/components/BuyerOrdersGuideView";
// [CLIENT-SSR]-Buyer account & safety guide — static view, no firebase-admin.
export { BuyerAccountGuideView } from "./features/account/components/BuyerAccountGuideView";
// [CLIENT-SSR]-Store seller guide hub — static view, no firebase-admin.
export { StoreGuideHubView } from "./features/stores/components/StoreGuideHubView";
export type { StoreGuideHubViewProps } from "./features/stores/components/StoreGuideHubView";
// [CLIENT-SSR]-Store listings guide — static view, no firebase-admin.
export { StoreListingsGuideView } from "./features/stores/components/StoreListingsGuideView";
export type { StoreListingsGuideViewProps } from "./features/stores/components/StoreListingsGuideView";
// [CLIENT-SSR]-Store orders guide — static view, no firebase-admin.
export { StoreOrdersGuideView } from "./features/stores/components/StoreOrdersGuideView";
export type { StoreOrdersGuideViewProps } from "./features/stores/components/StoreOrdersGuideView";
// [CLIENT-SSR]-Store finance guide — static view, no firebase-admin.
export { StoreFinanceGuideView } from "./features/stores/components/StoreFinanceGuideView";
export type { StoreFinanceGuideViewProps } from "./features/stores/components/StoreFinanceGuideView";
// [CLIENT-SSR]-Store capabilities guide — static view, no firebase-admin.
export { StoreCapabilitiesGuideView } from "./features/stores/components/StoreCapabilitiesGuideView";
export type { StoreCapabilitiesGuideViewProps } from "./features/stores/components/StoreCapabilitiesGuideView";
// [CLIENT-SSR]-Store settings guide — static view, no firebase-admin.
export { StoreSettingsGuideView } from "./features/stores/components/StoreSettingsGuideView";
export type { StoreSettingsGuideViewProps } from "./features/stores/components/StoreSettingsGuideView";
// [CLIENT-SSR]-Store WhatsApp catalog sync guide — static view, no firebase-admin.
export { StorePreOrdersListing } from "./features/stores/components/StorePreOrdersListing";
export type { StorePreOrdersListingProps } from "./features/stores/components/StorePreOrdersListing";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildStoreColumns - Helper for build store columns.
export { buildStoreColumns } from "./features/stores/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// generateStoreSlug - Helper for generate store slug.
export { generateStoreSlug } from "./features/stores/schemas/firestore";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// storeAdminColumns - Shared export for store admin columns.
export { storeAdminColumns } from "./features/stores/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// storeListItemSchema - Model for store list item schema.
export { storeListItemSchema } from "./features/stores/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// storeListParamsSchema - Model for store list params schema.
export { storeListParamsSchema } from "./features/stores/schemas/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useStoreAddressSelector - React hook for use store address selector.
export { useStoreAddressSelector } from "./features/stores/hooks/useStoreAddressSelector";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useStoreCollectorDrops - React hook for use store collector drops.
export { useStoreCollectorDrops } from "./features/stores/hooks/useStores";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useStoreBySlug - React hook for use store by slug.
export { useStoreBySlug } from "./features/stores/hooks/useStores";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useStoreProducts - React hook for use store products.
export { useStoreProducts } from "./features/stores/hooks/useStores";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useStoreReviews - React hook for use store reviews.
export { useStoreReviews } from "./features/stores/hooks/useStores";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useStores - React hook for use stores.
export { useStores } from "./features/stores/hooks/useStores";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// InteractiveStoreCardProps - Type contract for interactive store card props.
export type { InteractiveStoreCardProps } from "./features/stores/components/InteractiveStoreCard";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreAboutViewProps - Type contract for store about view props.
export type { StoreAboutViewProps } from "./features/stores/components/StoreAboutView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreAddressCreateInput - Type contract for store address create input.
export type { StoreAddressCreateInput } from "./features/stores/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreAddressDocument - Type contract for store address document.
export type { StoreAddressDocument } from "./features/stores/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreAddressSelectorCreateLabels - Type contract for store address selector create labels.
export type { StoreAddressSelectorCreateLabels } from "./features/stores/components/StoreAddressSelectorCreate";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreAddressSelectorCreateProps - Type contract for store address selector create props.
export type { StoreAddressSelectorCreateProps } from "./features/stores/components/StoreAddressSelectorCreate";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreAddressUpdateInput - Type contract for store address update input.
export type { StoreAddressUpdateInput } from "./features/stores/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreCollectorDropItem - Type contract for store collector drop item.
export type { StoreCollectorDropItem } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreCollectorDropsResponse - Type contract for store collector drops response.
export type { StoreCollectorDropsResponse } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreCollectorDropsViewProps - Type contract for store collector drops view props.
export type { StoreCollectorDropsViewProps } from "./features/stores/components/StoreCollectorDropsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreDetail - Type contract for store detail.
export type { StoreDetail } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreDocument - Type contract for store document.
export type { StoreDocument } from "./features/stores/schemas/firestore";
export type { StoreShippingConfig, ShippingProviderConfig, ShippingProviderType } from "./features/stores/schemas/firestore";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreListItem - Type contract for store list item.
export type { StoreListItem } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreListParams - Type contract for store list params.
export type { StoreListParams } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreListResponse - Type contract for store list response.
export type { StoreListResponse } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreNavTabsProps - Type contract for store nav tabs props.
export type { StoreNavTabsProps } from "./features/stores/components/StoreNavTabs";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreProductItem - Type contract for store product item.
export type { StoreProductItem } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreProductsResponse - Type contract for store products response.
export type { StoreProductsResponse } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreProductsViewProps - Type contract for store products view props.
export type { StoreProductsViewProps } from "./features/stores/components/StoreProductsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreReview - Type contract for store review.
export type { StoreReview } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreReviewsData - Type contract for store reviews data.
export type { StoreReviewsData } from "./features/stores/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreReviewsViewProps - Type contract for store reviews view props.
export type { StoreReviewsViewProps } from "./features/stores/components/StoreReviewsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreTab - Type contract for store tab.
export type { StoreTab } from "./features/stores/components/StoreNavTabs";

// ./features/stores/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// createStoreAddressForSeller - Helper for create store address for seller.
export { createStoreAddressForSeller } from "./features/stores/actions/store-address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// deleteStoreAddressForSeller - Helper for delete store address for seller.
export { deleteStoreAddressForSeller } from "./features/stores/actions/store-address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreCollectorDrops - Helper for get store collector drops.
export { getStoreCollectorDrops } from "./features/stores/actions/store-query-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreBySlug - Helper for get store by slug.
export { getStoreBySlug } from "./features/stores/actions/store-query-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreProducts - Helper for get store products.
export { getStoreProducts } from "./features/stores/actions/store-query-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getStoreReviews - Helper for get store reviews.
export { getStoreReviews } from "./features/stores/actions/store-query-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listStoreAddressesForSeller - Helper for list store addresses for seller.
export { listStoreAddressesForSeller } from "./features/stores/actions/store-address-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// listStores - Helper for list stores.
export { listStores } from "./features/stores/actions/store-query-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeCollectorDropsGET - Shared export for store collector drops get.
export { GET as storeCollectorDropsGET } from "./features/stores/api/[storeSlug]/collector-drops/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeProductsGET - Shared export for store products get.
export { GET as storeProductsGET } from "./features/stores/api/[storeSlug]/products/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeReviewsGET - Shared export for store reviews get.
export { GET as storeReviewsGET } from "./features/stores/api/[storeSlug]/reviews/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// storeSlugGET - Shared export for store slug get.
export { GET as storeSlugGET } from "./features/stores/api/[storeSlug]/route";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// updateStoreAddressForSeller - Helper for update store address for seller.
export { updateStoreAddressForSeller } from "./features/stores/actions/store-address-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreContentParams - Type contract for store content params.
export type { StoreContentParams } from "./features/stores/actions/store-query-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreQueryListParams - Type contract for store query list params.
export type { StoreQueryListParams } from "./features/stores/actions/store-query-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoreReviewsResult - Type contract for store reviews result.
export type { StoreReviewsResult } from "./features/stores/actions/store-query-actions";

// ./features/whatsapp-bot/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WhatsAppChatButton - Component for whats app chat button.
export { WhatsAppChatButton } from "./features/whatsapp-bot/components/WhatsAppChatButton";
export { SellerWhatsAppSettingsView } from "./features/whatsapp-bot/components/SellerWhatsAppSettingsView";
export type { SellerWhatsAppSettingsViewProps } from "./features/whatsapp-bot/components/SellerWhatsAppSettingsView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CheckoutMessageInput - Type contract for checkout message input.
export type { CheckoutMessageInput } from "./features/whatsapp-bot/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// IncomingWebhookPayload - Type contract for incoming webhook payload.
export type { IncomingWebhookPayload } from "./features/whatsapp-bot/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// OrderStatusKey - Type contract for order status key.
export type { OrderStatusKey } from "./features/whatsapp-bot/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SendWhatsAppInput - Type contract for send whats app input.
export type { SendWhatsAppInput } from "./features/whatsapp-bot/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StatusMessageInput - Type contract for status message input.
export type { StatusMessageInput } from "./features/whatsapp-bot/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StatusNotificationInput - Type contract for status notification input.
export type { StatusNotificationInput } from "./features/whatsapp-bot/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WebhookVerifyInput - Type contract for webhook verify input.
export type { WebhookVerifyInput } from "./features/whatsapp-bot/types/index";

// ./features/whatsapp-bot/server
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildCheckoutMessageURL - Helper for build checkout message url.
export { buildCheckoutMessageURL } from "./features/whatsapp-bot/helpers/whatsapp";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildStatusMessage - Helper for build status message.
export { buildStatusMessage } from "./features/whatsapp-bot/helpers/whatsapp";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildStatusNotificationURL - Helper for build status notification url.
export { buildStatusNotificationURL } from "./features/whatsapp-bot/helpers/whatsapp";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// buildPaymentProofReviewMessage - Helper for build payment proof review message (Tier PP).
export { buildPaymentProofReviewMessage } from "./features/orders/utils/payment-proof-message";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// isAdminNumber - Shared export for is admin number.
export { isAdminNumber } from "./features/whatsapp-bot/helpers/whatsapp";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// parseIncomingWebhookPayload - Helper for parse incoming webhook payload.
export { parseIncomingWebhookPayload } from "./features/whatsapp-bot/helpers/whatsapp";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// sendWhatsAppMessage - Shared export for send whats app message.
export { sendWhatsAppMessage } from "./features/whatsapp-bot/helpers/whatsapp";
// [SERVER-ONLY] Meta WhatsApp Business Cloud API helpers (WA1-WA8 integration)
export { sendWhatsAppBusinessMessage, syncProductsToCatalog, buildPurchaseAnnouncementMessage, buildGroupShareLink } from "./features/whatsapp-bot/helpers/whatsapp";
export type { WaBusinessSendInput, CatalogSyncProduct, CatalogSyncInput, CatalogSyncResult, PurchaseAnnouncementInput } from "./features/whatsapp-bot/types/index";

// ./features/wishlist/index
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WishlistCard - Component for wishlist card.
export { WishlistCard } from "./features/wishlist/components/WishlistPage";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WishlistPage - Component for wishlist page.
export { WishlistPage } from "./features/wishlist/components/WishlistPage";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WishlistHeartButton - the single wishlist heart. Replaced
// WishlistToggleButton, which was dead code with its own competing
// LoginRequiredModal; see the component for the full rationale.
export { WishlistHeartButton } from "./features/wishlist/components/WishlistHeartButton";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// WishlistView - Component for wishlist view.
export { WishlistView } from "./features/wishlist/components/WishlistView";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// buildWishlistColumns - Helper for build wishlist columns.
export { buildWishlistColumns } from "./features/wishlist/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useUserWishlist - React hook for use user wishlist.
export { useUserWishlist } from "./features/wishlist/hooks/useUserWishlist";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useWishlist - React hook for use wishlist.
export { useWishlist } from "./features/wishlist/hooks/useWishlist";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// useWishlistToggle - React hook for use wishlist toggle.
export { useWishlistToggle } from "./features/wishlist/hooks/useWishlistToggle";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// wishlistAdminColumns - Shared export for wishlist admin columns.
export { wishlistAdminColumns } from "./features/wishlist/columns/index";
// [CLIENT-SSR]-Runs in both SSR and browser â€" React component or hook that does not depend on browser-only APIs.
// wishlistItemSchema - Model for wishlist item schema.
export { wishlistItemSchema } from "./features/wishlist/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UseWishlistToggleReturn - Type contract for use wishlist toggle return.
export type { UseWishlistToggleReturn } from "./features/wishlist/hooks/useWishlistToggle";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserWishlistItem - Type contract for user wishlist item.
export type { UserWishlistItem } from "./features/wishlist/repository/user-wishlist.repository";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// UserWishlistResponse - Type contract for user wishlist response.
export type { UserWishlistResponse } from "./features/wishlist/hooks/useUserWishlist";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WishlistResponse - Type contract for wishlist response.
export type { WishlistResponse } from "./features/wishlist/types/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WishlistTab - Type contract for wishlist tab.
export type { WishlistTab } from "./features/wishlist/components/WishlistView";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WishlistToggleActions - Type contract for wishlist toggle actions.
export type { WishlistToggleActions } from "./features/wishlist/hooks/useWishlistToggle";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WishlistViewProps - Type contract for wishlist view props.
export type { WishlistViewProps } from "./features/wishlist/components/WishlistView";

// ./features/wishlist/server
// [DB]-Database layer â€" uses firebase-admin or another server-side DB SDK; can only run in a trusted server environment.
// UserWishlistRepository - Shared export for user wishlist repository.
export { UserWishlistRepository } from "./features/wishlist/repository/user-wishlist.repository";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// addToWishlist - Helper for add to wishlist.
export { addToWishlist } from "./features/wishlist/actions/wishlist-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// getWishlistForUser - Helper for get wishlist for user.
export { getWishlistForUser } from "./features/wishlist/actions/wishlist-actions";
// [SERVER-ONLY]-Server-only â€" uses Node.js, Next.js server internals, or third-party server SDKs (auth, email, payment, shipping).
// removeFromWishlist - Helper for remove from wishlist.
export { removeFromWishlist } from "./features/wishlist/actions/wishlist-actions";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EnrichedWishlistItem - Type contract for enriched wishlist item.
export type { EnrichedWishlistItem } from "./features/wishlist/actions/wishlist-actions";

// ./features/homepage/schemas/index
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// BANNER_HEIGHTS - Constant used across modules.
export { BANNER_HEIGHTS } from "./features/homepage/schemas/index";
export { homepageSectionTypeSchema } from "./features/homepage/schemas/index";
export { homepageSectionCreateSchema } from "./features/homepage/schemas/index";
export { resolveNextSectionOrder } from "./features/homepage/actions/homepage-section-actions";
export type { HomepageSectionCreateValues } from "./features/homepage/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// DEFAULT_SECTION_ORDER - Constant used across modules.
export { DEFAULT_SECTION_ORDER } from "./features/homepage/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// HOMEPAGE_SECTIONS_COLLECTION - Constant used across modules.
export { HOMEPAGE_SECTIONS_COLLECTION } from "./features/homepage/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// HOMEPAGE_SECTIONS_INDEXED_FIELDS - Constant used across modules.
export { HOMEPAGE_SECTIONS_INDEXED_FIELDS } from "./features/homepage/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// MAX_ACTIVE_SLIDES - the hero-rail slide ceiling. Relocated 2026-10-31 out of
// the (now-deleted) carouselSlides schema file — it is still read by the live
// events-to-slides computation.
export { MAX_ACTIVE_SLIDES } from "./features/homepage/constants/carousel";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// createHomepageSectionId - Helper for create homepage section id.
export { createHomepageSectionId } from "./features/homepage/schemas/index";
// [SCHEMA]-Schema / data-shape constant â€" Zod validator, default-value object, or Firestore collection/field name constant.
// homepageSectionQueryHelpers - Shared export for homepage section query helpers.
export { homepageSectionQueryHelpers } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CollectorDropsSectionConfig - Type contract for collector drops section config.
export type { CollectorDropsSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BannerSectionConfig - Type contract for banner section config.
export type { BannerSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BlogArticlesSectionConfig - Type contract for blog articles section config.
export type { BlogArticlesSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// BrandsSectionConfig - Type contract for brands section config.
export type { BrandsSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// CategoriesSectionConfig - Type contract for categories section config.
export type { CategoriesSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// EventsSectionConfig - Type contract for events section config.
export type { EventsSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FAQSectionConfig - Type contract for faqsection config.
export type { FAQSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// FeaturesSectionConfig - Type contract for features section config.
export type { FeaturesSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HomepageSectionCreateInput - Type contract for homepage section create input.
export type { HomepageSectionCreateInput } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HomepageSectionDocument - Type contract for homepage section document.
export type { HomepageSectionDocument } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// HomepageSectionUpdateInput - Type contract for homepage section update input.
export type { HomepageSectionUpdateInput } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// NewsletterSectionConfig - Type contract for newsletter section config.
export type { NewsletterSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ProductsSectionConfig - Type contract for products section config.
export type { ProductsSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// ReviewsSectionConfig - Type contract for reviews section config.
export type { ReviewsSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SectionConfig - Type contract for section config.
export type { SectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// SectionType - Type contract for section type.
export type { SectionType } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// StoresSectionConfig - Type contract for stores section config.
export type { StoresSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// TrustIndicatorsSectionConfig - Type contract for trust indicators section config.
export type { TrustIndicatorsSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WelcomeSectionConfig - Type contract for welcome section config.
export type { WelcomeSectionConfig } from "./features/homepage/schemas/index";
// [TYPE]-TypeScript type-only export â€" erased at compile time, zero runtime cost.
// WhatsAppCommunitySectionConfig - Type contract for whats app community section config.
export type { WhatsAppCommunitySectionConfig } from "./features/homepage/schemas/index";

// -- Missing UI primitives ------------------------------------------------------
export { Button } from "./ui/components/Button";
export { Heading } from "./ui/components/Typography";
export { Spinner } from "./ui/components/Spinner";
export { IconButton } from "./ui/components/IconButton";
export { Progress, IndeterminateProgress } from "./ui/components/Progress";
export { Pagination } from "./ui/components/Pagination";
export { PageLoader } from "./ui/components/PageLoader";
export { ModalFooter } from "./ui/components/Modal";
export { UnsavedChangesModal } from "./ui/components/UnsavedChangesModal";
export { ResponsiveView } from "./ui/components/ResponsiveView";
export { Textarea } from "./ui/components/Textarea";
export { Checkbox } from "./ui/components/Checkbox";
export { ActionRow } from "./ui/components/ActionRow";
export type { ActionRowProps, ActionRowAlign } from "./ui/components/ActionRow";
export { ToastProvider } from "./ui/components/Toast";
export { StarRating } from "./ui/components/StarRating";
export { StepperNav } from "./ui/components/StepperNav";
export { ViewToggle } from "./ui/components/ViewToggle";
export { PriceDisplay } from "./ui/components/PriceDisplay";
export { GatedPrice, PricesOnly } from "./ui/components/GatedPrice";
export { SummaryCard } from "./ui/components/SummaryCard";
export { CountdownDisplay } from "./ui/components/CountdownDisplay";
export { ItemRow } from "./ui/components/ItemRow";
export { HorizontalScroller } from "./ui/components/HorizontalScroller";
export { CarouselNav, CAROUSEL_RAIL_MAX } from "./ui/components/CarouselNav";
export type { CarouselNavProps, CarouselNavTone } from "./ui/components/CarouselNav";
export { CardBody } from "./ui/components/Card";
export { MenuTrigger, MenuContent, MenuSeparator } from "./ui/components/Menu";
export { RoleBadge } from "./ui/components/RoleBadge";
export { SkipToMain } from "./ui/components/SkipToMain";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/components/Tabs";
export { PasswordStrengthIndicator } from "./ui/components/PasswordStrengthIndicator";
export { TablePagination } from "./ui/components/TablePagination";
// TabBarShell - rail + overflow scroll arrows around a role="tablist"; TabBarButton / TabsNavSelect - its two trigger flavours
export { TabBarShell, TabBarButton, TabsNavSelect } from "./ui/components/TabBarShell";
export type { TabBarShellProps, TabBarButtonProps, TabsNavSelectProps } from "./ui/components/TabBarShell";
// OverflowRow - pill/tab row that collapses into a searchable dropdown when it measures wider than its container
export { OverflowRow } from "./ui/components/OverflowRow";
export type { OverflowRowProps, OverflowRowItem, OverflowRowDotTone, OverflowRowLinkProps } from "./ui/components/OverflowRow";
export { Stack } from "./ui/components/Layout";
export { classNames, mergeTailwindClasses } from "./ui/style.helper";
export { SideModal } from "./ui/components/SideModal";
export { SideDrawer } from "./ui/components/SideDrawer";
export { RichText } from "./ui/rich-text/RichText";
export { RichTextRenderer } from "./ui/rich-text/RichTextRenderer";
export type { RichTextRendererProps } from "./ui/rich-text/RichTextRenderer";
export { SlottedListingView } from "./ui/components/SlottedListingView";
export { DetailViewShell } from "./ui/components/DetailViewShell";
export { StackedViewShell } from "./ui/components/StackedViewShell";
export { buildColumns, createColumnBuilder } from "./ui/columns/build-columns";
export { renderBoolean, renderCurrency, renderCurrencyCompact, renderCount, renderNullable } from "./ui/columns/column-renderers";
export { Ol } from "./ui/components/Semantic";
export { LoginRequiredModal } from "./ui/components/LoginRequiredModal";
export type { LoginRequiredModalProps } from "./ui/components/LoginRequiredModal";
export { isAuthError } from "./errors/normalize";

// -- Missing constants ----------------------------------------------------------
export {
  API_ENDPOINTS, API_ROUTES, LOGS_ENDPOINTS, AUTH_ENDPOINTS, ACCOUNT_ENDPOINTS,
  NOTIFICATIONS_ENDPOINTS, ADMIN_ENDPOINTS, COLLECTOR_DROP_ENDPOINTS,
  BID_ENDPOINTS, CART_ENDPOINTS, CATEGORY_ENDPOINTS, CHECKOUT_ENDPOINTS,
  FAQ_ENDPOINTS, HOMEPAGE_ENDPOINTS, ANALYTICS_ENDPOINTS, MEDIA_ENDPOINTS,
  ORDER_ENDPOINTS, PREORDER_ENDPOINTS, PRODUCT_ENDPOINTS, REVIEW_ENDPOINTS,
  SEARCH_ENDPOINTS, SELLER_ENDPOINTS, BLOG_ENDPOINTS, WISHLIST_ENDPOINTS,
  COLLECTION_CACHE_PATHS, resolveEndpoint, resolveEndpointFn,
  ROUTES, PUBLIC_ROUTES, PROTECTED_ROUTES, AUTH_ROUTES,
  WISHLIST_MAX, HISTORY_MAX, CART_MAX_ITEMS,
  WISHLIST_DOC_ID, HISTORY_DOC_ID,
  WISHLIST_COLLECTION, HISTORY_COLLECTION,
} from "./constants/index";

// Wishlist server errors (server-only via tree-shake â€" class only, no firebase-admin at module scope)
export { WishlistFullError } from "./features/wishlist/repository/user-wishlist.repository";

// History â€" client hook + guest util are safe in main barrel; repository is server-only
export {
  useHistory,
  useHistoryMergeOnLogin,
  getGuestHistory,
  trackGuestHistory,
  removeGuestHistoryItem,
  clearGuestHistory,
  getGuestHistoryCount,
  type GuestHistoryItem,
  type GuestHistoryType,
  type UserHistoryItem,
  type HistoryProductType,
  type HistoryItemSnapshot,
  type TrackArgs as TrackHistoryArgs,
} from "./features/history";
export {
  historyRepository,
  UserHistoryRepository,
  trackHistoryView,
  getHistoryForUser,
  removeHistoryItem,
  clearHistory,
  mergeGuestHistory,
} from "./features/history/server";

// Missing React hooks and providers
export {
  useMediaQuery, useBreakpoint, useClickOutside, useKeyPress, useLongPress,
  useGesture, useSwipe, useSession, useAuth, useCountdown,
  useCamera, useBulkSelection, useUrlTable, usePendingFilters, usePendingTable,
  useUnsavedChanges, UNSAVED_CHANGES_EVENT, useBulkAction, useEntityDelete, useContainerGrid,
  useMessage, useModalStack, RTDBPayloadStatus,
} from "./react/index";

// Missing core types (already exported above; skipped to avoid duplicates)

// Missing auth feature components
export { RoleGate, ProtectedRoute } from "./features/auth/components/Guards";
export { SocialAuthButtons } from "./features/auth/components/SocialAuthButtons";
export { LoginForm } from "./features/auth/components/LoginForm";
export { RegisterForm } from "./features/auth/components/RegisterForm";
export { ForgotPasswordView } from "./features/auth/components/ForgotPasswordView";
export { ResetPasswordView } from "./features/auth/components/ResetPasswordView";
export { VerifyEmailView } from "./features/auth/components/VerifyEmailView";
export { OAuthLoadingView } from "./features/auth/components/OAuthLoadingView";
export type {
  RoleGateProps, ProtectedRouteProps, AuthGuardUser, AuthRouteConfig,
  LoginFormProps, LoginFormValues, RegisterFormProps, RegisterFormValues,
  ForgotPasswordViewProps, ResetPasswordViewProps, VerifyEmailViewProps,
} from "./features/auth/index";

// Missing cart and checkout feature components
export { CartItemRow, CartDrawer } from "./features/cart/components/CartDrawer";
export { CartView } from "./features/cart/components/CartView";
export { CartSummary } from "./features/cart/components/CartSummary";
export { ShippingPicker } from "./features/cart/components/ShippingPicker";
export type { ShippingPickerProps } from "./features/cart/components/ShippingPicker";
export { CheckoutView } from "./features/cart/components/CheckoutView";
export { CheckoutAddressStep } from "./features/cart/components/CheckoutAddressStep";
export { CheckoutSuccessView } from "./features/cart/components/CheckoutSuccessView";
export { CheckoutStepper } from "./features/checkout/components/CheckoutStepper";

// Missing account hooks
export { useProfile as useCurrentProfile, useUpdateProfile as useUpdateCurrentProfile } from "./features/account/index";

// Missing auth hooks
export { useLogout } from "./features/auth/hooks/useLogout";

// Missing UI semantic wrappers and typography
export { Text, Label, Span } from "./ui/components/Typography";
// Variant catalogue type exports for Typography shaping modifiers (transform,
// truncate, numeric, italic, family, align, gradient).
export type {
  ColorVariant,
  FontFamily,
  TextAlign,
  TextGradient,
  TextTransform,
  TextTruncate,
} from "./ui/components/Typography";
export { Input } from "./ui/components/Input";
export { Section, Main, Nav, Ul, Li } from "./ui/components/Semantic";

// Missing media helpers
export { coerceMediaField, coerceMediaFieldArray, getMediaUrl, mediaFieldSchema } from "./features/media/types/index";

// -- Missing UI layout / typography components
export { FlowDiagram } from "./ui/components/FlowDiagram";
export { Grid, Row } from "./ui/components/Layout";
export { TextLink } from "./ui/components/TextLink";

// -- Missing react context types
export type { SessionUser } from "./react/contexts/SessionContext";
export type { UseUrlTableOptions } from "./react/hooks/useUrlTable";

// -- Missing values
export { SUCCESS_MESSAGES } from "./values/success-messages";

// -- Missing order utils
export { splitCartIntoOrderGroups } from "./features/orders/utils/order-splitter";
// S-SBUNI-5 2026-05-13 â€" bundle-aware order item grouping for receipts.
export {
 groupOrderItemsByLine,
 type LineOrderGroup,
 type OrderItemForLineGrouping,
} from "./features/orders/index";

// -- Missing utils
export { formatCurrency, formatFileSize } from "./utils/number.formatter";
export { formatMonthYear } from "./utils/date.formatter";
export { generateMediaFilename } from "./utils/id-generators"; // generateProductImageFilename already exported from "./utils/id-generators";
export { deriveContextTypeFromFilename } from "./utils/id-generators";
export type { MediaFilenameContext } from "./utils/id-generators";
export {
  resolveMediaUrl,
  resolveVideoUrl,
  FIREBASE_STORAGE_HOST,
  GCS_HOST,
  isStoredMediaRef,
  getYouTubeVideoId,
  MEDIA_PROXY_PREFIX,
  MEDIA_URL_MAX_LENGTH,
  MEDIA_URL_MESSAGE,
  APPROVED_MEDIA_DOMAINS,
} from "./utils/media-url";

export { generateFAQId } from "./utils/id-generators";
export type { GenerateFAQIdInput } from "./utils/id-generators";
export { generateCroppedImageFilename } from "./utils/id-generators";

// D5 + VC7 buyer↔seller conversations were deleted 2026-08-31 (W11/D16). The
// feature had two pages, five API routes and a repository, and one live CTA
// anywhere in the product — the classified PDP's "Contact Seller" — which now
// opens the offer form instead. See `offerIsOnlyPurchasePath`.
// SB-UNI-B â€" SublistingCategoryDocument deleted; sublistings are CategoryDocument with categoryType:"sublisting".
// Product features feature schemas (FI1)
export {
  PRODUCT_FEATURES_COLLECTION,
  PRODUCT_FEATURE_PREFIX,
  MAX_STORE_CUSTOM_FEATURES,
  MAX_FEATURES_PER_PRODUCT,
  PRODUCT_FEATURE_SIEVE_FIELDS,
  FEATURE_GROUP_VALUES,
  FEATURE_GROUP_LABEL,
  isFeatureIconPath,
} from "./features/products/schemas/product-features";
export type { FeatureGroup } from "./features/products/schemas/product-features";

// Tax codes feature schemas (B3) — HSN + GST rate as an entity.
export {
  TAX_CODES_COLLECTION,
  TAX_CODE_PREFIX,
  TAX_CODE_FIELDS,
  TAX_CODE_SIEVE_FIELDS,
  TAX_CODE_UPDATABLE_FIELDS,
  GST_RATE_VALUES,
  createTaxCodeId,
  isValidHsnCode,
} from "./features/tax-codes/schemas/firestore";
export type {
  TaxCodeDocument,
  TaxCodeCreateInput,
  TaxCodeUpdateInput,
  GstRate,
  HsnChapter,
} from "./features/tax-codes/schemas/firestore";
export { taxCodeFormSchema, GST_RATE_OPTIONS, HSN_CHAPTER_OPTIONS } from "./features/tax-codes/schemas/tax-code-form";
export type { TaxCodeFormValues } from "./features/tax-codes/schemas/tax-code-form";

/*
 * 🛑 THE SEED LOADER DESTRUCTURES THESE TWO OFF THE BARREL, so an unexported
 * collection name is not a tidiness issue — it is a collection that can
 * never load.
 *
 * `seed-cli.mjs` reads `COLLECTION_MAP` from one big destructure of
 * `@mohasinac/appkit`. A name missing there is `undefined`, which Firestore
 * rejects as `Value for argument "collectionPath" is not a valid resource
 * path` — so `appkit-seed status` and `load` both error on that row alone
 * while every other collection succeeds. Measured 2026-10-24: eventLikes
 * (23 rows) and disputeReasons (11 rows) were both stuck at 0 in the
 * database for exactly this reason, and the error names the path, never the
 * missing export.
 *
 * Exported straight from the defining schema module rather than through a
 * feature index (Root Cause #18). Both files carry ONLY `import type`, which
 * the compiler erases, so neither drags a runtime chain into the client
 * bundle — the check that matters before adding anything here.
 */
export { EVENT_LIKES_COLLECTION } from "./features/events/schemas/likes";
export { DISPUTE_REASON_COLLECTION } from "./features/dispute-reasons/schemas/firestore";

// Wire contracts for /api/admin/tax-codes. BOTH are .strict(): z.object()
// strips unknown keys (a PATCH returning 200 having written nothing),
// .passthrough() writes whatever arrives.
export {
  taxCodeCreateSchema,
  taxCodeUpdateSchema,
} from "./features/tax-codes/schemas/tax-codes.validators";
export type {
  TaxCodeCreatePayload,
  TaxCodeUpdatePayload,
} from "./features/tax-codes/schemas/tax-codes.validators";
export type {
  ProductFeatureDocument,
  ProductFeatureCreateInput,
  ProductFeatureUpdateInput,
  ProductFeatureScope,
  ProductFeatureCategory,
  ProductFeatureProductType,
  ProductFeatureIcon,
} from "./features/products/schemas/product-features";
// Product features zod validators (S8 refactor â€" shared by admin + store API routes)
export {
 productFeatureAdminCreateSchema,
 productFeatureStoreCreateSchema,
 productFeatureUpdateSchema,
 PRODUCT_FEATURE_PRODUCT_TYPE_ENUM,
 PRODUCT_FEATURE_CATEGORY_ENUM,
 PRODUCT_FEATURE_SCOPE_ENUM,
} from "./features/products/schemas/product-features.validators";
export type {
 ProductFeatureAdminCreatePayload,
 ProductFeatureStoreCreatePayload,
 ProductFeatureUpdatePayload,
} from "./features/products/schemas/product-features.validators";
// parseListingParams / serializeListingParams â€" short-name URL params (Q2 / S12)
export {
  LISTING_PARAM_NAMES,
  parseListingParams,
  parseListingSearchParams,
  serializeListingParams,
} from "./utils/listing-params";
export type { ListingParams } from "./utils/listing-params";
// Product features UI option lists (S8 refactor â€" shared by editor + selector)
export {
 PRODUCT_FEATURE_CATEGORY_OPTIONS,
 PRODUCT_FEATURE_PRODUCT_TYPE_OPTIONS,
 PRODUCT_FEATURE_SCOPE_OPTIONS,
 PRODUCT_FEATURE_ICON_COLOR_OPTIONS,
 PRODUCT_FEATURE_SCOPE_TABS,
 PRODUCT_FEATURE_DEFAULT_DISPLAY_ORDER,
 PRODUCT_FEATURE_CARD_MAX_VISIBLE,
 PRODUCT_FEATURE_QUERY_STALE_MS,
} from "./features/products/constants/product-features.constants";
// SB10-A listing tab constants
export {
 CATEGORY_PAGE_TABS,
 STORE_PAGE_TABS,
 SELLER_LISTING_TABS,
 PRODUCT_TYPE_FILTER_TABS,
 ART_STICKERS_TYPE_FILTER_TABS,
 GENERIC_PRODUCT_LISTING_TYPES,
 ART_STICKERS_LISTING_TYPES,
} from "./features/products/constants/listing-tabs";
// SEARCH_RESULT_TABS was removed 2026-08-21 — it had zero consumers (/search
// renders no type tabs) and was one more hand-maintained listing-type array to
// keep in sync. Rebuild it from PRODUCT_TYPE_FILTER_TABS if /search ever needs
// type tabs.
export type {
 ListingTab,
 CategoryTabId,
 StoreTabId,
 SellerListingTabId,
} from "./features/products/constants/listing-tabs";
export {
 STANDARD_SORT_OPTIONS,
 STANDARD_PUBLIC_SORT_OPTIONS,
 COLLECTOR_DROP_SORT_OPTIONS,
 COLLECTOR_DROP_PUBLIC_SORT_OPTIONS,
 PREORDER_SORT_OPTIONS,
 PREORDER_PUBLIC_SORT_OPTIONS,
 BUNDLE_SORT_OPTIONS,
 RANDOM_LOTS_SORT_OPTIONS,
 RANDOM_LOTS_PUBLIC_SORT_OPTIONS,
} from "./features/products/constants/sieve";
// The per-type sort lookup is DERIVED from the listing-type plugin registry
// (it used to be a hand-written map here that was missing five of the nine
// types and still listed the long-dead `bundle` listingType).
export {
 sortOptionsFor,
 commonSortOptionsFor,
 hideDefaultsFor,
} from "./_internal/shared/listing-types/_registry";
export type { ListingHideDefault } from "./_internal/shared/listing-types/_registry";
export type { SortOption } from "./features/products/constants/sieve";
// SB10-C admin + seller filter-chip tab sets (S8 2026-05-13)
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
 SELLER_COLLECTOR_DROP_STATUS_TABS,
 SELLER_ORDER_STATUS_TABS,
 SELLER_OFFER_STATUS_TABS,
 SELLER_BID_STATUS_TABS,
} from "./features/admin/constants/filter-tabs";
export type { AdminFilterTab } from "./features/admin/constants/filter-tabs";
// Grouped listings feature schemas
export { GROUPED_LISTINGS_COLLECTION } from "./features/grouped/schemas/firestore";
// SB-UNI-D + V â€" BundleDocument + bundlesRepository + features/bundles/
// folder all deleted. Bundles are now `categoryType:"bundle"` rows on the
// categories collection with `bundlePrice` / `bundleQueryRule` /
// `bundleStockStatus` / `bundleQueryResolvedAt` / `bundleProductIds[]`.
// Replacement component: CategoryBundlesListing in features/categories/components.
export { CategoryBundlesListing } from "./features/categories/components/CategoryBundlesListing";
export type { CategoryBundlesListingProps } from "./features/categories/components/CategoryBundlesListing";
export type { BundleQueryRule } from "./features/categories/schemas/firestore";
export {
  BUNDLE_MIN_ITEMS,
  BUNDLE_MAX_ITEMS,
  BUNDLE_MAX_PER_USER_DEFAULT,
  BUNDLES_PAGE_SIZE,
  BUNDLES_FEATURED_LIMIT,
} from "./_internal/shared/features/categories/bundle-config";
// S-SBUNI-4 follow-up â€" shared bundle UI copy + stock-badge variant map.
export {
 BUNDLE_COPY,
 BUNDLE_STOCK_VARIANT,
} from "./_internal/shared/features/categories/bundle-copy";
// S-SBUNI-RULES 2026-05-13 â€" shared copy for refund / shipping / sibling-payment UI.
export { REFUND_COPY } from "./_internal/shared/features/orders/refund-copy";
// Return / refund reasons — the closed enum the final-sale gate branches on.
// See the module docstring for why the exempt set is "seller or carrier fault"
// rather than "serious reasons".
export {
  RETURN_REASON,
  FINAL_SALE_EXEMPT_REASONS,
  RETURN_REASON_LABEL,
  RETURN_REASON_GROUP_LABEL,
  isFinalSaleExempt,
  isReturnReason,
  selectableReturnReasons,
} from "./_internal/shared/features/orders/return-reasons";
export type { ReturnReason } from "./_internal/shared/features/orders/return-reasons";

// Dispute KINDS and their gates. `_internal/*` is not a subpath export, so a
// consumer route reaches these only through a barrel.
export {
  DISPUTE_KIND,
  DISPUTE_KIND_LABEL,
  DISPUTE_GATE,
  DISPUTE_TRANSIT_WINDOW_DAYS,
  DISPUTE_NOT_REACHED_GRACE_DAYS,
  isDisputeKind,
  checkDisputeGate,
  resolveDisputeEtd,
  disputeNotReachedFilableFrom,
} from "./_internal/shared/features/orders/dispute-reasons";
export type {
  DisputeKind,
  DisputeGateOrder,
  DisputeGateResult,
} from "./_internal/shared/features/orders/dispute-reasons";

// S-SBUNI-4 follow-up â€" shared admin bundle zod schemas.
export {
 bundleCreateSchema,
 bundleUpdateSchema,
 bundleQueryRuleSchema,
 bundleDisplaySchema,
 type BundleCreateBody,
 type BundleUpdateBody,
} from "./_internal/shared/features/categories/bundle-schemas";

export type { GroupedListingDocument, GroupTheme, GroupVisibility } from "./features/grouped/schemas/firestore";
export {
  navItemFormSchema,
  navItemCreateSchema,
  navItemUpdateSchema,
  type NavItemFormValues,
} from "./features/admin/schemas/nav-item-form";
export {
  groupedListingFormSchema,
  groupedListingCreateSchema,
  groupedListingUpdateSchema,
  type GroupedListingFormValues,
} from "./features/grouped/schemas/grouped-listing-form";

// Scam registry â€" seed data

// Product features â€" seed data (FI2)
/*
 * 🛑 Registering a seed collection takes FOUR edits and three of them are
 * silent if missed: seed/index.ts, THIS re-export, and seed-cli's own import
 * plus its two maps. With this line absent, `appkit-seed status` reported
 * `taxCodes  seed 0  in db 0` — the collection looked registered and simply
 * had no data, which is indistinguishable from an empty fixture set.
 */
/*
 * E4/D12 — generated from the extracted corpus research.
 *
 * 🛑 Exported from the MAIN barrel, because `seed-cli.mjs` destructures all of
 * its seed data from `appkit` (not from `/server`, which is what I assumed
 * first). Adding a collection to `seed/index.ts` and `COLLECTION_MAP` alone
 * leaves the loader reading `undefined` — and `appkit-seed status` then reports
 * "0 seed rows", i.e. a collection that looks registered and loads nothing.
 * That is Root Cause #90 exactly: the PII half was wired and the LOADING half
 * was not, so every grep found real hits while the collection stayed empty.
 */
// E4/D12 — the collection constants and types.
export {
  PART_GLOSSARY_COLLECTION,
  MODEL_COMPOSITION_COLLECTION,
  PART_SLOT_VALUES,
  PART_SLOT_LABEL,
  ALL_PART_SLOTS,
  LISTING_TYPE_HAS_COMPOSITION,
  partSlotFromSegment,
  partGlossaryId,
} from "./features/parts/schemas/firestore";
export type {
  PartGlossaryDocument,
  ModelCompositionDocument,
  ModelSlot,
  ModelSlotMerge,
  PartSlot,
} from "./features/parts/schemas/firestore";
/*
 * 🛑 Exported from the MAIN barrel, not just `seed/index.ts`. `seed-cli.mjs`
 * destructures its seed data from the BARE `@mohasinac/appkit` package, which
 * resolves through THIS file — so an export present only on the inner barrel is
 * invisible to the loader and the collection reports "no seed data, skipping"
 * with exit 0. That is Root Cause #90 exactly, and it is how `mediaAssets`
 * read "504 seed / 0 in db" while all 504 objects sat in the bucket.
 */
export {
  BEYS_COLLECTION,
  BEY_PRODUCTS_COLLECTION,
  beyId,
} from "./features/beys/schemas/firestore";
export type {
  BeyDocument,
  BeyProductDocument,
  BeyCompositionEntry,
  BeyRatings,
  BeyDerivationCoverage,
  BeyProductAssortmentEntry,
} from "./features/beys/schemas/firestore";
export { BeyDetailPageView } from "./features/beys/components/BeyDetailPageView";
export type { BeyDetailPageViewProps, BeyListingRow } from "./features/beys/components/BeyDetailPageView";
// D12 — the public part surfaces.
export { ModelCompositionPanel } from "./features/parts/components/ModelCompositionPanel";
export {
  PartsIndexPageView,
  PartClassificationPageView,
} from "./features/parts/components/PartsIndexPageView";
export { PartDetailPageView } from "./features/parts/components/PartDetailPageView";
export { AssemblyDrawer } from "./features/parts/components/AssemblyDrawer";
export type {
  AssemblyDrawerProps,
  AssemblyPartOption,
  AssemblyRow,
  AssemblyOutcome,
} from "./features/parts/components/AssemblyDrawer";
export type { PartListingRow } from "./features/parts/components/PartDetailPageView";

// Scam registry â€" schema types and constants
export {
  SCAMMER_COLLECTION,
  SCAMMER_ID_PREFIX,
  SCAMMER_MATCH_FIELDS,
  SCAMMER_INDEXED_FIELDS,
  SCAMMER_FIELDS,
  SCAMMER_INCIDENTS_SUBCOLLECTION,
  SCAMMER_COMMENTS_SUBCOLLECTION,
  SCAMMER_CONTESTS_SUBCOLLECTION,
  MAX_COMMENT_BODY_LENGTH,
  MAX_PENDING_SCAMMER_REPORTS_PER_USER,
  ScammerStatusValues,
  ScamPlatformValues,
  SocialPlatformValues,
  ContestTypeValues,
  ContestStatusValues,
  SCAM_PLATFORM_LABELS,
  SOCIAL_PLATFORM_LABELS,
  SCAMMER_STATUS_LABELS,
  CONTEST_TYPE_LABELS,
  CONTEST_STATUS_LABELS,
  DEFAULT_SCAMMER_DATA,
  DEFAULT_SCAMMER_INCIDENT_DATA,
  DEFAULT_SCAMMER_COMMENT_DATA,
  DEFAULT_SCAMMER_CONTEST_DATA,
} from "./features/scams/schemas/firestore";
export type {
  ScammerStatus,
  ScamPlatform,
  SocialPlatform,
  ContestType,
  ContestStatus,
  ScammerMatchField,
  ScammerMatchStrength,
  ScammerSocialMedia,
  ScammerDocument,
  ScammerIncidentDocument,
  ScammerCommentDocument,
  ScammerContestDocument,
  ScammerSuggestion,
  ScammerCreateInput,
  ScammerAdminUpdateInput,
  ScammerIncidentCreateInput,
  ScammerCommentCreateInput,
  ScammerContestCreateInput,
} from "./features/scams/schemas/firestore";

// Scam registry â€" scam type definitions
export {
 SCAM_TYPES,
 SCAM_CATEGORIES,
 SCAM_TYPE_LABELS,
 SCAM_CATEGORY_LABELS,
 getScamType,
 getScamTypesByCategory,
 getCategoryForScamType,
 isScamType,
} from "./features/scams/constants/scam-types";
export type {
 ScamType,
 ScamCategory,
 ScamTypeDefinition,
 ScamCategoryDefinition,
} from "./features/scams/constants/scam-types";

// Scam Registry view components (SCAM3â€"SCAM4)
export { ScamRegistryView } from "./features/scams/components/ScamRegistryView";
export type { ScamRegistryViewProps } from "./features/scams/components/ScamRegistryView";
export { ScamProfileView } from "./features/scams/components/ScamProfileView";
export type { ScamProfileViewProps } from "./features/scams/components/ScamProfileView";
export { ScamAwarenessModal } from "./features/scams/components/ScamAwarenessModal";
export type { ScamAwarenessModalProps } from "./features/scams/components/ScamAwarenessModal";
export { SellerTrustBadge } from "./features/scams/components/SellerTrustBadge";
export type { SellerTrustBadgeProps } from "./features/scams/components/SellerTrustBadge";

// Scam server actions
export {
  listVerifiedScammers,
  getPublicScammerById,
  getScammerProfilePageData,
  getSellerTrustStatus,
} from "./features/scams/actions/scam-actions";
export type { ScammerProfilePageData } from "./features/scams/actions/scam-actions";
export type { ScammerListResult } from "./features/scams/actions/scam-actions";
export type { SellerTrustResult, SellerTrustStatus } from "./features/scams/actions/scam-actions";

// --- Shell primitives (UX1/UX2/UX3/UX6) ----------------------------------------
// [CLIENT] SellerProductShell â€" full-flow create/edit shell for standard, collector drop, and pre-order listings.
export { SellerProductShell } from "./features/seller/components/SellerProductShell";
export type { SellerProductShellProps, SellerProductDraft, ProductListingMode } from "./features/seller/components/SellerProductShell";
// [CLIENT] CategoryInlineSelect â€" searchable category selector with optional inline quick-create.
export { CategoryInlineSelect } from "./features/seller/components/CategoryInlineSelect";
export type { CategoryInlineSelectProps } from "./features/seller/components/CategoryInlineSelect";
/*
 * 🛑 The category-content Zod schemas are deliberately NOT exported, and this
 * note exists so nobody adds them.
 *
 * Measured 2026-10-11: appkit compiles against **zod 3.25.76**
 * (`appkit/node_modules/zod`, pinned `^3.24.0`) while the consumer resolves
 * **zod 4.4.3**. Those are different majors with incompatible type identities,
 * so an appkit `ZodObject` nested inside a consumer `z.array(...)` fails to
 * typecheck — it is not a `dedupe-peer-deps` miss but a genuine version split.
 *
 * The direction that DOES work is consumer-schema → appkit handler, which is
 * why every route declaring its own schema and handing it to
 * `createRouteHandler` is fine. Sharing a schema the other way is not
 * available until the two agree on a major.
 */
// The ONE alert-metric vocabulary (C3a) plus the shared low-stock threshold.
// Exported because the consumer needs the threshold too: the alert evaluator,
// the seller products column and the store dashboard tile must agree on what
// "low" means, or a seller gets a warning from one and a clean bill from
// another.
export {
  ALERT_METRIC_VALUES,
  ALERT_METRICS,
  isAlertMetric,
  alertMetricsForScope,
  LOW_STOCK_THRESHOLD,
} from "./features/store-extensions/constants/alert-metrics";
export type {
  AlertMetric,
  AlertMetricDef,
  AlertMetricScope,
  AlertMetricUnit,
} from "./features/store-extensions/constants/alert-metrics";
// [CLIENT] CategoryTemplatePicker — the seller form's category description-template
// picker (C2c). Fills SellerProductShell's `renderTemplateSelector` slot.
export { CategoryTemplatePicker, variantForCondition } from "./features/categories/components/CategoryTemplatePicker";
export type { CategoryTemplatePickerProps, CategoryTemplateApply } from "./features/categories/components/CategoryTemplatePicker";
// [CLIENT] PriceGuidanceHint — the seller form's market-price hint, fills
// ProductForm's `renderPriceGuidance` slot. Same reasoning as the sibling
// above: seller-facing, never public (CLAUDE.md § "Guest price gating").
export { PriceGuidanceHint } from "./features/categories/components/PriceGuidanceHint";
export type { PriceGuidanceHintProps } from "./features/categories/components/PriceGuidanceHint";
// [CLIENT] BrandInlineSelect â€" searchable brand selector with inline quick-create (default: allowCreate=true).
export { BrandInlineSelect } from "./features/seller/components/BrandInlineSelect";
export type { BrandInlineSelectProps } from "./features/seller/components/BrandInlineSelect";
// [CLIENT] SublistingInlineSelect â€" searchable sub-listing-category picker with optional admin quick-create.
export { SublistingInlineSelect } from "./features/seller/components/SublistingInlineSelect";
export type { SublistingInlineSelectProps } from "./features/seller/components/SublistingInlineSelect";
// [CLIENT] CouponInlineSelect â€" searchable coupon picker (admin or store scope) with store-side quick-create.
export { CouponInlineSelect } from "./features/seller/components/CouponInlineSelect";
export type { CouponInlineSelectProps } from "./features/seller/components/CouponInlineSelect";
// [CLIENT] GroupInlineSelect â€" searchable grouped-listing picker with inline quick-create.
export { GroupInlineSelect } from "./features/seller/components/GroupInlineSelect";
export type { GroupInlineSelectProps } from "./features/seller/components/GroupInlineSelect";
// [CLIENT] ProductInlineSelect â€" searchable product picker (admin or store scope), single or multi-select.
export { ProductInlineSelect } from "./features/seller/components/ProductInlineSelect";
export type { ProductInlineSelectProps } from "./features/seller/components/ProductInlineSelect";
// [CLIENT] AddressInlineSelect â€" searchable address picker (user or store ownerType) with inline drawer-create.
export { AddressInlineSelect } from "./features/account/components/AddressInlineSelect";
export type { AddressInlineSelectProps } from "./features/account/components/AddressInlineSelect";

// --- Shell primitives (UX1/UX2/UX3) -------------------------------------------
// [CLIENT] FormShell â€" full-viewport edit overlay with sticky top/bottom bars, left section nav, and dirty-state hook.
export { FormShell, useFormShell } from "./features/shell/FormShell";
export type { FormShellSection, FormShellProps, UseFormShellResult } from "./features/shell/FormShell";
export { CommandPalette, useCommandPaletteHotkey } from "./features/shell/CommandPalette";
export type { CommandPaletteGroup, CommandPaletteProps } from "./features/shell/CommandPalette";
// [CLIENT] QuickFormDrawer â€" 40% desktop / 100% mobile auto-rendered field drawer.
export { QuickFormDrawer } from "./features/shell/QuickFormDrawer";
export type { QuickFieldType, QuickFieldDef, QuickFormDrawerProps } from "./features/shell/QuickFormDrawer";
// [CLIENT] SectionForm — collapsible-section form engine. Replaced StepForm,
// which was deleted 2026-08-26.
// Required section first and always open, one shared submit at the bottom, no
// per-section gate blocking a later section.
export {
  SectionForm,
  useSectionFormNav,
  orderSections,
  buildFieldToSectionIndex,
  sectionAnchorId,
} from "./features/shell/index";
export type { SectionDef, SectionFormProps, UseSectionFormNavResult } from "./features/shell/SectionForm";
// [CLIENT] EntityFormDefinition — one definition per entity, rendered as both a
// self-submitting quick drawer and a full page, so the two cannot drift.
export {
  deriveQuickFields,
  deriveQuickFieldNames,
  allDefinitionFields,
  applyDerive,
  assertNoDeriveCollision,
  humaniseFieldName,
} from "./features/shell/index";
export type { EntityFormDefinition } from "./features/shell/entity-form";

// OG image renderers (server-side JSX, used with next/og ImageResponse)
export { renderProductOgImage } from "./_internal/server/features/products/og";
export type { ProductOgData } from "./_internal/server/features/products/og";
export { renderCollectorDropOgImage } from "./_internal/server/features/collector-drops/og";
export type { CollectorDropOgData } from "./_internal/server/features/collector-drops/og";
export { renderPreOrderOgImage } from "./_internal/server/features/pre-orders/og";
export type { PreOrderOgData } from "./_internal/server/features/pre-orders/og";
export { renderStoreOgImage } from "./_internal/server/features/stores/og";
export type { StoreOgData } from "./_internal/server/features/stores/og";
export { renderBrandOgImage } from "./_internal/server/features/brands/og";
export type { BrandOgData } from "./_internal/server/features/brands/og";
export { renderBlogOgImage } from "./_internal/server/features/blog/og";
export type { BlogOgData } from "./_internal/server/features/blog/og";
export { renderEventOgImage } from "./_internal/server/features/events/og";
export type { EventOgData } from "./_internal/server/features/events/og";
export { renderSublistingCategoryOgImage } from "./_internal/server/features/sublisting-categories/og";
export type { SublistingCategoryOgData } from "./_internal/server/features/sublisting-categories/og";
export { renderPrivateProfileOgImage, renderUserProfileOgImage } from "./_internal/server/features/profile/og";
export type { UserProfileOgData } from "./_internal/server/features/profile/og";

// Listing-type capability registry â€" SB-UNI X1.
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
// Pencil / clone / bin for whoever owns the record, on a PUBLIC surface.
export { OwnerQuickActions } from "./features/admin/components/OwnerQuickActions";
export { RecordOwnerQuickActions } from "./features/admin/components/RecordOwnerQuickActions";
export type { RecordOwnerQuickActionsProps, RecordQuickActionResource } from "./features/admin/components/RecordOwnerQuickActions";
export type { OwnerQuickActionsProps, OwnerQuickActionsResource } from "./features/admin/components/OwnerQuickActions";
export type { ListingTypePlugin } from "./_internal/shared/listing-types/_registry";

// Checkout rule registry â€" pure TS, safe in both client and server bundles.
export {
 getListingRule,
 getCategoryRule,
 pickOrderType,
 getSplitKey,
 runSyncPreflight,
 CHECKOUT_RULES,
 CATEGORY_CHECKOUT_RULES,
 CHECKOUT_MAX_ORDERS_PER_TX,
 RANDOM_LOTS_MAX_REVEALS_PER_ORDER,
 BUNDLE_MAX_QTY_PER_TX,
 STANDARD_MAX_QTY_PER_LINE,
} from "./_internal/shared/checkout/rules";
export type {
 ListingCheckoutRule,
 CategoryCheckoutRule,
 CartItemProductPair,
 OrderItemInput,
 RefundPolicy,
} from "./_internal/shared/checkout/rules";

// Media upload limits â€" pure constants, safe in both client and server bundles.
export {
  MEGABYTE,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_VIDEO_BYTES,
  MAX_LABEL,
  MAX_BYTES,
  ALLOWED_IMAGE_MIMES,
  IMAGE_ACCEPT_ATTR,
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
  PRODUCT_MAX_IMAGES,
  REVIEW_MAX_IMAGES,
  PRODUCT_MAX_VIDEOS,
  PRODUCT_IMAGE_INDEX_MAX,
} from "./_internal/shared/media/limits";
export type {
  MediaKind,
  AllowedImageMime,
  AllowedVideoMime,
  AllowedDocMime,
  AllowedMime,
} from "./_internal/shared/media/limits";

// ── Field name constants — canonical source of truth for all Firestore field names ──
// NOTE: STORE_FIELDS, CATEGORY_FIELDS, EVENT_FIELDS, EVENT_ENTRY_FIELDS, PAYOUT_FIELDS,
// COUPON_FIELDS, CART_FIELDS, USER_FIELDS, ADDRESS_FIELDS, NOTIFICATION_FIELDS,
// SESSION_FIELDS, SCAMMER_FIELDS are already exported from feature barrels above.
export {
  PRODUCT_FIELDS,
  PRODUCT_STATUS_TRANSITIONS,
  ORDER_FIELDS,
  REVIEW_FIELDS,
  BID_FIELDS,
  AD_FIELDS,
  AD_TRACKED_FIELDS,
  BLOG_FIELDS,
  BRAND_FIELDS,
  WISHLIST_FIELDS,
  HISTORY_FIELDS,
  COUPON_USAGE_FIELDS,
  CAROUSEL_FIELDS,
  FAQ_FIELDS,
  HOMEPAGE_SECTION_FIELDS,
  SITE_SETTINGS_FIELDS,
  COMMON_FIELDS,
  OAUTH_STATE_VALUES,
  SCHEMA_DEFAULTS,
} from "./constants/field-names";

// ── Sort helpers ──────────────────────────────────────────────────────────────
export { SORT_DIR, sortBy } from "./constants/sort";
export type { SortDirection } from "./constants/sort";

// ── URL table keys + view mode ────────────────────────────────────────────────
export { TABLE_KEYS, VIEW_MODE } from "./constants/table-keys";
export type { TableKey, ViewMode } from "./constants/table-keys";

// ── Sieve query builder ───────────────────────────────────────────────────────
export {
  SIEVE_OP,
  SIEVE_PIPE_OPS,
  sieveFilter,
  sieveMultiEq,
  expandSieveParam,
  sieveAnd,
} from "./utils/sieve-builder";
export type { SieveOp } from "./utils/sieve-builder";

// searchTxt — normalized edge-n-gram search field. Supersedes search-tokens;
// see appkit/src/utils/search-txt.ts for why it is an array and not a string.
export {
  buildSearchTxt,
  parseSearchTxtQuery,
  matchesAllSearchTerms,
  normalizeSearchText,
  type SearchTxtOptions,
} from "./utils/search-txt";
// [CLIENT-ONLY] — Admin panel components for action/nav permission management.
export { ActionPermissionsManager } from "./features/site-settings/components/ActionPermissionsManager";
export type { ActionPermissionsManagerProps } from "./features/site-settings/components/ActionPermissionsManager";
export { NavPermissionsManager } from "./features/site-settings/components/NavPermissionsManager";
// ThemeManagerView — Site Settings → Themes tab UI. Manages
// siteSettings.theme.themes[] + defaultLightThemeId + defaultDarkThemeId.
export { ThemeManagerView } from "./features/site-settings/components/ThemeManagerView";
export type {
  ThemeManagerValue,
  ThemeManagerViewProps,
} from "./features/site-settings/components/ThemeManagerView";
export type { NavPermissionsManagerProps, NavGroup as NavPermissionsGroup, NavItem as NavPermissionsItem } from "./features/site-settings/components/NavPermissionsManager";

// ── Classified listing feature ─────────────────────────────────────────────────
export { getClassifiedForDetail } from "./_internal/server/features/classified/data";

// ── Digital-code listing feature ──────────────────────────────────────────────
export { getDigitalCodeForDetail } from "./_internal/server/features/digital-code/data";
export { PRODUCT_CODES_SUBCOLLECTION } from "./features/products/schemas/firestore";
export type { ProductCodeDocument } from "./features/products/schemas/firestore";

// ── Live-item listing feature ─────────────────────────────────────────────────
export { getLiveItemForDetail } from "./_internal/server/features/live/data";

// ── MarketplaceBundleCard (W3) ────────────────────────────────────────────────
export { MarketplaceBundleCard } from "./features/products/components/MarketplaceBundleCard";
export type {
  MarketplaceBundleCardProps,
  MarketplaceBundleCardData,
  MarketplaceBundleCardLabels,
} from "./features/products/index";

// ── Wave 4 Seller management views ───────────────────────────────────────────
export { SellerStoreCategoriesView } from "./features/seller/components/SellerStoreCategoriesView";
export type { SellerStoreCategoriesViewProps } from "./features/seller/components/SellerStoreCategoriesView";
export { SellerPayoutMethodsView } from "./features/seller/components/SellerPayoutMethodsView";
export type { SellerPayoutMethodsViewProps } from "./features/seller/components/SellerPayoutMethodsView";
export { SellerShippingConfigsView } from "./features/seller/components/SellerShippingConfigsView";
export type { SellerShippingConfigsViewProps } from "./features/seller/components/SellerShippingConfigsView";
export { SellerGoogleReviewsView } from "./features/seller/components/SellerGoogleReviewsView";
export type { SellerGoogleReviewsViewProps } from "./features/seller/components/SellerGoogleReviewsView";

// ── Wave 5 listing-type views ─────────────────────────────────────────────────
export { SellerBundlesView } from "./features/seller/components/SellerBundlesView";
export type { SellerBundlesViewProps } from "./features/seller/components/SellerBundlesView";
export { SellerClassifiedView } from "./features/seller/components/SellerClassifiedView";
export type { SellerClassifiedViewProps } from "./features/seller/components/SellerClassifiedView";
export { SellerArtView } from "./features/seller/components/SellerArtView";
export type { SellerArtViewProps } from "./features/seller/components/SellerArtView";
export { SellerStickersView } from "./features/seller/components/SellerStickersView";
export type { SellerStickersViewProps } from "./features/seller/components/SellerStickersView";
export { SellerSparesView } from "./features/seller/components/SellerSparesView";
export type { SellerSparesViewProps } from "./features/seller/components/SellerSparesView";
export { SellerDigitalCodesView } from "./features/seller/components/SellerDigitalCodesView";
export type { SellerDigitalCodesViewProps } from "./features/seller/components/SellerDigitalCodesView";
export { SellerLiveView } from "./features/seller/components/SellerLiveView";
export type { SellerLiveViewProps } from "./features/seller/components/SellerLiveView";

// ── Central schema registry (W1) ──────────────────────────────────────────────
// SCHEMAS is the single source of truth for every Zod schema at a system
// boundary (Firestore docs, API routes, forms, sieve, webhooks, RTDB, storage).
// Per-feature `schemas/index.ts` files register into the relevant bucket.
// Pure Zod, isomorphic — safe on both client and server.
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

// ── Fire-and-forget safety wrapper ─────────────────────────────────────────
// Replaces .catch(console.error) for non-critical background operations.
export { safeFireAndForget } from "./utils/safe-fire-forget";

// ── Exponential-backoff retry ───────────────────────────────────────────────
// Use for GCS / Firestore transient errors where retrying is safe.
export { withRetry } from "./http/retry";

// ── W3 catch-clause normalizer ──────────────────────────────────────────────
// Every catch (e: unknown) funnels through normalizeError(e) which returns
// a NormalizedError discriminated union. Audit-catch-normalize enforces this.
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

// Checkout lanes — the derived collector drop > offer > standard partition of the
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
  /*
   * 🛑 `resolveCheckoutItems` is THE definition of "what this checkout charges
   * for and settles", and it is exported because the CONSUMER owns the capture
   * route (`/api/payment/create-order`) — which was one of the two sites that
   * disagreed. Exporting it is what makes the agreement structural instead of
   * a convention two files have to keep independently (D40, Root Cause #75).
   */
  defaultCheckoutItems,
  resolveCheckoutItems,
  type CartLane,
  type LaneAssignable,
} from "./_internal/shared/checkout/lanes";
/*
 * Shipping quote model. Public because the CONSUMER owns the route that asks
 * the carrier for rates (`/api/shipping/quote`) and the checkout UI that
 * renders them — the rounding rule has to be reachable from both, and it must
 * be the same rule the server-side reconciliation uses, or the buyer is
 * credited against a figure they were never charged.
 */
export {
  roundShippingUp,
  toQuoteOptions,
  reconcileShipping,
  SHIPPING_ROUND_UP_TO,
  type ShippingQuoteOption,
  type SelectedShippingQuote,
  type ActualShipmentCost,
  type ShippingReconciliation,
} from "./_internal/shared/shipping/quote";
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

/*
 * Two schemas that existed and whose own routes did not use them.
 * `postApiWishlist` had sat in SCHEMAS.api since the registry was seeded while
 * `/api/wishlist` read its body raw; `createReviewSchema` was reachable only
 * through a server action while `POST /api/reviews` passed `body as any`.
 * Re-exported here under names that read clearly at a route call site.
 */
export { createReviewSchema as reviewSubmitSchema } from "./_internal/shared/features/reviews/schema";
export { wishlistAddSchema } from "./schemas/api-routes";

/*
 * Status history — the generic primitive behind every entity timeline.
 *
 * `withHistory` is exported because ads have no repository of their own: they
 * live inside the `siteSettings` singleton, so their route calls it directly.
 * Every other adopter funnels through its repository's write primitives and
 * should keep doing so — a call site reaching for this outside a repository
 * is usually a missing funnel, not a reason to export more of it.
 */
export {
  withHistory,
  buildHistoryEntry,
  appendHistoryEntry,
  diffTrackedFields,
  STATUS_HISTORY_MAX,
} from "./_internal/shared/history/index";
export type {
  StatusChangeEntry,
  SerialisedStatusChangeEntry,
  HistoryActor,
  HistoryActorRole,
  FieldChange,
} from "./_internal/shared/history/index";

/*
 * Nav item ids are DERIVED from the href (W6). Exported from the MAIN entry as
 * well as `/client` because `store/layout.tsx` is a Server Component: a
 * binding taken from the `"use client"` entry is a client-reference proxy
 * there, and CALLING one throws as an opaque React #441 (Root Cause #76).
 */
export { navItemId } from "./_internal/shared/features/layout/types";
export type { NavPortal } from "./_internal/shared/features/layout/types";

/*
 * The action index (W7). Its base is DERIVED from the nav groups, so an entry
 * cannot exist without its nav item and cannot go stale when one is renamed.
 */
export {
  mergeActionIndex,
  projectActionIndexForViewer,
  ACTION_INDEX_COLLECTION,
  ACTION_INDEX_DOC_ID,
} from "./features/search/action-index/types";
export type {
  ActionIndexEntry,
  ActionIndexKind,
  ActionIndexControl,
  ActionIndexOverride,
} from "./features/search/action-index/types";
export {
  deriveNavEntries,
  deriveQuickActionEntries,
  buildActionIndexBase,
} from "./features/search/action-index/derive";
export type { PortalNavGroups, QuickActionSource } from "./features/search/action-index/derive";
export { matchesNavQuery } from "./_internal/shared/features/layout/matchesNavQuery";
export type { NavSearchable } from "./_internal/shared/features/layout/matchesNavQuery";

export {
  SITE_SETTINGS_ENTRIES,
  deriveSettingsEntries,
} from "./features/search/action-index/settings-entries";
export type { SettingsIndexSource } from "./features/search/action-index/settings-entries";
export {
  SITE_SETTINGS_TABS,
  SITE_SETTINGS_TAB_IDS,
  isSiteSettingsTabId,
} from "./features/admin/constants/site-settings-tabs";
export type { SiteSettingsTab, SiteSettingsTabId } from "./features/admin/constants/site-settings-tabs";
export {
  PAYOUTS_TABS, isPayoutsTabId,
  SHIPPING_TABS, isShippingTabId,
  FULFILLMENT_TABS, isFulfillmentTabId,
  STOREFRONT_TABS, isStorefrontTabId,
} from "./features/seller/constants/store-tabs";
export type {
  StoreDashboardTab, PayoutsTabId, ShippingTabId, FulfillmentTabId, StorefrontTabId,
} from "./features/seller/constants/store-tabs";
export {
  ROLES_TABS, isRolesTabId,
  ADMIN_SETTINGS_TABS, isAdminSettingsTabId,
} from "./features/admin/constants/admin-page-tabs";
export type {
  AdminPageTab, RolesTabId, AdminSettingsTabId,
} from "./features/admin/constants/admin-page-tabs";

export {
  validateActionIndexEntry,
  normaliseRoute,
} from "./features/search/action-index/validate-entry";
export type {
  ActionIndexValidationContext,
  ActionIndexValidationIssue,
} from "./features/search/action-index/validate-entry";

// Seller listing form draft <-> product write payload. The flat form keys and
// the nested document blocks are different shapes, and nothing translated
// between them — see the module docstring.
export {
  draftToProductInput,
  productToDraft,
} from "./features/seller/utils/product-draft-mapping";

// The realised-price lookup view. Client — it owns a search box and a fetch.
export { PriceIndexToolView } from "./features/price-index/components/PriceIndexToolView";
export type {
  PriceIndexToolViewProps,
  PriceIndexToolResponse,
  PriceIndexResultRow,
  PriceIndexBandRow,
  PriceIndexConditionRow,
} from "./features/price-index/components/PriceIndexToolView";

// C5g/C5h/C5i — return custody, destination resolution and the abuse signal.
// Pure: no Firestore, no repository. The counters the abuse signal reads are
// PRE-COMPUTED by the daily job and passed in (Root Cause #104).
export {
  RETURN_CUSTODY_STATES,
  RETURN_CUSTODY_COPY,
  isTerminalCustody,
  canAdvanceCustody,
  nextCustodyState,
  custodyOwner,
  isActionableBy,
} from "./_internal/shared/features/returns/custody";
export type { ReturnCustodyState } from "./_internal/shared/features/returns/custody";
export {
  resolveReturnAddress,
  RTO_ENTRY_CUSTODY,
  rtoCostBearer,
  RETURN_ABUSE_SCAM_TYPES,
  RETURN_ABUSE_THRESHOLDS,
  returnAbuseSignals,
  enforcementFor,
} from "./_internal/shared/features/returns/destination";
export type {
  ReturnAddressResolution,
  ResolveReturnAddressInput,
  ReturnAbuseSignal,
  ReturnAbuseCounters,
  RtoCostBearer,
} from "./_internal/shared/features/returns/destination";

// C5f — courier ratings. Two numbers, never blended; see the module header.
export {
  COURIER_RATING_MIN_CONFIDENT_SAMPLES,
  courierRatingDisplay,
  isValidCourierVote,
  courierVoteId,
  rollUpCourierVotes,
} from "./_internal/shared/features/shipping/courier-rating";
export type {
  CourierRatingPair,
  CourierRatingDisplay,
  CourierRatingVote,
  CourierStats,
} from "./_internal/shared/features/shipping/courier-rating";

/**
 * D9 — chat. Plain data types, safe for client components that render a
 * conversation/message prop — the write path (actions) stays server-only, see
 * server.ts.
 */
export type {
  ConversationDocument,
  ConversationStatus,
  ConversationLastMessage,
  ParticipantRole,
  MessageDocument,
  MessageProductRef,
} from "./features/messages/schemas/firestore";
// ASSISTANT_PARTICIPANT_ID - the synthetic "other side" of a buyer<->assistant
// conversation. A value, not a type, so it needs its own export statement.
export { ASSISTANT_PARTICIPANT_ID } from "./features/messages/schemas/firestore";

// The platform's statutory identity, injected at boot from appkit.config.js's
// `business` block via the consumer's providers.config.ts. See the module
// header for why the invoice path must not read it from siteSettings.
export {
  configurePlatformSupplier,
  getPlatformSupplier,
  resetPlatformSupplier,
} from "./_internal/shared/features/site-settings/supplier-of-record";
export type { PlatformSupplierIdentity } from "./_internal/shared/features/site-settings/supplier-of-record";
