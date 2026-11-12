/*
 * resolveEditTarget — where an inline EDIT affordance sends you.
 *
 * Owner, 2026-11-12: *"allow support or the homepage edits inline → redirect
 * to the admin panel, listing edit → own listing → seller dashboard edit,
 * others → no change, admin all edit."*
 *
 * ## 🛑 WHY THIS IS A RESOLVER AND NOT A WIDER BOOLEAN
 *
 * Edit mode today is one flag — `canUseEditMode`, fed by
 * `can(user, "admin:sections:write")` — which is admin-only and answers only
 * *"may I see edit affordances at all?"*. The owner's rule needs a second
 * answer the flag cannot carry: **WHERE does this particular edit go?** The
 * same pencil on a homepage band and on a listing lead to two different
 * editors in two different dashboards, and on a listing the answer depends on
 * who OWNS it.
 *
 * Widening the boolean to include sellers would be the wrong fix twice over:
 * a seller would get an affordance on the homepage (which they may not edit),
 * and the destination would still have to be decided at each call site — which
 * is how a rule ends up implemented three different ways.
 *
 * ## The capability rule, not the role rule
 *
 * Per the governing principle, this never asks *"is this user a seller?"*. It
 * asks whether they hold the permission, and — for a listing — whether the
 * thing is THEIRS. `storeId` on the subject is what makes the second half
 * answerable, and it is already written on every listing (measured: 313 sites
 * in the shop, 5,902 in appkit) precisely so questions like this stay possible.
 *
 * ## 🛑 `null` MEANS NO AFFORDANCE, and that is the owner's "no change"
 *
 * A pencil that opens a page the viewer cannot use is worse than no pencil:
 * it is the `/scams` defect in miniature (an advertised route that dead-ends)
 * and the contest-entry defect (a control that implies a capability nobody
 * was granted). So an unresolvable subject renders NOTHING rather than a
 * disabled control or a link to `/unauthorized`.
 *
 * ⚠ Unknown subject kinds return `null` too — fail CLOSED. A newer config
 * naming a subject this deploy has never heard of must not produce a pencil
 * pointing at a guess.
 */

/** Minimal shape of the viewer. Deliberately not the full user document. */
export interface EditViewer {
  /** Resolved permission keys. The resolver never reads roles. */
  permissions: readonly string[];
  /** Stores this viewer owns or operates. Empty for a buyer. */
  storeIds?: readonly string[];
  /**
   * May this viewer edit listings belonging to a store they own?
   *
   * 🛑 RESOLVED BY THE CONSUMER, never derived here — the same contract as
   * `EditModeProvider`'s `enabled`, whose own comment says *"decide this from
   * the session, never from a client toggle"*.
   *
   * ⚠ And it exists because of a measurement, not a preference. My first
   * version gated this arm on `can(viewer, "store:products:write")` — a key
   * that EXISTS NOWHERE. Measured: the permission namespace is `admin:*`
   * exclusively, and seller access to `/store/products/[id]/edit` is gated by
   * `<RoleGuard role={["seller","admin"]}>`, a ROLE check. So the permission
   * I reached for was invented, and the arm would have been dead on arrival —
   * the declared-but-unwired defect, in the file written to avoid it.
   *
   * Taking the role literal into this resolver was the other wrong answer: the
   * governing principle forbids `role ===` outside the registries, and
   * `store/layout.tsx` already calls a "permission/id-driven mechanism" the
   * TARGET rather than the state. So the capability is asked for here and
   * answered outside, which keeps this file honest today and makes the R2
   * switch to a real permission a one-line change at the call site.
   */
  canEditOwnListings?: boolean;
}

/** What is being edited. `kind` is an open slug — unknown values degrade. */
export type EditSubject =
  | { kind: "homepageSection"; id: string }
  | { kind: "section"; id: string }
  | { kind: "faq"; id: string }
  | { kind: "supportTicket"; id: string }
  | { kind: "listing"; id: string; storeId?: string }
  | { kind: string; id: string; storeId?: string };

export interface EditTarget {
  /** Where the pencil goes. */
  href: string;
  /** Short label for the control, e.g. "Edit in admin". */
  label: string;
  /**
   * Which dashboard answers for it. Lets a surface style the admin and seller
   * affordances differently — the owner asked for them to be "clearly
   * distinguishable".
   */
  scope: "admin" | "store";
  /**
   * Why this target was chosen. 🛑 Carried because a four-way precedence with
   * no explanation is unsupportable — the recorded `Resolution<T>` envelope
   * rule, and the reason `MethodDecision` and `WidgetBlockReason` exist.
   */
  reason: string;
}

const has = (v: EditViewer, key: string) => v.permissions.includes(key);

