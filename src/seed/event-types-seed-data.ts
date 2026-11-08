/**
 * EVENT TYPES — the same shape as listing types, for the same reason.
 *
 * Owner, 2026-11-08: *"similar to the listing types, we can enable, disable or
 * create new event types as well — just the name and the interaction changes."*
 *
 * So an event type is: key + label + slug + enabled + a value for every event
 * mechanism + which widgets render it. The INTERACTION (enter a giveaway, buy a
 * ticket, RSVP, watch a stream, submit an entry) is a mechanism flag, not a
 * component.
 *
 * 🛑 VOCABULARY (owner, 2026-11-08): *"rename all to avoid words like gambling,
 * raffles, auction houses etc."* So: giveaway, not raffle; offers, not auction;
 * prize draw only where a legal disclosure requires the term. The word choice is
 * not cosmetic — app-store review, payment-provider risk teams and Indian
 * gaming regulation all read these strings.
 *
 * Mocks: `mocks/19-events-blog.qm`.
 */

/** What a visitor can DO with an event. The "interaction" the owner named. */
export interface EventMechanismDefinition {
  id: string;
  label: string;
  effect: string;
  /** Moves money or creates an obligation. */
  moneyPath?: boolean;
}

export const eventMechanismsSeedData: EventMechanismDefinition[] = [
  { id: "rsvp", label: "RSVP", effect: "A visitor registers attendance; capacity is counted." },
  { id: "ticketed", label: "Ticketed", effect: "Attendance requires a paid ticket; the ticket is an order line.", moneyPath: true },
  { id: "entryFee", label: "Entry fee", effect: "Participation costs money, separately from attendance.", moneyPath: true },
  { id: "giveawayEntry", label: "Giveaway entry", effect: "Entries are collected and a winner is drawn at a declared time.", moneyPath: true },
  { id: "coinsEntry", label: "Entry with coins", effect: "Entries may be bought with loyalty coins instead of cash.", moneyPath: true },
  { id: "submission", label: "Submission", effect: "Participants upload something (a photo, a build, a result)." },
  { id: "liveStream", label: "Live stream", effect: "The event page embeds a stream while it is running." },
  { id: "bracket", label: "Bracket / results", effect: "Rounds, seedings and results render on the event page." },
  { id: "prizePool", label: "Prize pool", effect: "Declared prizes render; awarding them is a recorded decision.", moneyPath: true },
  { id: "capacityLimit", label: "Capacity limit", effect: "A hard cap on attendees or entries; the page closes when reached." },
  { id: "ageGate", label: "Age gate", effect: "Participation requires a declared minimum age." },
  { id: "locationRequired", label: "Physical location", effect: "The event has a venue and renders a map; otherwise it is online." },
];

export const EVENT_MECHANISM_IDS: readonly string[] = eventMechanismsSeedData.map(m => m.id);

export interface EventTypeDefinition {
  key: string;
  label: string;
  slug: string;
  enabled: boolean;
  order: number;
  mechanisms: Record<string, boolean>;
  /** Which widget renders its card and its page. */
  templates: { card: string; detail: string };
  /** Required before publishing. */
  requiredFields: string[];
  tags: string[];
}

const allOff = (): Record<string, boolean> =>
  Object.fromEntries(EVENT_MECHANISM_IDS.map(id => [id, false]));

const eventType = (
  t: Omit<EventTypeDefinition, "mechanisms"> & { on: string[] },
): EventTypeDefinition => {
  const { on, ...rest } = t;
  const mechanisms = allOff();
  for (const id of on) {
    if (!(id in mechanisms)) throw new Error(`event type "${t.key}" enables unknown mechanism "${id}"`);
    mechanisms[id] = true;
  }
  return { ...rest, mechanisms };
};

export const eventTypesSeedData: EventTypeDefinition[] = [
  eventType({
    key: "tournament",
    label: "Tournament",
    slug: "tournament",
    enabled: true,
    order: 1,
    on: ["rsvp", "entryFee", "bracket", "prizePool", "capacityLimit", "locationRequired"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "startsAt", "venue", "format", "entryFee"],
    tags: ["event", "tournament"],
  }),
  eventType({
    key: "giveaway",
    label: "Giveaway",
    slug: "giveaway",
    enabled: true,
    order: 2,
    on: ["giveawayEntry", "coinsEntry", "prizePool", "capacityLimit"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "drawsAt", "prize", "entryPrice", "oddsDisclosure"],
    tags: ["event", "giveaway"],
  }),
  eventType({
    key: "meetup",
    label: "Meetup",
    slug: "meetup",
    enabled: true,
    order: 3,
    on: ["rsvp", "capacityLimit", "locationRequired"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "startsAt", "venue"],
    tags: ["event", "meetup", "community"],
  }),
  eventType({
    key: "drop",
    label: "Drop / release",
    slug: "drop",
    enabled: true,
    order: 4,
    on: ["capacityLimit"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "startsAt", "listings"],
    tags: ["event", "drop", "campaign"],
  }),
  eventType({
    key: "stream",
    label: "Live stream",
    slug: "stream",
    enabled: true,
    order: 5,
    on: ["liveStream", "rsvp"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "startsAt", "streamUrl"],
    tags: ["event", "stream"],
  }),
  eventType({
    key: "contest",
    label: "Contest",
    slug: "contest",
    enabled: true,
    order: 6,
    on: ["submission", "prizePool", "capacityLimit", "ageGate"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "closesAt", "rules", "prize"],
    tags: ["event", "contest", "ugc"],
  }),
  eventType({
    key: "workshop",
    label: "Workshop",
    slug: "workshop",
    enabled: false,
    order: 7,
    on: ["ticketed", "capacityLimit", "locationRequired"],
    templates: { card: "card.event", detail: "detail.event" },
    requiredFields: ["title", "startsAt", "venue", "ticketPrice"],
    tags: ["event", "workshop"],
  }),
];

for (const t of eventTypesSeedData) {
  const missing = EVENT_MECHANISM_IDS.filter(id => !(id in t.mechanisms));
  if (missing.length) throw new Error(`event type "${t.key}" is missing mechanisms: ${missing.join(", ")}`);
  if (t.mechanisms.giveawayEntry && !t.requiredFields.includes("oddsDisclosure")) {
    throw new Error(`event type "${t.key}" has giveaway entries but no odds disclosure in requiredFields`);
  }
}

export const eventTypesByKey: Readonly<Record<string, EventTypeDefinition>> =
  Object.freeze(Object.fromEntries(eventTypesSeedData.map(t => [t.key, t])));
