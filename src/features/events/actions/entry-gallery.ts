/**
 * The PUBLIC entry gallery — the read surface the contest copy already
 * promised and nothing provided.
 *
 * ## 🛑 ONE owner for the ranked read, called by three callers
 *
 * `GET /api/events/:id/entries`, the server-rendered entries listing and the
 * per-entry detail page all need the same ranked, masked, projected list. They
 * call this rather than each building it, for the reason the whole
 * `entryRanking` indirection exists: two surfaces that compute an order
 * independently will eventually disagree about who is winning a contest with a
 * prize.
 *
 * ## 🛑 WHY THE RANKING IS IN MEMORY AND NOT A FIRESTORE `orderBy`
 *
 * Two independent reasons, either of which is sufficient:
 *
 *  1. **`orderBy likeCount` would HIDE most of a contest.** A Firestore
 *     `orderBy` excludes every document that lacks the ordering field (Root
 *     Cause #100), and `likeCount` is absent until an entry's first vote. On
 *     the day a contest opens that query answers 200 with an empty gallery.
 *  2. **The rule is CONFIG, not a column.** `net-score` is
 *     `likes − dislikes`, `most-votes` is `likes + dislikes`, `earliest` is a
 *     reversed timestamp and `manual` is no order at all. None of the four is
 *     expressible as a single Firestore sort, so a database sort could only
 *     ever serve one of the five shipped rules — and the other four would
 *     silently render in the wrong order rather than failing.
 *
 * So the read is bounded, ordered by an index that already exists
 * (`eventId, reviewStatus, submittedAt DESC`), and ranked here through
 * `resolveEntryRanking`. The bound is declared on the wire as `truncated`,
 * because a leaderboard built from a silently truncated set *looks* correct
 * while being wrong.
 *
 * ## 🛑 APPROVED ONLY, with no parameter to change it
 *
 * `reviewStatus` is NOT accepted from the caller. Another participant's
 * `pending` or `flagged` state is moderator information: exposing it would
 * publish which entries a moderator has hidden, to anyone who appended a query
 * string. A participant sees their OWN pending entries through the participate
 * page, which keys on the server session uid.
 *
 * @tag domain:events
 * @tag layer:action
 * @tag access:server-only
 */

import { eventEntryRepository } from "../repository/event-entry.repository";
import { eventEntryVotesRepository } from "../repository/entry-votes.repository";
import { eventRepository } from "../repository/events.repository";
import {
  EVENT_ENTRY_FIELDS,
  type EventDocument,
  type EventEntryDocument,
  type EventEntryPlain,
} from "../schemas/firestore";
import {
  rankEntries,
  resolveEntryRankingRuleSet,
  type EntryRankingRuleSet,
} from "../schemas/entry-ranking";
import { eventTypeHasEntryVoting } from "../schemas/event-mechanisms";
import type {
  PublicEntryMedia,
  PublicEntryRanking,
  PublicEventEntriesResponse,
  PublicEventEntryItem,
} from "../types";

/**
 * How many approved entries one ranked read considers.
 *
 * ⚠ 100 is not a policy choice — it is `SIEVE_DEFAULTS.maxPageSize`, the
 * ceiling `sieveQuery` silently clamps every request to. Asking for 500 here
 * would return 100 and report nothing, which is how the admin entries route
 * came to request a 500-row search window and scan 100 (flagged, not fixed —
 * not this lane's file).
 *
 * `total` beside it is a real Firestore aggregate count, so the honest
 * statement "there are N entries; these are the top 100" is still available,
 * and that is what `truncated` carries.
 */
export const ENTRY_RANK_WINDOW = 100;

/** Default and maximum page sizes for the public gallery. */
export const ENTRY_PAGE_SIZE_DEFAULT = 24;
export const ENTRY_PAGE_SIZE_MAX = 48;

/**
 * The media projection.
 *
 * An explicit allow-list of three fields rather than passing `entry.media`
 * through: it is stored user input handed to a `"use client"` prop, i.e. into
 * the public RSC payload. `type` is narrowed to the two known kinds so an
 * unexpected stored value renders as an image rather than reaching a `<video>`
 * element with an arbitrary `src`.
 */
function toPublicMedia(media: EventEntryPlain["media"]): PublicEntryMedia[] {
  return (media ?? [])
    .filter((m): m is NonNullable<typeof m> => Boolean(m?.url))
    .map((m) => ({
      url: String(m.url),
      type: m.type === "video" ? ("video" as const) : ("image" as const),
      ...(typeof m.alt === "string" && m.alt ? { alt: m.alt } : {}),
    }));
}

