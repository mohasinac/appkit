/*
 * WHY: D7 — the action index is a Firestore CONTROL PLANE over a static TS
 *      base, not a second copy of it. An admin can hide, rename, re-describe,
 *      retag, reorder and author entries; the code keeps `kind`, `href` and
 *      every permission field for built-ins, because renaming a toggle is
 *      content and repointing a built-in route is routing.
 * WHAT: The `actionIndex/global` singleton and its repository.
 *
 * ## Deliberately NOT folded into `siteSettings`
 *
 * That document is read by an unauthenticated, edge-cached route
 * (`GET /api/site-settings`, `s-maxage=600`). This one is projected by role and
 * must never be served from a shared cache — putting them together is one
 * refactor away from publishing the admin site map, which is exactly the class
 * of defect Root Cause #70 records.
 *
 * ## One document, ~85 KB
 *
 * ~380 entries at full size, comfortably inside Firestore's 1 MB ceiling, and
 * one read rather than a query. The read path caches for 5 minutes and is
 * fetched **once per session per portal** — a read per keystroke would exhaust
 * the 50k/day free tier at roughly thirty sessions, and typeahead matching has
 * to be sub-16ms anyway, which a network hop is not.
 *
 * EXPORTS: ActionIndexRepository, actionIndexRepository
 *
 * @tag domain:search
 * @tag layer:repository
 * @tag pattern:singleton-doc
 * @tag access:server
 * @tag consumers:/api/admin/action-index,/api/action-index
 * @tag sideEffects:firestore
 */

import { BaseRepository } from "../../../providers/db-firebase";
import {
  ACTION_INDEX_COLLECTION,
  ACTION_INDEX_DOC_ID,
  type ActionIndexControl,
  type ActionIndexEntry,
  type ActionIndexOverride,
} from "./types";

/** The stored document. `id` is always `ACTION_INDEX_DOC_ID`. */
export interface ActionIndexDocument extends ActionIndexControl {
  id: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/** What an empty control plane looks like — no overrides, no custom entries. */
const EMPTY_CONTROL: ActionIndexControl = { entries: {}, custom: [] };

export class ActionIndexRepository extends BaseRepository<ActionIndexDocument> {
  constructor() {
    super(ACTION_INDEX_COLLECTION);
  }

  /**
   * The control document, or an empty one.
   *
   * 🛑 Returns EMPTY rather than null, and that is load-bearing:
   * `mergeActionIndex` treats a missing control as "no overrides", so a site
   * that has never opened the admin screen still gets the full static base.
   * A null here would make every caller write the same `?? EMPTY` and one of
   * them would forget, blanking the search.
   */
  async getControl(): Promise<ActionIndexControl> {
    const doc = await this.findById(ACTION_INDEX_DOC_ID);
    if (!doc) return EMPTY_CONTROL;
    return { entries: doc.entries ?? {}, custom: doc.custom ?? [] };
  }

  /**
   * Overwrite one entry's override.
   *
   * Merged into the stored map rather than replacing it, because the admin
   * screen edits one row at a time and a whole-map write would drop every
   * other override made in a different browser tab — the lost-update shape
   * that `mergeLotteryConfig` exists to prevent on the lottery side.
   */
  async setOverride(
    entryId: string,
    override: ActionIndexOverride,
    actorUid: string,
  ): Promise<void> {
    const control = await this.getControl();
    const next: ActionIndexControl = {
      ...control,
      entries: { ...control.entries, [entryId]: override },
    };
    await this.write(next, actorUid);
  }

  /** Drop an override, returning the entry to whatever the code says. */
  async clearOverride(entryId: string, actorUid: string): Promise<void> {
    const control = await this.getControl();
    const entries = { ...control.entries };
    delete entries[entryId];
    await this.write({ ...control, entries }, actorUid);
  }

  /**
   * Replace the admin-authored entries.
   *
   * Whole-array, unlike `setOverride`: the custom list is edited as a list in
   * one screen, and its ids are chosen by the admin rather than derived, so
   * there is no stable key to merge on.
   */
  async setCustomEntries(custom: ActionIndexEntry[], actorUid: string): Promise<void> {
    const control = await this.getControl();
    await this.write({ ...control, custom }, actorUid);
  }

  private async write(control: ActionIndexControl, actorUid: string): Promise<void> {
    const payload = { ...control, updatedAt: new Date(), updatedBy: actorUid };
    const existing = await this.findById(ACTION_INDEX_DOC_ID);
    if (existing) await this.update(ACTION_INDEX_DOC_ID, payload);
    else await this.createWithId(ACTION_INDEX_DOC_ID, payload);
  }
}

export const actionIndexRepository = new ActionIndexRepository();
