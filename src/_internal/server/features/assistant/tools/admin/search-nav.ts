import { z } from "zod";
import { rankNavSearchResults } from "../../../../../../features/shell/searchNavItems";
import { defineAssistantTool, type AnyAssistantToolDef } from "../define";

/**
 * `searchNav` — 2E-ii's admin-facing tool (overhaul brief). Answers "where do
 * I turn off clearance" / "how do I add a coupon" with a real page link,
 * instead of the model guessing from training-time knowledge of a generic
 * admin panel that does not match this one.
 *
 * 🛑 NOT a builtin — it is a FACTORY, not a static tool, because the nav
 * tree it searches (`ADMIN_NAV_GROUPS` / `STORE_NAV_GROUPS`) is defined in
 * the CONSUMER app (`src/constants/navigation.tsx`), not appkit. appkit
 * cannot import consumer code, so the caller flattens its own nav groups
 * into `SearchableNavItem[]` and passes them in here — the same seam
 * `runAssistantTurn`'s own `tools` option already uses for caller-supplied
 * capabilities.
 *
 * Reuses `rankNavSearchResults` (Phase 9's shared scorer, already used by
 * both the ⌘K `CommandPalette` and the dashboard-landing `DashboardQuickJump`)
 * rather than a third, independently-invented ranking — "where is X" and
 * "search for X in the command palette" should agree.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

export interface SearchableNavItem {
  label: string;
  description?: string;
  keywords?: string[];
  groupTitle: string;
  href: string;
}

export interface NavSearchResult {
  label: string;
  href: string;
  description?: string;
}

const inputSchema = z.object({
  /** A fuzzy name for the page/control/setting the user is looking for. */
  query: z.string().min(1).max(100),
});

/** Built from the caller's own flattened nav tree — see the module doc for why this is a factory, not a static export. */
export function createSearchNavTool(items: readonly SearchableNavItem[]): AnyAssistantToolDef {
  return defineAssistantTool({
    name: "searchNav",
    description:
      "Find where a specific admin/seller page, control or setting lives — e.g. " +
      "'where do I turn off clearance', 'how do I add a coupon', 'where are " +
      "payment settings'. Returns the real page link(s). Use this for any " +
      "'where is X' / 'how do I get to Y' question rather than guessing.",
    inputSchema,
    piiClass: "none",
    execute: async (input): Promise<readonly NavSearchResult[]> => {
      const ranked = rankNavSearchResults([...items], input.query);
      return ranked.slice(0, 5).map((item) => ({
        label: item.label,
        href: item.href,
        ...(item.description ? { description: item.description } : {}),
      }));
    },
  });
}
