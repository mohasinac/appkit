export const EVENTS_PAGE_SIZE = 20;
export const EVENTS_UPCOMING_LIMIT = 10;
export const EVENT_MAX_ENTRIES_DEFAULT = 500;
export const EVENT_TITLE_MAX_LENGTH = 200;
export const EVENT_DESCRIPTION_MAX_LENGTH = 5000;

/**
 * Entries one person may put into a raffle.
 *
 * One, because a raffle is one ticket per person and there is nothing to
 * configure: `maxEntriesPerUser` exists on `SurveyConfig` only, and
 * `EventDocument` has no `raffleConfig` at all.
 *
 * 🛑 Shared deliberately, by BOTH `enterEvent`'s server-side dedupe and the
 * `EventRaffleEntryForm` prop that renders "you've used all N entry slots".
 * Two mirrored literals is the shape that made this bug survive: the form
 * already defaulted to 1 and displayed that sentence, while the server
 * enforced nothing, so the UI claimed a limit that did not exist.
 */
export const RAFFLE_MAX_ENTRIES_PER_USER = 1;