/*
 * The subject → destination table. 🛑 CONFIG-SHAPED ON PURPOSE: adding a new
 * editable kind is a row here, never a new `if` at a call site. Each entry
 * names the permission that governs it, so the gate and the destination cannot
 * drift apart.
 *
 * ⚠ Every href corresponds to a route that EXISTS — verified against the
 * shop's page tree rather than assumed:
 *   /admin/sections/[section] · /admin/faqs/[id]/edit ·
 *   /admin/support-tickets/[id] · /admin/products/[id]/edit ·
 *   /store/products/[id]/edit
 */
const ADMIN_TABLE: Record<string, { permission: string; href: (id: string) => string; label: string }> = {
  /* "homepage edits inline → redirect to the admin panel" */
  homepageSection: {
    permission: "admin:sections:write",
    href: (id) => `/admin/sections/${encodeURIComponent(id)}`,
    label: "Edit in admin",
  },
  section: {
    permission: "admin:sections:write",
    href: (id) => `/admin/sections/${encodeURIComponent(id)}`,
    label: "Edit in admin",
  },
  faq: {
    permission: "admin:faqs:write",
    href: (id) => `/admin/faqs/${encodeURIComponent(id)}/edit`,
    label: "Edit in admin",
  },
  /* "support … → redirect to the admin panel" */
  supportTicket: {
    permission: "admin:support-tickets:write",
    href: (id) => `/admin/support-tickets/${encodeURIComponent(id)}`,
    label: "Open in admin",
  },
};

/**
 * Resolve where an inline edit affordance should send this viewer, or `null`
 * when it must not render at all.
 */
export function resolveEditTarget(subject: EditSubject, viewer: EditViewer | null | undefined): EditTarget | null {
  /* No session, no affordance. Fail closed before anything else. */
  if (!viewer || !Array.isArray(viewer.permissions)) return null;

  /*
   * ── LISTINGS: the one kind with two possible answers ───────────────────
   *
   * "listing edit → own listing → seller dashboard edit" and "admin all edit".
   *
   * 🛑 ADMIN IS CHECKED FIRST, deliberately. An admin who also owns a store
   * must get the ADMIN editor on every listing including their own, because
   * the admin surface is the one with the fields only an admin may set. The
   * reverse order would silently downgrade an admin to the seller form on
   * their own stock — a narrower editor that looks like the right one.
   */
  if (subject.kind === "listing") {
    if (has(viewer, "admin:products:write")) {
      return {
        href: `/admin/products/${encodeURIComponent(subject.id)}/edit`,
        label: "Edit in admin",
        scope: "admin",
        reason: "admin:products:write",
      };
    }
    /*
     * A seller may edit only their OWN listing. ⚠ An absent `storeId` on the
     * subject is NOT treated as "mine" — that would hand every seller an edit
     * control on every unattributed listing. Unknown ownership fails closed.
     */
    const owned = subject.storeId !== undefined && (viewer.storeIds ?? []).includes(subject.storeId);
    if (owned && viewer.canEditOwnListings === true) {
      return {
        href: `/store/products/${encodeURIComponent(subject.id)}/edit`,
        label: "Edit in seller dashboard",
        scope: "store",
        reason: "owns the store and may edit own listings",
      };
    }
    /* "others → no change" */
    return null;
  }

  /* ── Admin-only kinds, from the table ──────────────────────────────────── */
  const entry = ADMIN_TABLE[subject.kind];
  /* Unknown kind → no affordance. Fail CLOSED: a newer config must not
   * produce a pencil pointing at a guessed route. */
  if (!entry) return null;
  if (!has(viewer, entry.permission)) return null;

  return {
    href: entry.href(subject.id),
    label: entry.label,
    scope: "admin",
    reason: entry.permission,
  };
}

/**
 * Does this viewer have ANY reason to see the edit toggle?
 *
 * 🛑 This replaces the admin-only `can(user, "admin:sections:write")` gate on
 * the navbar toggle. A seller with editable stock must be able to turn edit
 * mode ON, or the per-listing affordance above can never render — the toggle
 * is what gates it.
 *
 * ⚠ But the toggle is NOT the permission. It only reveals affordances;
 * `resolveEditTarget` still decides each one, so a seller flipping it sees
 * pencils on their own listings and nothing on the homepage.
 */
export function viewerCanUseEditMode(viewer: EditViewer | null | undefined): boolean {
  if (!viewer || !Array.isArray(viewer.permissions)) return false;
  return (
    viewer.permissions.some(
      (p) =>
        p === "admin:sections:write" ||
        p === "admin:products:write" ||
        p === "admin:faqs:write" ||
        p === "admin:support-tickets:write",
    ) ||
    /* A seller with at least one store and the write permission. */
    (viewer.canEditOwnListings === true && (viewer.storeIds ?? []).length > 0)
  );
}
