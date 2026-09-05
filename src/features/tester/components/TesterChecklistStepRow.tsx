"use client";

import React from "react";
import { Anchor, Button, Details, Div, FieldTextarea, Li, Ol, Row, Stack, Summary, Text } from "../../../ui";
import { MediaUploadField } from "../../media/upload/MediaUploadField";
import { useMediaUpload } from "../../media/hooks/useMedia";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { TesterAnswer, TesterCaseRole } from "../schemas/firestore";

export interface TesterChecklistStepItem {
  checklistItemId: string;
  label: string;
  description?: string;
  href?: string;
  /* ── The six-part contract, rendered so a human reads exactly what the
   * automated tester reads. One catalogue, one source of truth — a separate
   * crib sheet for people would drift from the cases within a week. */
  roles?: TesterCaseRole[];
  startPage?: string;
  steps?: string[];
  inputs?: Record<string, string | number | boolean>;
  expectedBehaviour?: string;
  expectedUiState?: string;
  expectedData?: Record<string, string | number | boolean>;
  endResult?: string;
  answer: TesterAnswer | null;
  comment?: string;
  screenshotUrl?: string;
}

/** Human-facing labels for the role chip. `seller` is specifically the listing's OWNER. */
const ROLE_LABEL: Record<TesterCaseRole, string> = {
  guest: "Signed out",
  buyer: "As a buyer",
  seller: "As the owning seller",
  admin: "As an admin",
  employee: "As an employee",
};

/**
 * `inputs` / `expectedData` as a two-column list.
 *
 * Rendered as key/value rather than pretty-printed JSON because the reader is a
 * person about to type these into a form — braces and quotes are noise, and a
 * value they have to mentally unescape is a value they will get wrong.
 *
 * Renders nothing at all when the case has no such data, which is the common case:
 * a read-only page enters nothing and has nothing checkable behind the screen.
 */
function KeyValueBlock({
  label,
  data,
}: {
  label: string;
  data?: Record<string, string | number | boolean>;
}) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) return null;
  return (
    <Stack gap="none">
      <Text size="xs" weight="semibold" color="muted">{label}</Text>
      {entries.map(([k, v]) => (
        <Row key={k} gap="xs" align="baseline" wrap>
          <Text size="sm" color="muted">{k}</Text>
          <Text size="sm" weight="medium" numeric={typeof v === "number"}>{String(v)}</Text>
        </Row>
      ))}
    </Stack>
  );
}

export interface TesterChecklistStepRowProps {
  item: TesterChecklistStepItem;
  testerDisplayName: string;
  onAnswer: (checklistItemId: string, answer: TesterAnswer) => void;
  onSaveNote: (checklistItemId: string, comment: string, screenshotUrl: string) => Promise<void>;
}

