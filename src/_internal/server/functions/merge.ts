/**
 * `mergeFunctionRegistries(...registries)` — concatenates definition arrays
 * and enforces the explicit-override policy on name collisions.
 *
 * Collision policy:
 *   - If a name appears in only one registry, it is kept as-is.
 *   - If a name appears in more than one registry:
 *       - The later occurrence MUST declare `options.overrides: <name>`
 *         referencing the shadowed name. Else the merge throws.
 *       - When the override is declared, the later entry replaces the earlier
 *         one in the output array. The override is logged via console.info so
 *         that consumers can audit intentional shadowing in deploy logs.
 *
 * The merge order is significant: pass `APPKIT_FUNCTIONS` first, the
 * consumer registry second, so consumers may override appkit entries.
 */

import type { FunctionDefinition } from "./types";

export function mergeFunctionRegistries(
  ...registries: readonly (readonly FunctionDefinition[])[]
): readonly FunctionDefinition[] {
  const byName = new Map<string, FunctionDefinition>();

  for (const registry of registries) {
    for (const def of registry) {
      const existing = byName.get(def.name);
      if (!existing) {
        byName.set(def.name, def);
        continue;
      }
      const override = def.options?.overrides;
      if (override !== def.name) {
        throw new Error(
          `Function name collision: "${def.name}" is declared in two registries. ` +
            `The later definition must declare options.overrides: "${def.name}" to ` +
            `explicitly shadow the earlier one. Got options.overrides: ${JSON.stringify(override)}.`,
        );
      }
       
      console.info(
        `[functions-registry] Override applied: "${def.name}" — consumer definition replaces appkit definition.`,
      );
      byName.set(def.name, def);
    }
  }

  return Array.from(byName.values());
}
