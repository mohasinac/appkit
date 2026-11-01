"use client";

import { useState, type ReactNode } from "react";
import { normalizeError } from "../../errors/normalize";
import { useEditMode } from "../../_internal/client/edit-mode/EditModeProvider";
import { getClientLiveEditProvider } from "../../contracts/client-live-edit";
import { useInlineTextEdit } from "../../react/hooks/useInlineRowEdit";
import { Row, Stack } from "./Layout";
import { Text } from "./Typography";
import { IconButton } from "./IconButton";
import { Textarea } from "./Textarea";
import { Icon } from "./Icon";

export interface LiveEditableRegionProps {
  /** The provider's own vocabulary — e.g. `"faq"`. Passed through to `ILiveEditProvider.save`. */
  contentType: string;
  id: string;
  field: string;
  /** The RAW, stored value — what gets edited and saved. */
  value: string;
  /**
   * How to render `value` when not editing. Defaults to plain text. Pass
   * this for content that goes through its own pipeline before display —
   * e.g. FAQ answers run through `resolvePublishedCopy()` token
   * substitution, and editing must act on the raw `{{token}}`-bearing
   * text, not the substituted result.
   */
  renderValue?: (value: string) => ReactNode;
}

/**
 * Point 7 of the overhaul brief. Outside edit mode (every buyer/seller
 * session, and an admin who has not flipped the toggle) this renders
 * `value` and NOTHING else — same markup a buyer gets, which is what makes
 * the toggle double as a "does this content actually look the way I
 * expect" check.
 *
 * Inside edit mode with no `liveEdit` provider registered, it renders a
 * disabled pencil rather than a control that would silently do nothing —
 * a provider-less install gets an honest "not wired yet", not a dead button.
 */
export function LiveEditableRegion({ contentType, id, field, value, renderValue }: LiveEditableRegionProps) {
  const { editMode } = useEditMode();
  const [saveError, setSaveError] = useState<string | null>(null);

  const providerRegistered = !!getClientLiveEditProvider();
  const render = renderValue ?? ((v: string) => <Text>{v}</Text>);

  const edit = useInlineTextEdit({
    rowId: id,
    field,
    initialValue: value,
    save: async (rowId, f, next) => {
      setSaveError(null);
      const provider = getClientLiveEditProvider();
      if (!provider) {
        setSaveError("No live-edit provider registered.");
        throw new Error("liveEdit provider not registered");
      }
      await provider.save({ contentType, id: rowId, field: f, value: next });
    },
    onError: (err) => {
      void normalizeError(err);
      setSaveError("Could not save — please try again.");
    },
  });

  if (!editMode) {
    return <>{render(value)}</>;
  }

  if (!edit.isEditing) {
    return (
      <Row gap="xs" align="start">
        {render(edit.value)}
        <IconButton
          size="sm"
          aria-label={`Edit ${field}`}
          onClick={edit.startEdit}
          disabled={!providerRegistered}
          title={providerRegistered ? undefined : "No live-edit provider registered for this install"}
        >
          <Icon name="edit" size="sm" />
        </IconButton>
      </Row>
    );
  }

  return (
    <Stack gap="xs">
      <Textarea
        value={edit.draft}
        onChange={(e) => edit.setDraft(e.target.value)}
        disabled={edit.isSaving}
        rows={3}
      />
      <Row gap="xs">
        <IconButton size="sm" aria-label="Save" onClick={edit.commitEdit} disabled={edit.isSaving}>
          <Icon name="confirm" size="sm" />
        </IconButton>
        <IconButton size="sm" aria-label="Cancel" onClick={edit.cancelEdit} disabled={edit.isSaving}>
          <Icon name="cancel" size="sm" />
        </IconButton>
      </Row>
      {saveError ? <Text size="xs" color="error">{saveError}</Text> : null}
    </Stack>
  );
}
