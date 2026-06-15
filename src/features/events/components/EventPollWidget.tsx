"use client";

import { useState } from "react";
import type { PollConfig, EventStatus } from "../types";
import { useAuth } from "../../../react/contexts/SessionContext";
import { ROUTES } from "../../../next";
import { Div, LoginRequiredModal, Span, Stack, Text } from "../../../ui";
import { normalizeError } from "../../../errors/normalize";

const CLS_THANKS_BOX = "rounded-xl border border-success dark:border-success bg-success-surface px-6 py-8 text-center space-y-2";

interface EventPollWidgetProps {
  eventId: string;
  pollConfig: PollConfig;
  eventStatus: EventStatus;
  totalEntries?: number;
  /** Override the POST endpoint — defaults to /api/events/{eventId}/entries */
  entriesEndpoint?: string;
  className?: string;
}

export function EventPollWidget({
  eventId,
  pollConfig,
  eventStatus,
  totalEntries,
  entriesEndpoint,
  className = "",
}: EventPollWidgetProps) {
  const { user } = useAuth();
  const endpoint = entriesEndpoint ?? `/api/events/${eventId}/entries`;
  const isEnded = eventStatus === "ended";
  const isMulti = pollConfig.allowMultiSelect;

  const [selectedVotes, setSelectedVotes] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const toggleVote = (id: string) => {
    if (isMulti) {
      setSelectedVotes((prev) =>
        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
      );
    } else {
      setSelectedVotes([id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedVotes.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { pollVotes: selectedVotes };
      if (comment.trim()) body.pollComment = comment.trim();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setShowLoginModal(true);
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to submit vote");
      }
      setIsSubmitted(true);
    } catch (err) {
      void normalizeError(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEnded) {
    return (
      <Div className={`px-5 space-y-3 ${className}`} rounded="xl" padding="y-md" border="default">
        <Text size="sm" weight="medium" color="muted">This poll has closed.</Text>
        {totalEntries !== undefined && (
          <Text size="sm" color="faint">{totalEntries.toLocaleString()} vote{totalEntries !== 1 ? "s" : ""} cast</Text>
        )}
        <Stack gap="sm">
          {pollConfig.options.map((opt) => (
            <Div key={opt.id} className="border border-zinc-100 dark:border-zinc-800 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400" rounded="lg">
              {opt.label}
            </Div>
          ))}
        </Stack>
      </Div>
    );
  }

  if (pollConfig.requireLogin && !user) {
    return (
      <Div className={`px-6 text-center space-y-3 ${className}`} rounded="xl" padding="y-xl" border="default">
        <Text weight="semibold" color="primary">Login to vote</Text>
        <Text size="sm" color="muted">You need an account to participate in this poll.</Text>
        <a
          href={String(ROUTES.AUTH.LOGIN)}
          className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
        >
          Log In
        </a>
      </Div>
    );
  }

  if (isSubmitted) {
    return (
      <Div className={`${CLS_THANKS_BOX} ${className}`}>
        <Text className="text-success" weight="semibold">Vote recorded!</Text>
        <Text size="sm" color="muted">Thanks for participating.</Text>
      </Div>
    );
  }

  return (
    <Div className={`space-y-4 ${className}`}>
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="You need to be signed in to vote in this poll. Please log in or create an account to continue."
      />
      <Text size="sm" weight="medium" color="primary">
        {isMulti ? "Select all that apply:" : "Choose one:"}
      </Text>
      <Stack gap="sm">
        {pollConfig.options.map((opt) => (
          <label
            key={opt.id}
            className="flex items-center gap-3 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <input
              type={isMulti ? "checkbox" : "radio"}
              name={`poll-${eventId}`}
              value={opt.id}
              checked={selectedVotes.includes(opt.id)}
              onChange={() => toggleVote(opt.id)}
              className="accent-primary"
            />
            <Span size="sm" color="muted">{opt.label}</Span>
          </label>
        ))}
      </Stack>
      {pollConfig.allowComment && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          rows={3}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
      {error && <Text className="text-error" size="sm">{error}</Text>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || selectedVotes.length === 0}
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
      >
        {isLoading ? "Submitting…" : "Submit Vote"}
      </button>
    </Div>
  );
}
