import { z } from "zod";
import { siteSettingsRepository } from "../../../../../../features/admin/repository/site-settings.repository";
import { TOGGLE_CATALOG } from "../../../../../shared/features/site-settings/toggle-catalog";
import { defineAssistantTool } from "../define";

/**
 * `getToggleState` — 2E-ii (overhaul brief). Read-only. Lets the assistant
 * answer "is maintenance mode on" / "is COD payment on right now" with a
 * real, current answer instead of a guess or a stale training-time fact.
 *
 * Wraps 1A-vi's `TOGGLE_CATALOG` — the same closed, curated set of
 * site-wide boolean switches the admin dashboard's search/pin surface
 * already reads. Every value here is public-safe by construction: a
 * disabled payment method or a closed support desk is already observable
 * by trying to use it, which is why `common-toggles.ts`'s own write
 * endpoint has always treated the catalog as a closed, non-secret set.
 *
 * 🛑 Deliberately NO write-capable sibling tool. Letting the model itself
 * flip a toggle is a real safety question, left out of scope on purpose —
 * see the 2E-ii design note in the overhaul plan. A human confirms every
 * mutation through the dashboard card's own confirmation-gated path
 * (9-ii); this tool only ever reads.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

const inputSchema = z.object({
  /** A fuzzy name for the toggle, e.g. "maintenance", "cash on delivery". */
  query: z.string().min(1).max(100),
});

export interface ToggleStateResult {
  id: string;
  label: string;
  enabled: boolean;
}

/**
 * `path.a.b.c` → the boolean at that path, or `undefined` if any segment is
 * missing or the leaf isn't a boolean. Narrower than a generic dot-path
 * getter on purpose — every `TOGGLE_CATALOG.dotPath` resolves to a plain
 * `boolean | "unlisted"` leaf (never an object or array), so the caller
 * never needs anything wider than this. Deliberately NOT imported from
 * `security/pii-encrypt.ts`'s private `getPath` — that module owns
 * PII-path semantics and this one doesn't need them; a 2-copy duplicate of
 * a 6-line helper is below the Rule-of-Three threshold for extracting a
 * shared one.
 */
function getBooleanAtDotPath(
  obj: Record<string, unknown>,
  path: string,
): boolean | undefined {
  let cursor: Record<string, unknown> | boolean | undefined = obj;
  for (const key of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = cursor[key] as Record<string, unknown> | boolean | undefined;
  }
  return typeof cursor === "boolean" ? cursor : undefined;
}

export const getToggleStateTool = defineAssistantTool({
  name: "getToggleState",
  description:
    "Look up whether a named site-wide feature or payment method is currently " +
    "enabled or disabled — e.g. maintenance mode, a payment method, EMI, GST, " +
    "chat, the customer assistant itself, or the announcement bar. Returns the " +
    "CURRENT, live state. Use this instead of guessing when the user asks " +
    "whether something is 'on' or 'off' right now.",
  inputSchema,
  piiClass: "none",
  execute: async (input): Promise<readonly ToggleStateResult[]> => {
    const q = input.query.trim().toLowerCase();

    const matches = TOGGLE_CATALOG.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.id.includes(q.replace(/\s+/g, "-")) ||
        (t.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false),
    );
    if (matches.length === 0) return [];

    const settings = await siteSettingsRepository.getSingleton();

    return matches.slice(0, 5).map((t) => ({
      id: t.id,
      label: t.label,
      enabled: getBooleanAtDotPath(settings as Record<string, unknown>, t.dotPath) !== false,
    }));
  },
});
