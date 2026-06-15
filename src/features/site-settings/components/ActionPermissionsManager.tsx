"use client";
import React, { useState, useTransition, useMemo } from "react";
import { Toggle, Badge, Text, Div, Stack, Row, Input, Span, Table, Thead, Tbody, Tr, Th, Td } from "../../../ui";
import { ACTION_META, ACTION_ID } from "../../products/constants/action-defs";
import type { ActionId } from "../../products/constants/action-defs";
import { useToast } from "../../../ui";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_CUSTOM_PILL = "inline-block rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning dark:bg-warning-surface dark:text-warning";

export interface ActionPermissionsManagerProps {
  initialConfig: Record<string, { enabled: boolean }>;
  onUpdate: (actionId: string, enabled: boolean) => Promise<void>;
}

const CATEGORY_LABELS: Record<string, string> = {
  "buy-now": "Public CTA",
  "add-to-cart": "Public CTA",
  "add-to-wishlist": "Public CTA",
  "remove-from-wishlist": "Public CTA",
  "make-offer": "Public CTA",
  "share": "Public CTA",
  "compare": "Public CTA",
  "place-bid": "Auction CTA",
  "buy-now-auction": "Auction CTA",
  "watch-auction": "Auction CTA",
  "unwatch-auction": "Auction CTA",
  "reserve-now": "Pre-order CTA",
  "cancel-reservation": "Pre-order CTA",
  "checkout": "Checkout",
  "enter-prize-draw": "Prize Draw",
  "enter-raffle": "Raffle",
  "report-listing": "Moderation",
  "follow-store": "Social",
  "write-review": "Reviews",
  "message-seller": "Messaging",
  "become-seller": "Seller",
  "request-payout": "Seller",
  "respond-to-review": "Seller",
  "cancel-order": "Orders",
  "request-return": "Orders",
  "reorder": "Orders",
  "track-order": "Orders",
  "edit-profile": "Account",
  "add-address": "Account",
  "edit-address": "Account",
  "delete-address": "Account",
  "change-password": "Account",
  "delete-account": "Account",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Public CTA": "bg-info-surface text-info dark:bg-info-surface dark:text-info",
  "Auction CTA": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Pre-order CTA": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Checkout": "bg-success-surface text-success dark:bg-success-surface dark:text-success",
  "Prize Draw": "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning",
  "Raffle": "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning",
  "Moderation": "bg-error-surface text-error dark:bg-error-surface dark:text-error",
  "Social": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Reviews": "bg-success-surface text-success dark:bg-success-surface dark:text-success",
  "Messaging": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Seller": "bg-warning-surface text-warning dark:bg-warning-surface dark:text-warning",
  "Orders": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  "Account": "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const ALL_ACTION_IDS = Object.values(ACTION_ID) as ActionId[];

export function ActionPermissionsManager({ initialConfig, onUpdate }: ActionPermissionsManagerProps) {
  const { showToast } = useToast();
  const [config, setConfig] = useState(initialConfig);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const filteredActions = useMemo(() => {
    const q = search.toLowerCase();
    return ALL_ACTION_IDS.filter((id) => {
      if (!q) return true;
      const meta = ACTION_META[id];
      return (
        id.includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[id] ?? "").toLowerCase().includes(q)
      );
    });
  }, [search]);

  const handleToggle = (actionId: ActionId, enabled: boolean) => {
    const prev = config;
    setConfig((c) => ({ ...c, [actionId]: { enabled } }));
    startTransition(async () => {
      try {
        await onUpdate(actionId, enabled);
        showToast(
          `"${ACTION_META[actionId]?.label}" ${enabled ? "enabled" : "disabled"}.`,
          "success",
        );
      } catch {
        setConfig(prev);
        showToast("Failed to update action config. Please try again.", "error");
      }
    });
  };

  const isEnabled = (id: ActionId) => config[id]?.enabled ?? ACTION_META[id]?.defaultEnabled ?? true;

  return (
    <Stack gap="md">
      <Row align="center" gap="3">
        <Input
          placeholder="Search actions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm text-sm"
        />
        <Text className="text-zinc-500 dark:text-zinc-400" size="sm">
          {filteredActions.length} action{filteredActions.length !== 1 ? "s" : ""}
        </Text>
      </Row>

      <Div className={`${__O.hidden} rounded-xl border border-zinc-200 dark:border-slate-700`}>
        <Table className="w-full text-sm">
          <Thead>
            <Tr className="border-b border-zinc-200 bg-zinc-50 dark:border-slate-700 dark:bg-slate-800">
              <Th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Action</Th>
              <Th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Category</Th>
              <Th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Auth</Th>
              <Th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Permission</Th>
              <Th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Enabled</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredActions.map((id, idx) => {
              const meta = ACTION_META[id];
              const enabled = isEnabled(id);
              const category = CATEGORY_LABELS[id] ?? "Other";
              const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Account"];
              return (
                <Tr
                  key={id}
                  className={[
                    idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-zinc-50/50 dark:bg-slate-800/50",
                    !enabled ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <Td className="px-4 py-3">
                    <Div>
                      <Text className="text-zinc-900 dark:text-zinc-100" weight="medium">{meta.label}</Text>
                      <Text className="text-zinc-400 dark:text-zinc-400" size="xs">{id}</Text>
                    </Div>
                  </Td>
                  <Td className="px-4 py-3">
                    <Span size="xs" weight="medium" className={`inline-block rounded-full px-2 py-0.5 ${categoryColor}`}>
                      {category}
                    </Span>
                  </Td>
                  <Td className="px-4 py-3">
                    {meta.requiresAuth ? (
                      <Span className={CLS_CUSTOM_PILL}>
                        Auth required
                      </Span>
                    ) : (
                      <Text size="xs" color="faint">—</Text>
                    )}
                  </Td>
                  <Td className="px-4 py-3">
                    {meta.requiredPermission ? (
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-slate-700 dark:text-zinc-300">
                        {meta.requiredPermission}
                      </code>
                    ) : (
                      <Text size="xs" color="faint">—</Text>
                    )}
                  </Td>
                  <Td className="px-4 py-3 text-right">
                    <Toggle
                      checked={enabled}
                      onChange={(v) => handleToggle(id, v)}
                      aria-label={`Toggle ${meta.label}`}
                    />
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Div>
    </Stack>
  );
}
