import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";

export type CopilotFeedback = "positive" | "negative";

export interface UseCopilotFeedbackOptions {
  /** Builds the PATCH endpoint for a given log ID. */
  feedbackEndpoint: (logId: string) => string;
}

/**
 * useCopilotFeedback
 *
 * Sends thumbs-up / thumbs-down feedback on a copilot response.
 * The consumer injects the endpoint builder so appkit stays route-agnostic.
 */
export function useCopilotFeedback({
  feedbackEndpoint,
}: UseCopilotFeedbackOptions) {
  return useMutation({
    mutationFn: async ({
      logId,
      feedback,
    }: {
      logId: string;
      feedback: CopilotFeedback;
    }) => {
      await apiClient.patch(feedbackEndpoint(logId), { feedback });
    },
  });
}
