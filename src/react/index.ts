/**
 * @mohasinac/react — Generic React hooks
 *
 * Stage F2: 10 pure browser/React hooks extracted from the app.
 * Zero domain dependencies — safe for use in any React project.
 */

// Viewport / media breakpoints
export { useMediaQuery } from "./hooks/useMediaQuery";
export { useBreakpoint } from "./hooks/useBreakpoint";

// DOM interaction
export { useClickOutside } from "./hooks/useClickOutside";
export type { UseClickOutsideOptions } from "./hooks/useClickOutside";
export { useKeyPress } from "./hooks/useKeyPress";
export type { KeyModifiers, UseKeyPressOptions } from "./hooks/useKeyPress";
export { useLongPress } from "./hooks/useLongPress";

// Touch / gesture
export { useGesture } from "./hooks/useGesture";
export type { GestureType, UseGestureOptions } from "./hooks/useGesture";
export { useSwipe } from "./hooks/useSwipe";
export type { SwipeDirection, UseSwipeOptions } from "./hooks/useSwipe";
export { usePullToRefresh } from "./hooks/usePullToRefresh";
export type {
  UsePullToRefreshOptions,
  UsePullToRefreshReturn,
} from "./hooks/usePullToRefresh";

// Contexts
export { ThemeProvider, useTheme } from "./contexts/ThemeContext";
export type { ThemeMode } from "./contexts/ThemeContext";
export {
  SessionProvider,
  useSession,
  useAuth,
} from "./contexts/SessionContext";
export type {
  SessionUser,
  SessionContextValue,
  SessionEndpoints,
  SessionProviderProps,
  AvatarMetadataShape,
  InvalidateQueriesFn,
} from "./contexts/SessionContext";

// Timer / countdown
export { useCountdown } from "./hooks/useCountdown";
export type { CountdownRemaining } from "./hooks/useCountdown";

// Device / hardware
export { useCamera } from "./hooks/useCamera";
export type { UseCameraOptions, UseCameraReturn } from "./hooks/useCamera";

// Multi-select / bulk operations
export { useBulkSelection } from "./hooks/useBulkSelection";
export type {
  UseBulkSelectionOptions,
  UseBulkSelectionReturn,
} from "./hooks/useBulkSelection";

// URL-driven table / list state
export { useUrlTable } from "./hooks/useUrlTable";
export type { UseUrlTableOptions } from "./hooks/useUrlTable";

// Staged (pending) filter management
export { usePendingFilters } from "./hooks/usePendingFilters";
export type {
  UsePendingFiltersOptions,
  UsePendingFiltersReturn,
} from "./hooks/usePendingFilters";
export { usePendingTable } from "./hooks/usePendingTable";
export type {
  PendingTable,
  UsePendingTableReturn,
} from "./hooks/usePendingTable";

// Unsaved changes tracking
export {
  useUnsavedChanges,
  UNSAVED_CHANGES_EVENT,
} from "./hooks/useUnsavedChanges";
export type {
  UseUnsavedChangesOptions,
  UseUnsavedChangesReturn,
} from "./hooks/useUnsavedChanges";

// Bulk action mutation
export { useBulkAction } from "./hooks/useBulkAction";
export type {
  BulkActionPayload,
  BulkActionResult,
  BulkActionSummary,
  BulkActionItemFailure,
  UseBulkActionOptions,
  UseBulkActionReturn,
} from "./hooks/useBulkAction";

// Container-aware fluid grid column counter (ResizeObserver-based)
export { useContainerGrid } from "./hooks/useContainerGrid";

// Success/error message management
export { useMessage } from "./hooks/useMessage";
export type {
  UseContainerGridOptions,
  UseContainerGridResult,
} from "./hooks/useContainerGrid";

// Visible-items counter for tab strips and overflow scrollers
export { useVisibleItems } from "./hooks/useVisibleItems";
export type {
  UseVisibleItemsOptions,
  UseVisibleItemsResult,
} from "./hooks/useVisibleItems";

// Modal stack management
export { useModalStack } from "./useModalStack";
export type { ModalEntry } from "./useModalStack";

// Error boundary
export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

// Realtime event bridge
export {
  useRealtimeEvent,
  RealtimeEventType,
  RealtimeEventStatus,
} from "./hooks/useRealtimeEvent";
export type {
  RTDBEventPayload,
  RealtimeEventMessages,
  RealtimeEventType as RealtimeEventTypeValue,
  RealtimeEventStatus as RealtimeEventStatusValue,
  UseRealtimeEventConfig,
  UseRealtimeEventReturn,
} from "./hooks/useRealtimeEvent";
