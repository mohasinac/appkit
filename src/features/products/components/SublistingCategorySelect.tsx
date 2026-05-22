"use client";

import React, { useEffect, useState } from "react";
import { Select, Stack, Text } from "../../../ui";
import type { SelectOption } from "../../../ui";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { apiClient } from "../../../http";

interface Props {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function SublistingCategorySelect({ value, onChange, disabled }: Props) {
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`${ADMIN_ENDPOINTS.SUBLISTING_CATEGORIES}?pageSize=200&sorts=name`)
      .then((res) => {
        if (cancelled) return;
        const items: unknown[] = (res as any)?.data?.items ?? [];
        const opts: SelectOption[] = [
          { value: "", label: "— None —" },
          ...items.map((item: any) => ({
            value: String(item.id ?? ""),
            label: item.itemCode
              ? `${item.name} (${item.itemCode})`
              : String(item.name ?? ""),
          })),
        ];
        setOptions(opts);
      })
      .catch(() => {
        if (!cancelled) setOptions([{ value: "", label: "— None —" }]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Stack gap="xs">
      <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Sub-listing category
      </Text>
      <Select
        options={loading ? [{ value: "", label: "Loading…" }] : options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        aria-label="Sub-listing category"
      />
      <Text className="text-xs text-zinc-400 dark:text-zinc-400">
        Groups this listing with others for the same collectible (e.g. &ldquo;Base Set Charizard 108/120&rdquo;).
      </Text>
    </Stack>
  );
}
