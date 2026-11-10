export { EventStatusBadge } from "./EventStatusBadge";
export {
  EventFilters,
  EVENT_SORT_OPTIONS,
  EVENT_FILTER_KEYS,
  EVENT_ADMIN_SORT_OPTIONS,
  EVENT_SELLER_SORT_OPTIONS,
  EVENT_PUBLIC_SORT_OPTIONS,
  getEventFilterKeys,
  getEventSortOptions,
} from "./EventFilters";
export type { EventFiltersProps, EventFilterVariant } from "./EventFilters";
export { EventCard } from "./EventCard";
export { RelatedEventsCarousel } from "./RelatedEventsCarousel";
export type { RelatedEventItem } from "./RelatedEventsCarousel";
export { EventsListView } from "./EventsListView";
export { EventsIndexListing } from "./EventsIndexListing";
export type { EventsIndexListingProps } from "./EventsIndexListing";
export { EventDetailView } from "./EventDetailView";
export type { EventDetailViewProps } from "./EventDetailView";
export { EventParticipateView } from "./EventParticipateView";
export type { EventParticipateViewProps } from "./EventParticipateView";
export { EventLeaderboard } from "./EventLeaderboard";
export type { EventLeaderboardProps } from "./EventLeaderboard";

/*
 * ── THE CONTEST ENTRY SURFACES ──────────────────────────────────────────────
 *
 * 🛑 `EntryVoteButtons` was exported from NOTHING — not this barrel, not
 * `src/index.ts`, not `client.ts`. It had correct optimistic math, the right
 * `allowsDislike` behaviour and a full docstring, and no consumer could import
 * it. A component that cannot be reached is the same as one that does not
 * exist; the whole voting mechanic was unreachable for this reason alone.
 */
export { EntryVoteButtons } from "./EntryVoteButtons";
export type { EntryVoteButtonsProps } from "./EntryVoteButtons";
export { EntryMediaThumb } from "./EntryMediaThumb";
export type { EntryMediaThumbProps } from "./EntryMediaThumb";
/*
 * The entry UPLOAD field and the inline edit/delete controls. Both moved or
 * were added 2026-11-10 for the owner's inline-management requirement; the
 * upload field moved IN from the events app so appkit's card can mount it
 * without a function prop crossing a server boundary (React #441).
 */
export { EntryMediaUploadField, describeEntryMediaRules } from "./EntryMediaUploadField";
export type { EntryMediaUploadFieldProps } from "./EntryMediaUploadField";
export { EntryInlineActions } from "./EntryInlineActions";
export type {
  EntryInlineActionsProps,
  EntryInlineActionsLabels,
  EntryInlineActionsEntry,
} from "./EntryInlineActions";
export { EventEntryLimitField } from "./EventEntryLimitField";
export type { EventEntryLimitFieldProps } from "./EventEntryLimitField";
export { EventInlineAdminActions } from "./EventInlineAdminActions";
export type {
  EventInlineAdminActionsProps,
  EventInlineAdminActionsLabels,
} from "./EventInlineAdminActions";
export { EventEntriesListView } from "./EventEntriesListView";
export type {
  EventEntriesListViewProps,
  EventEntriesListLabels,
} from "./EventEntriesListView";
export { EventEntryDetailView } from "./EventEntryDetailView";
export type {
  EventEntryDetailViewProps,
  EventEntryDetailLabels,
} from "./EventEntryDetailView";
export { AdminEventsView } from "./AdminEventsView";
export type { AdminEventsViewProps } from "./AdminEventsView";
export { AdminEventEditorView } from "./AdminEventEditorView";
export type { AdminEventEditorViewProps } from "./AdminEventEditorView";
export { AdminEventEntriesView } from "./AdminEventEntriesView";
export type { AdminEventEntriesViewProps } from "./AdminEventEntriesView";
export { EventFormDrawer } from "./EventFormDrawer";
export type { EventFormDrawerProps } from "./EventFormDrawer";
export { EventBanner } from "./EventBanner";
export type { EventBannerProps } from "./EventBanner";
export { EventPollWidget } from "./EventPollWidget";
export type { } from "./EventPollWidget";
export { EventGiveawaysSection } from "./EventGiveawaysSection";
export type { EventGiveawaysSectionProps } from "./EventGiveawaysSection";
export { EventGiveawayWinnerView } from "./EventGiveawayWinnerView";
export type { EventGiveawayWinnerViewProps } from "./EventGiveawayWinnerView";
export { BonusSpinView } from "./BonusSpinView";
export type { BonusSpinViewProps } from "./BonusSpinView";

// W1-18: Event participation flows (raffle entry / sale banner / offer coupon)
export { EventGiveawayEntryForm } from "./EventGiveawayEntryForm";
export type { EventGiveawayEntryFormProps } from "./EventGiveawayEntryForm";
export { EventSaleBanner } from "./EventSaleBanner";
export type { EventSaleBannerProps } from "./EventSaleBanner";
export { EventOfferCard } from "./EventOfferCard";
export type { EventOfferCardProps } from "./EventOfferCard";
