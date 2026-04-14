"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../http";

export interface VoteFaqInput {
  faqId: string;
  vote: "helpful" | "not_helpful";
}

export interface VoteFaqResult {
  helpfulCount: number;
  notHelpfulCount?: number;
  userVote?: VoteFaqInput["vote"] | null;
}

export interface UseFaqVoteOptions {
  mutationFn?: (data: VoteFaqInput) => Promise<VoteFaqResult>;
  endpoint?: string;
}

export function useFaqVote(options?: UseFaqVoteOptions) {
  return useMutation<VoteFaqResult, Error, VoteFaqInput>({
    mutationFn:
      options?.mutationFn ??
      ((data) => apiClient.post<VoteFaqResult>(options?.endpoint ?? "/api/faqs/vote", data)),
  });
}
