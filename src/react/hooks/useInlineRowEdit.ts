"use client";
import { normalizeError } from "../../errors/normalize";
import { useCallback, useState } from "react";

export interface InlineEditOptions<TValue> {
  rowId: string;
  field: string;
  initialValue: TValue;
  save: (rowId: string, field: string, value: TValue) => Promise<unknown>;
  // audit-unknown-ok: error-handler entry point — accepts thrown values of any shape
  onError?: (err: unknown, previous: TValue) => void;
}

export interface InlineToggleResult {
  value: boolean;
  isSaving: boolean;
  toggle: () => Promise<void>;
}

export function useInlineToggle({
  rowId,
  field,
  initialValue,
  save,
  onError,
}: InlineEditOptions<boolean>): InlineToggleResult {
  const [value, setValue] = useState<boolean>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = useCallback(async () => {
    const previous = value;
    const next = !previous;
    setValue(next);
    setIsSaving(true);
    try {
      await save(rowId, field, next);
    } catch (err) {
      void normalizeError(err);
      setValue(previous);
      onError?.(err, previous);
    } finally {
      setIsSaving(false);
    }
  }, [value, save, rowId, field, onError]);

  return { value, isSaving, toggle };
}

export interface InlineTextResult {
  value: string;
  draft: string;
  isEditing: boolean;
  isSaving: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  commitEdit: () => Promise<void>;
  setDraft: (next: string) => void;
}

export function useInlineTextEdit({
  rowId,
  field,
  initialValue,
  save,
  onError,
}: InlineEditOptions<string>): InlineTextResult {
  const [value, setValue] = useState<string>(initialValue);
  const [draft, setDraft] = useState<string>(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = useCallback(() => {
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const cancelEdit = useCallback(() => {
    setDraft(value);
    setIsEditing(false);
  }, [value]);

  const commitEdit = useCallback(async () => {
    if (draft === value) {
      setIsEditing(false);
      return;
    }
    const previous = value;
    setValue(draft);
    setIsEditing(false);
    setIsSaving(true);
    try {
      await save(rowId, field, draft);
    } catch (err) {
      void normalizeError(err);
      setValue(previous);
      setDraft(previous);
      onError?.(err, previous);
    } finally {
      setIsSaving(false);
    }
  }, [draft, value, save, rowId, field, onError]);

  return {
    value,
    draft,
    isEditing,
    isSaving,
    startEdit,
    cancelEdit,
    commitEdit,
    setDraft,
  };
}
