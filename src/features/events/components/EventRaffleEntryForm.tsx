"use client";
import React, { useState } from "react";
import { Button } from "../../../ui/components/Button";
import { Form } from "../../../ui/components/Form";
import { FieldTextarea } from "../../../ui/forms/FieldTextarea";
import { Div, Heading, Span, Stack, Text } from "../../../ui";
import { Badge } from "../../../ui/components/Badge";

const __P = {
  p6: "p-6",
} as const;

export interface EventRaffleEntryFormProps {
  /** Event id used for the entry POST. */
  eventId: string;
  /** Raffle prize label rendered prominently above the form. */
  prizeLabel?: string;
  /** Raffle type — drives the helper copy. */
  raffleType?: "open_raffle" | "top_n_scorers" | "top_n_participants" | "spin_wheel";
  /** Top-N value when raffleType supports it. */
  topN?: number;
  /** Max entries this user already has (drives the over-limit message). */
  userEntryCount?: number;
  /** Server-enforced max entries per user (defaults to 1). */
  maxEntriesPerUser?: number;
  /** When true, the form is in a submitted/locked state. */
  submitted?: boolean;
  /** Caller-provided submit handler. Receives the user's optional message. */
  onSubmit: (message: string) => Promise<void> | void;
}

/**
 * `EventRaffleEntryForm` — W1-18 — fills the gap noted in the plan ("Raffle
 * entry form (71 LOC stub) — no entry form"). Renders the prize hero,
 * eligibility status, an optional message field, and a submit button. Server
 * action wiring stays with the caller via the `onSubmit` prop.
 */
export function EventRaffleEntryForm({
  eventId: _eventId,
  prizeLabel,
  raffleType = "open_raffle",
  topN,
  userEntryCount = 0,
  maxEntriesPerUser = 1,
  submitted = false,
  onSubmit,
}: EventRaffleEntryFormProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const overLimit = userEntryCount >= maxEntriesPerUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overLimit || submitted || busy) return;
    setBusy(true);
    try {
      await onSubmit(message.trim());
    } finally {
      setBusy(false);
    }
  };

  const eligibilityCopy =
    raffleType === "open_raffle"
      ? "Open to all eligible participants — one entry per user."
      : raffleType === "top_n_scorers"
        ? `Top ${topN ?? "N"} highest-scoring entries win.`
        : raffleType === "top_n_participants"
          ? `Earliest ${topN ?? "N"} entries qualify.`
          : "Spin the wheel to claim your prize.";

  return (
    <Stack className={`${__P.p6}`} gap="md" rounded="2xl" border="default">
      {prizeLabel ? (
        <Stack gap="xs">
          <Badge variant="warning">Prize</Badge>
          <Heading level={2} weight="bold" size="2xl">
            {prizeLabel}
          </Heading>
        </Stack>
      ) : null}

      <Text size="sm" color="muted">
        {eligibilityCopy}
      </Text>

      {submitted ? (
        <Div textSize="sm" color="success" surface="success-surface" padding="inline" rounded="lg">
          You&apos;re in. Check the leaderboard for results.
        </Div>
      ) : overLimit ? (
        <Div textSize="sm" color="warning" surface="warning-surface" padding="inline" rounded="lg">
          You&apos;ve used all {maxEntriesPerUser} entry slot{maxEntriesPerUser === 1 ? "" : "s"} for this raffle.
        </Div>
      ) : (
        // audit-variant-ok: entry Form — space-y-3 vertical rhythm; Form lacks spacing variant
        <Form onSubmit={handleSubmit} className="space-y-3">
          <FieldTextarea
            name="message"
            label="Message"
            hint="optional — share why you'd like to win"
            value={message}
            onChange={setMessage}
            rows={3}
            maxLength={500}
            placeholder="Share why you'd like to win"
            disabled={busy}
          />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Submitting…" : "Enter raffle"}
          </Button>
        </Form>
      )}
    </Stack>
  );
}
