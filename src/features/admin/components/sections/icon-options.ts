import { ICONS } from "../../../../ui/icons/icon-registry";
import type { PaginatedSelectOption } from "../../../../ui/components/PaginatedSelect";

/**
 * Every valid icon key, as options for the section builders.
 *
 * ## 🛑 Why a picker and not the free-text input this replaces
 *
 * The trust-indicator icon field was `<Input label="Icon (emoji or text)">`,
 * and "+ Add indicator" seeded it with `"✨"`. Both were honest while the value
 * had no reader — the component used `icon` only as a React key and rendered a
 * hardcoded `✓` regardless. Now that `resolveTrustIcon` reads it, a free-text
 * value that is not a registry key resolves to `undefined` and the tile renders
 * with no icon at all: a silent blank, authored through a field that accepted
 * it without complaint.
 *
 * Rule #9 also applies on its own terms — 56 options is well past the 5 above
 * which a selection must use `<PaginatedSelect>` rather than a bare input.
 *
 * The keys are intent words (`verify`, `restore`, `ship`, `lock`), so the key
 * IS the label; there is no separate display string to keep in sync.
 */
export const ICON_KEY_OPTIONS: PaginatedSelectOption<string>[] = Object.keys(ICONS)
  .sort()
  .map((key) => ({ value: key, label: key }));
