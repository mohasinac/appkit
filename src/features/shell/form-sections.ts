/**
 * The canonical section ORDER vocabulary.
 *
 * ## Why this is a `group`, not a rename of `section`
 *
 * The plan called for collapsing the 58 free-form section ids in use across 30
 * schemas onto a closed 12-value set. Measured before doing it, that merges
 * sections in 7 files and 8 places — the scam report's `who` + `what` +
 * `declare` become one blob, coupons' `limits` + `validity` collapse together,
 * blog's `content` + `seo` merge, and payout methods lose the split between
 * `method` and `bank`.
 *
 * The mistake was treating one identifier as two things. A section id is the
 * RENDERED UNIT — fine-grained, form-specific, and the thing whose heading the
 * user reads (`build-sections` falls back to `humaniseFieldName(sectionId)`, so
 * 144 of the 228 annotations get their visible heading straight from the id).
 * What the ordering rule actually needs is a PRIORITY BAND: required first,
 * danger last, everything else in a predictable middle.
 *
 * So the id stays free-form and every section declares a `group` from this
 * closed union. Order and default-open derive from the group; identity and
 * heading stay with the id. Nothing merges, and the audit still has a closed
 * set to check against.
 *
 * ## Ordering
 *
 * Array order IS render order. `required` is index 0 and is the section left
 * open by default; `danger` is always last. That gives "1. Required → 2.
 * Additional → … → least important last" mechanically, with no per-form
 * `sectionOrder` to maintain.
 */
export const FORM_SECTION_GROUP = [
  /** Cannot save without it. Open by default; a required field of ANY kind
   *  belongs here, including a mandatory cover image. */
  "required",
  /** What the record is called and says — name, slug, description, SEO. */
  "identity",
  /** How it is filed — category, type, scope, tags, rules. */
  "classification",
  /** Money — price, rates, fees, tax. */
  "pricing",
  /** How many and until when — stock, limits, validity windows, slots. */
  "inventory",
  /** Optional media — gallery, video, creative, proof. */
  "media",
  /** Getting it there — address, shipping, delivery, routing. */
  "logistics",
  /** Links to other records — owner, members, linked accounts, sync. */
  "relationships",
  /** When — start/end dates, announcements, alerts. */
  "schedule",
  /** Who can see it and do what — publish state, placement, access, permissions. */
  "visibility",
  /** Everything a normal user never touches — config, defaults, layout. */
  "advanced",
  /** Destructive and irreversible. Always last, never open by default. */
  "danger",
] as const;

export type FormSectionGroup = (typeof FORM_SECTION_GROUP)[number];

/** Position of a group in render order; unknown groups sort just before danger. */
export function groupRank(group: FormSectionGroup | undefined): number {
  if (!group) return FORM_SECTION_GROUP.length - 2;
  const i = FORM_SECTION_GROUP.indexOf(group);
  return i === -1 ? FORM_SECTION_GROUP.length - 2 : i;
}

/**
 * Default group for each section id currently in use, so 30 schemas do not each
 * need a hand-written `group`. A section id absent here must declare its own —
 * `audit-form-sectionised` fails otherwise, which is what stops a new id
 * silently defaulting into the middle of the form.
 *
 * Derived from the 58 ids actually present, counted rather than guessed.
 */
export const SECTION_GROUP_DEFAULTS: Record<string, FormSectionGroup> = {
  // required
  basics: "required", what: "required", who: "required", entry: "required",
  declare: "required", ticket: "required", method: "required", card: "required",
  bank: "required", connection: "required", member: "required",
  // identity
  seo: "identity", profile: "identity", details: "identity", detail: "identity",
  content: "identity", message: "identity",
  // classification
  scope: "classification", target: "classification", rule: "classification",
  flags: "classification",
  // pricing
  rates: "pricing", pricing: "pricing", payment: "pricing",
  // inventory
  limits: "inventory", validity: "inventory", slots: "inventory",
  standing: "inventory",
  // media
  media: "media", creative: "media", proof: "media",
  // logistics
  address: "logistics", shipping: "logistics", delivery: "logistics",
  routing: "logistics",
  // relationships
  owner: "relationships", members: "relationships", link: "relationships",
  google: "relationships", sync: "relationships", subscribe: "relationships",
  review: "relationships",
  // schedule
  schedule: "schedule", announcement: "schedule", alert: "schedule",
  // visibility
  visibility: "visibility", publish: "visibility", placement: "visibility",
  status: "visibility", access: "visibility", permissions: "visibility",
  capabilities: "visibility",
  // advanced
  settings: "advanced", config: "advanced", defaults: "advanced",
  layout: "advanced",
  // danger
  ban: "danger", cancel: "danger",
};

/** The group for a section id — its declared group, else the default, else advanced. */
export function resolveSectionGroup(
  sectionId: string,
  declared?: FormSectionGroup,
): FormSectionGroup {
  return declared ?? SECTION_GROUP_DEFAULTS[sectionId] ?? "advanced";
}
