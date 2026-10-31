import { z } from "zod";

/**
 * The one field both assistant surfaces (the floating widget's mini panel
 * and the full-chat page) collect. Shared so `useFormShellState(schema)`
 * has something real to validate against — see Rule #9 and
 * `audit-form-schema`.
 */
export const askAssistantSchema = z.object({
  question: z.string().min(1, "Type a question first.").max(2000),
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
