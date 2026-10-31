import { logServerInfo } from "../../../../../monitoring";
import type { AnyAssistantToolDef } from "./define";

/**
 * `mergeAssistantToolRegistries(...)` — concatenates tool-def arrays and
 * enforces the explicit-override policy on name collisions.
 *
 * Same collision policy as `mergeFunctionRegistries`
 * (`appkit/src/_internal/server/functions/merge.ts`):
 *   - A name that appears in only one registry is kept as-is.
 *   - A name that appears in more than one registry THROWS unless the later
 *     occurrence declares `overrides: <name>` — in which case it replaces the
 *     earlier one, logged via `logServerInfo` so an intentional shadow shows
 *     up in server logs rather than silently winning.
 *
 * Pass the built-in registry first and a consumer/project-specific one
 * second, so a project may override an appkit-provided tool by name.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */
export function mergeAssistantToolRegistries(
  ...registries: readonly (readonly AnyAssistantToolDef[])[]
): readonly AnyAssistantToolDef[] {
  const byName = new Map<string, AnyAssistantToolDef>();

  for (const registry of registries) {
    for (const def of registry) {
      const existing = byName.get(def.name);
      if (!existing) {
        byName.set(def.name, def);
        continue;
      }
      if (def.overrides !== def.name) {
        throw new Error(
          `Assistant tool name collision: "${def.name}" is declared in two registries. ` +
            `The later definition must declare overrides: "${def.name}" to explicitly ` +
            `shadow the earlier one. Got overrides: ${JSON.stringify(def.overrides)}.`,
        );
      }
      logServerInfo(`[assistant-tools] Override applied: "${def.name}"`, {
        detail: "later definition replaces the earlier one",
      });
      byName.set(def.name, def);
    }
  }

  return Array.from(byName.values());
}