export function TesterChecklistStepRow({
  item,
  testerDisplayName,
  onAnswer,
  onSaveNote,
}: TesterChecklistStepRowProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [comment, setComment] = React.useState(item.comment ?? "");
  const [screenshotUrl, setScreenshotUrl] = React.useState(item.screenshotUrl ?? "");
  const [saving, setSaving] = React.useState(false);
  const { upload } = useMediaUpload();

  const handleUpload = async (file: File): Promise<string> =>
    upload(file, "tester-screenshots", false, {
      type: "tester-screenshot",
      testerName: testerDisplayName,
      checklistItemId: item.checklistItemId,
    });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveNote(item.checklistItemId, comment, screenshotUrl);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="xs" padding="sm" border="default" rounded="md">
      <Row gap="sm" justify="between" align="center" wrap>
        <Stack gap="none" className="min-w-0">
          <Row gap="xs" align="center" wrap>
            {/* Roles sit on the COLLAPSED row: a tester must know who to be before
                deciding whether they can run the case at all. Several roles means
                the case is ABOUT the difference between them. */}
            {item.roles?.map((r) => (
              <Text key={r} size="xs" weight="semibold" color="muted">
                {ROLE_LABEL[r]}
              </Text>
            ))}
            <Text weight="medium">{item.label}</Text>
          </Row>
          {item.description && (
            <Text size="xs" color="muted">{item.description}</Text>
          )}
          {item.href && (
            <Anchor href={item.href} tone="brand" underline="hover" target="_blank" rel="noopener noreferrer">
              Go test this →
            </Anchor>
          )}
        </Stack>
        <Row gap="xs">
          <Button
            type="button"
            size="sm"
            variant={item.answer === "yes" ? "primary" : "outline"}
            onClick={() => onAnswer(item.checklistItemId, "yes")}
          >
            Yes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={item.answer === "no" ? "danger" : "outline"}
            onClick={() => onAnswer(item.checklistItemId, "no")}
          >
            No
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide note" : "Add note"}
          </Button>
        </Row>
      </Row>

      {/*
        The procedure, collapsed by default.

        A page carries up to 40 cases and a 12-step case is a lot of vertical
        space — expanding every one turns a working list into a wall of text. But
        it must be ONE CLICK away, never hidden: a tester who cannot see the steps
        invents their own, which is the whole problem this replaces.

        The five parts stay visually separate. Running them into one paragraph
        reintroduces exactly the ambiguity the split exists to remove — most
        importantly between "what the system does" and "what I should see", whose
        gap is a real bug class here (a write succeeds, the screen never updates).
      */}
      {(item.steps?.length ||
        item.expectedBehaviour ||
        item.expectedUiState ||
        item.endResult ||
        item.inputs ||
        item.expectedData) && (
        <Details tone="card" padding="sm" defaultOpen={false}>
          <Summary>
            {item.steps?.length ? `Steps (${item.steps.length})` : "Expected result"}
          </Summary>
          <Stack gap="sm">
            {item.startPage && (
              <Stack gap="none">
                <Text size="xs" weight="semibold" color="muted">Start</Text>
                <Text size="sm">{item.startPage}</Text>
              </Stack>
            )}
            {item.steps?.length ? (
              <Stack gap="none">
                <Text size="xs" weight="semibold" color="muted">Steps</Text>
                <Ol marker="decimal" indent="md" spacing="tight" size="sm">
                  {item.steps.map((step, i) => (
                    <Li key={i}>{step}</Li>
                  ))}
                </Ol>
              </Stack>
            ) : null}
            {/* The exact values, as a table rather than buried in a sentence.
                A tester copies them; a runner asserts against them. Prose alone
                lets two people type two different numbers. */}
            <KeyValueBlock label="Enter exactly" data={item.inputs} />
            {item.expectedBehaviour && (
              <Stack gap="none">
                <Text size="xs" weight="semibold" color="muted">Expected behaviour</Text>
                <Text size="sm">{item.expectedBehaviour}</Text>
              </Stack>
            )}
            {item.expectedUiState && (
              <Stack gap="none">
                <Text size="xs" weight="semibold" color="muted">Expected UI state</Text>
                <Text size="sm">{item.expectedUiState}</Text>
              </Stack>
            )}
            <KeyValueBlock label="Values that must be correct" data={item.expectedData} />
            {item.endResult && (
              <Stack gap="none">
                <Text size="xs" weight="semibold" color="muted">After reload</Text>
                <Text size="sm">{item.endResult}</Text>
              </Stack>
            )}
          </Stack>
        </Details>
      )}

      {expanded && (
        <Div padding="t-sm" border="default" className="border-t">
          <Stack gap="sm">
            <FieldTextarea
              name={`comment-${item.checklistItemId}`}
              label="Comment"
              value={comment}
              onChange={setComment}
              placeholder="What did you notice? Colors, styles, readability, bugs..."
            />
            <MediaUploadField
              label="Screenshot (optional)"
              value={screenshotUrl}
              onChange={setScreenshotUrl}
              onUpload={handleUpload}
              kind="image"
            />
            <Row>
              <Button
                type="button"
                action={ACTIONS.TESTER["save-note"]}
                isLoading={saving}
                onClick={handleSave}
              />
            </Row>
          </Stack>
        </Div>
      )}
    </Stack>
  );
}
