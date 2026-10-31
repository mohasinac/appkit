import { zodInputToJsonSchema } from "./json-schema";
import type { ToolSchema } from "../../../../shared/features/assistant/types";
import type { AnyAssistantToolDef } from "./define";

/**
 * Derive the model-facing `ToolSchema[]` from a set of tool definitions.
 *
 * This is the ONLY place a tool's JSON Schema is produced. The schema the
 * model is told about *is* the one `turn.ts` validates the model's tool-call
 * arguments against, because both read `tool.inputSchema` — there is no
 * second hand-written copy to disagree with it (Root Cause #42/#61: two
 * independent descriptions of one contract drift, and the drift is invisible
 * until a model emits arguments the real validator rejects).
 *
 * 🛑 Derived via `zodInputToJsonSchema` (`./json-schema.ts`), NOT zod 4's
 * native `toJSONSchema()` — appkit pins zod `^3.24`, which has no such
 * export. See that module's header for why.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */
export function buildToolManifest(tools: readonly AnyAssistantToolDef[]): readonly ToolSchema[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodInputToJsonSchema(tool.inputSchema),
  }));
}
