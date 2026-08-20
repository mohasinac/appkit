"use client";

import { useState } from "react";
import type { JsonValue } from "@mohasinac/appkit/client";
import type { PollConfig, EventStatus } from "../types";
import { useAuth } from "../../../react/contexts/SessionContext";
import { ROUTES } from "../../../next";
import { Button, Checkbox, Div, LoginRequiredModal, Span, Stack, Text, Textarea, TextLink } from "../../../ui";
import { EVENT_ENDPOINTS } from "../../../constants/api-endpoints";
import { normalizeError } from "../../../errors/normalize";

const CLS_THANKS_BOX = "rounded-xl border border-success dark:border-success bg-success-surface px-[var(--appkit-space-6)] py-[var(--appkit-space-8)] text-left space-y-2";

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
  const endpoint = entriesEndpoint ?? EVENT_ENDPOINTS.ENTRIES(eventId);
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
      const body: Record<string, JsonValue> = { pollVotes: selectedVotes };
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
      <Stack paddingX="x-5" className={className} gap="3" rounded="xl" padding="y-md" border="default">
        <Text size="sm" weight="medium" color="muted">This poll has closed.</Text>
        {totalEntries !== undefined && (
          <Text size="sm" color="faint">{totalEntries.toLocaleString()} vote{totalEntries !== 1 ? "s" : ""} cast</Text>
        )}
        <Stack gap="sm">
          {pollConfig.options.map((opt) => (
            <Div textSize="sm" key={opt.id} paddingY="y-xs-tall" color="muted" border="subtle" padding="x-md" rounded="lg">
              {opt.label}
            </Div>
          ))}
        </Stack>
      </Stack>
    );
  }

  if (pollConfig.requireLogin && !user) {
    return (
      <Stack className={`text-left ${className}`} gap="3" rounded="xl" paddingY="y-xl" paddingX="x-lg" border="default">
        <Text weight="semibold" color="primary">Login to vote</Text>
        <Text size="sm" color="muted">You need an account to participate in this poll.</Text>
        <TextLink
          variant="bare"
          href={String(ROUTES.AUTH.LOGIN)}
          rounded="xl"
          size="sm"
          weight="semibold"
          paddingX="xl"
          paddingY="sm"
          className="inline-block bg-primary text-white hover:bg-primary-600"
        >
          Log In
        </TextLink>
      </Stack>
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
    <Stack className={`${className}`} gap="md">
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
            className="flex items-center gap-[var(--appkit-space-3)] cursor-pointer rounded-lg border border-[var(--appkit-color-border)] px-[var(--appkit-space-4)] py-[var(--appkit-space-3)] hover:bg-[var(--appkit-color-surface)] transition-colors"
          >
            <Checkbox
              bare
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
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          rows={3}
          className="text-[var(--appkit-color-text-muted)]"
        />
      )}
      {error && <Text className="text-error" size="sm">{error}</Text>}
      <Button
        variant="primary"
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || selectedVotes.length === 0}
        rounded="xl"
        paddingX="xl"
        paddingY="md"
        textSize="sm"
        weight="semibold"
        className="w-full bg-primary hover:bg-primary-600"
      >
        {isLoading ? "Submitting…" : "Submit Vote"}
      </Button>
    </Stack>
  );
}
