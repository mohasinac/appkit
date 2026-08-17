"use client";

import React from "react";
import { Anchor, Button, Div, FieldTextarea, Row, Stack, Text } from "../../../ui";
import { MediaUploadField } from "../../media/upload/MediaUploadField";
import { useMediaUpload } from "../../media/hooks/useMedia";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import type { TesterAnswer } from "../schemas/firestore";

export interface TesterChecklistStepItem {
  checklistItemId: string;
  label: string;
  description?: string;
  href?: string;
  answer: TesterAnswer | null;
  comment?: string;
  screenshotUrl?: string;
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
          <Text weight="medium">{item.label}</Text>
          {item.description && (
            <Text size="xs" color="muted">{item.description}</Text>
          )}
          {item.href && (
            <Anchor href={item.href} tone="brand" underline="hover">
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
