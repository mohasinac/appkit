"use client";

/*
 * WHY: `CategoryInlineSelect` is single-select, so every surface that needs a
 *      LIST of categories has to wrap it in the same add-one/remove-one chip
 *      arrangement. Two editors had already written it — the admin coupon
 *      editor and the seller one — identically, and a third was about to.
 * WHAT: The multi-category picker, once.
 *
 * It lives at module level rather than as an inline `renderers` entry because
 * an inline renderer's handler sits six braces deep inside `useMemo`, which is
 * what `audit-code-quality`'s DEEP_NESTING rule exists to stop.
 *
 * EXPORTS: CategoryChipPicker
 *
 * @tag domain:seller,promotions
 * @tag layer:component
 * @tag pattern:none
 * @tag access:client
 * @tag consumers:AdminCouponEditorView,SellerCouponEditorView
 * @tag sideEffects:none
 */

import React from "react";
import { IconButton, Row, Span, Stack, Text } from "../../../ui";
import { CategoryInlineSelect } from "./CategoryInlineSelect";

export interface CategoryChipPickerProps {
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  /** Copy under the control. Defaults to the coupon wording. */
  emptyHint?: string;
  allowCreate?: boolean;
}

export function CategoryChipPicker({
  selected,
  onSelectedChange,
  emptyHint = "Leave empty to apply to every category.",
  allowCreate = false,
}: CategoryChipPickerProps) {
  const add = (id: string) => {
    if (!id || selected.includes(id)) return;
    onSelectedChange([...selected, id]);
  };
  return (
    <Stack gap="xs">
      <CategoryInlineSelect
        value=""
        onChange={add}
        allowCreate={allowCreate}
        placeholder="Add a category…"
      />
      {selected.length > 0 && (
        <Row wrap gap="sm" padding="t-2xs">
          {selected.map((cid) => (
            <Span
              layout="inline-flex"
              gap="xs"
              key={cid}
              border="strong"
              padding="pill-sm"
              rounded="full"
              surface="muted"
              color="primary"
              size="xs"
            >
              {cid}
              <IconButton
                aria-label={`Remove ${cid}`}
                variant="ghost"
                size="sm"
                onClick={() => onSelectedChange(selected.filter((c) => c !== cid))}
                icon="×"
              />
            </Span>
          ))}
        </Row>
      )}
      <Text size="xs" color="muted">
        {emptyHint}
      </Text>
    </Stack>
  );
}
