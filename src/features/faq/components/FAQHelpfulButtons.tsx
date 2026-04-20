import { useState } from "react";
import { Button, Span, Text } from "../../../ui";

interface FAQHelpfulButtonsProps {
  faqId: string;
  initialHelpful: number;
  initialNotHelpful: number;
  onVote: (input: {
    faqId: string;
    vote: "helpful" | "not-helpful";
  }) => Promise<void>;
  labels?: {
    yes?: string;
    no?: string;
    wasThisHelpful?: string;
    thanksForFeedback?: string;
    voteFailed?: string;
  };
  onVoteError?: (message: string, error: unknown) => void;
}

export function FAQHelpfulButtons({
  faqId,
  initialHelpful,
  initialNotHelpful,
  onVote,
  labels,
  onVoteError,
}: FAQHelpfulButtonsProps) {
  const [helpful, setHelpful] = useState(initialHelpful);
  const [notHelpful, setNotHelpful] = useState(initialNotHelpful);
  const [userVote, setUserVote] = useState<"helpful" | "not-helpful" | null>(
    null,
  );
  const [isPending, setIsPending] = useState(false);

  const handleVote = async (isHelpful: boolean) => {
    if (isPending || userVote) return;

    try {
      setIsPending(true);
      await onVote({
        faqId,
        vote: isHelpful ? "helpful" : "not-helpful",
      });

      if (isHelpful) {
        setHelpful((prev) => prev + 1);
        setUserVote("helpful");
      } else {
        setNotHelpful((prev) => prev + 1);
        setUserVote("not-helpful");
      }
    } catch (error) {
      onVoteError?.(labels?.voteFailed ?? "Failed to record feedback", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-lg bg-zinc-100 p-6 dark:bg-slate-700">
      <Text className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
        {userVote
          ? (labels?.thanksForFeedback ?? "Thanks for your feedback")
          : (labels?.wasThisHelpful ?? "Was this helpful?")}
      </Text>

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => handleVote(true)}
          disabled={isPending || userVote !== null}
          className={`flex-1 gap-2 rounded-lg p-4 transition-all ${
            userVote === "helpful"
              ? "bg-green-600 text-white"
              : userVote
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500 opacity-50 dark:bg-slate-600 dark:text-zinc-400"
                : "bg-white text-zinc-800 hover:bg-green-50 dark:bg-slate-800 dark:text-zinc-100 dark:hover:bg-green-900/20"
          }`}
        >
          <Span className="text-sm">{labels?.yes ?? "Yes"}</Span>
          <Span className="text-sm text-zinc-500 dark:text-zinc-400">
            ({helpful})
          </Span>
        </Button>

        <Button
          variant="ghost"
          onClick={() => handleVote(false)}
          disabled={isPending || userVote !== null}
          className={`flex-1 gap-2 rounded-lg p-4 transition-all ${
            userVote === "not-helpful"
              ? "bg-red-600 text-white"
              : userVote
                ? "cursor-not-allowed bg-zinc-200 text-zinc-500 opacity-50 dark:bg-slate-600 dark:text-zinc-400"
                : "bg-white text-zinc-800 hover:bg-red-50 dark:bg-slate-800 dark:text-zinc-100 dark:hover:bg-red-900/20"
          }`}
        >
          <Span className="text-sm">{labels?.no ?? "No"}</Span>
          <Span className="text-sm text-zinc-500 dark:text-zinc-400">
            ({notHelpful})
          </Span>
        </Button>
      </div>
    </div>
  );
}