/** `Date | string | undefined` → ISO, without inventing a date. */
function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return "";
}

/** `Date | string | undefined` → a comparable `Date`, epoch as the floor. */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  /*
   * An entry whose `submittedAt` cannot be read sorts to the EARLIEST position
   * under the published tie-break rather than being dropped. It is a real
   * submission; losing it from the gallery would be worse than ordering it
   * pessimistically, and the tie-break only applies when the rule key is equal
   * anyway.
   */
  return new Date(0);
}

function toPublicRanking(ruleSet: EntryRankingRuleSet): PublicEntryRanking {
  return {
    id: ruleSet.id,
    rule: String(ruleSet.rule),
    tieBreak: String(ruleSet.tieBreak),
    allowsDislike: ruleSet.allowsDislike,
    publicWording: ruleSet.publicWording,
  };
}

/** One ranked row, before projection — carries the entry and its sort inputs. */
interface RankedRow {
  entry: EventEntryPlain;
  likes: number;
  dislikes: number;
  submittedAt: Date;
  rank: number;
}

interface RankedWindow {
  event: EventDocument;
  ruleSet: EntryRankingRuleSet;
  votingEnabled: boolean;
  rows: RankedRow[];
  /** Real aggregate count of APPROVED entries, independent of the window. */
  total: number;
}

/**
 * Read the bounded window of approved entries and rank it. The single place
 * the database is touched for a public entry read.
 */
async function rankedWindow(eventIdOrSlug: string): Promise<RankedWindow | null> {
  const event = await eventRepository.findByIdOrSlug(eventIdOrSlug);
  if (!event || event.status === "draft") return null;

  const ruleSet = resolveEntryRankingRuleSet(event);

  /*
   * 🛑 `sorts: "-submittedAt"`, not `-likeCount`. See this file's header: the
   * sort exists to make the WINDOW deterministic — so the same rows are
   * considered on every request and page 2 is stable — not to produce the
   * ranking. The composite it needs,
   * `(eventId, reviewStatus, submittedAt DESC)`, is already deployed.
   */
  const result = await eventEntryRepository.listForEvent(event.id, {
    page: 1,
    pageSize: ENTRY_RANK_WINDOW,
    filters: `${EVENT_ENTRY_FIELDS.REVIEW_STATUS}==${EVENT_ENTRY_FIELDS.REVIEW_STATUS_VALUES.APPROVED}`,
    sorts: `-${EVENT_ENTRY_FIELDS.SUBMITTED_AT}`,
  });

  /*
   * 🛑 MASKED, not revealed. `userDisplayName` is encrypted at rest and
   * `maskPii` decrypts before masking — handing stored ciphertext to a mask
   * helper returns "Anonymous" for every row by design, which is the defect
   * the admin entry SEARCH shipped with.
   */
  const masked = eventEntryRepository.maskedEntrys(
    result.items as EventEntryDocument[],
  );

  const rows = rankEntries(
    ruleSet,
    masked.map((entry) => ({
      entry,
      likes: Number(entry.likeCount ?? 0),
      dislikes: Number(entry.dislikeCount ?? 0),
      submittedAt: toDate(entry.submittedAt),
    })),
  );

  return {
    event,
    ruleSet,
    votingEnabled: eventTypeHasEntryVoting(event.type),
    rows,
    total: result.total,
  };
}

/**
 * The viewer's own vote for a bounded set of entry ids.
 *
 * ⚠ One `.doc().get()` per id rather than a query — the vote document id is
 * `<entryId>__<userId>`, so "how did I vote" needs no index and no `where`.
 * Only paid for a signed-in caller; an anonymous visitor costs zero extra
 * reads and gets `null`, which is also what keeps the anonymous response
 * publicly cacheable.
 */
async function resolveMyVotes(
  entryIds: readonly string[],
  viewerUid: string,
): Promise<Map<string, "like" | "dislike" | null>> {
  const out = new Map<string, "like" | "dislike" | null>();
  await Promise.all(
    entryIds.map(async (id) => {
      if (!id) return;
      try {
        out.set(id, await eventEntryVotesRepository.myVote(id, viewerUid));
      } catch {
        /*
         * A failed vote-state read degrades to "not voted" rather than taking
         * the gallery down. The counters are still correct and the worst case
         * is a button that looks unpressed until the next load — the server
         * transaction is what enforces one vote per entry, so nothing can be
         * double-counted by this.
         */
        out.set(id, null);
      }
    }),
  );
  return out;
}

