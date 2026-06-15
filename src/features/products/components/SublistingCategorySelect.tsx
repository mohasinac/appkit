"use client";

import React from "react";
import { Stack, Text } from "../../../ui";
import { SublistingInlineSelect } from "../../seller/components/SublistingInlineSelect";

interface Props {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Allow creating a new sub-listing inline. Defaults to false. */
  allowCreate?: boolean;
}

export function SublistingCategorySelect({
  value,
  onChange,
  disabled,
  allowCreate = false,
}: Props) {
  return (
    <Stack gap="xs">
      <Text size="sm" weight="medium" color="primary">
        Sub-listing category
      </Text>
      <SublistingInlineSelect
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowCreate={allowCreate}
        placeholder="— None —"
      />
      <Text size="xs" color="faint">
        Groups this listing with others for the same collectible (e.g. &ldquo;Base Set Charizard 108/120&rdquo;).
      </Text>
    </Stack>
  );
}
