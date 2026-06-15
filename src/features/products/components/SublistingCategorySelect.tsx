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
      <Text className="text-zinc-900 dark:text-zinc-100" size="sm" weight="medium">
        Sub-listing category
      </Text>
      <SublistingInlineSelect
        value={value}
        onChange={onChange}
        disabled={disabled}
        allowCreate={allowCreate}
        placeholder="— None —"
      />
      <Text className="text-zinc-400 dark:text-zinc-400" size="xs">
        Groups this listing with others for the same collectible (e.g. &ldquo;Base Set Charizard 108/120&rdquo;).
      </Text>
    </Stack>
  );
}