function toPublicEntry(
  row: RankedRow,
  myVote: "like" | "dislike" | null,
): PublicEventEntryItem {
  const entry = row.entry;
  return {
    id: String(entry.id ?? ""),
    rank: row.rank,
    ...(entry.userDisplayName ? { userDisplayName: entry.userDisplayName } : {}),
    ...(entry.note ? { note: entry.note } : {}),
    media: toPublicMedia(entry.media),
    submittedAt: toIso(entry.submittedAt),
    likes: row.likes,
    dislikes: row.dislikes,
    myVote,
  };
}

export interface GetPublicEventEntriesOptions {
  /** 1-based. */
  page?: number;
  pageSize?: number;
  /**
   * The VIEWER's uid, from a verified server session — never from a query
   * parameter. Supplying it resolves `myVote` for the rows on this page in one
   * batch, so the gallery needs no per-card request.
   */
  viewerUid?: string;
}

/**
 * The ranked public gallery for one event, by id OR slug.
 *
 * Returns `null` only when the event does not exist or is a draft — the same
 * visibility rule `getPublicEventById` applies, so a draft event's entries are
 * not reachable through a path the event itself is not.
 */
export async function getPublicEventEntries(
  eventIdOrSlug: string,
  opts: GetPublicEventEntriesOptions = {},
): Promise<PublicEventEntriesResponse | null> {
  const win = await rankedWindow(eventIdOrSlug);
  if (!win) return null;

  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(
    ENTRY_PAGE_SIZE_MAX,
    Math.max(1, Math.floor(opts.pageSize ?? ENTRY_PAGE_SIZE_DEFAULT)),
  );

  const start = (page - 1) * pageSize;
  const pageRows = win.rows.slice(start, start + pageSize);

  const myVotes = opts.viewerUid
    ? await resolveMyVotes(
        pageRows.map((r) => String(r.entry.id ?? "")),
        opts.viewerUid,
      )
    : new Map<string, "like" | "dislike" | null>();

  const ranked = win.rows.length;
  return {
    items: pageRows.map((row) =>
      toPublicEntry(row, myVotes.get(String(row.entry.id ?? "")) ?? null),
    ),
    total: win.total,
    page,
    pageSize,
    totalPages: ranked === 0 ? 0 : Math.max(1, Math.ceil(ranked / pageSize)),
    hasMore: start + pageSize < ranked,
    truncated: win.total > ranked,
    ranking: toPublicRanking(win.ruleSet),
    votingEnabled: win.votingEnabled,
  };
}

/**
 * ONE published entry, by id, for its own shareable detail page.
 *
 * 🛑 Re-derives the rank through the SAME ranked window rather than reporting a
 * position of its own, so "#3" on the detail page and "#3" on the card are the
 * same number. A cheaper single-document read would have to either omit the
 * rank or compute it from a second rule, and a second rule is how the two
 * surfaces come to disagree.
 *
 * Returns `null` for an entry that is not approved, belongs to another event,
 * or does not exist — all three are "not published", and distinguishing them
 * in a public response would confirm the existence of a moderated entry.
 *
 * ⚠ Bounded by {@link ENTRY_RANK_WINDOW}: an entry ranked below the window has
 * no detail page. Stated rather than hidden — the fix when a contest outgrows
 * 100 approved entries is a single-document read plus a counted rank query,
 * which is real work and is not needed at one event with a 4-item cap.
 */
export async function getPublicEventEntry(
  eventIdOrSlug: string,
  entryId: string,
  opts: { viewerUid?: string } = {},
): Promise<{
  entry: PublicEventEntryItem;
  ranking: PublicEntryRanking;
  votingEnabled: boolean;
  total: number;
} | null> {
  const win = await rankedWindow(eventIdOrSlug);
  if (!win) return null;

  const row = win.rows.find((r) => String(r.entry.id ?? "") === entryId);
  if (!row) return null;

  const myVotes = opts.viewerUid
    ? await resolveMyVotes([entryId], opts.viewerUid)
    : new Map<string, "like" | "dislike" | null>();

  return {
    entry: toPublicEntry(row, myVotes.get(entryId) ?? null),
    ranking: toPublicRanking(win.ruleSet),
    votingEnabled: win.votingEnabled,
    total: win.total,
  };
}
