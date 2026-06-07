"use client";
import React, { useState, useTransition, useMemo } from "react";
import { Toggle, Badge, Text, Div, Stack, Row, Input } from "../../../ui";
import { ACTION_META, ACTION_ID } from "../../products/constants/action-defs";
import type { ActionId } from "../../products/constants/action-defs";
import { useToast } from "../../../ui";

const __O = {
  hidden: "overflow-hidden",
} as const;

const CLS_CUSTOM_PILL = "inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

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
  "Public CTA": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Auction CTA": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Pre-order CTA": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Checkout": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Prize Draw": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Raffle": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Moderation": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Social": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Reviews": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Messaging": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Seller": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
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
      <Div className="flex items-center gap-3">
        <Input
          placeholder="Search actions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-sm text-sm"
        />
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          {filteredActions.length} action{filteredActions.length !== 1 ? "s" : ""}
        </Text>
      </Div>

      <Div className={`${__O.hidden} rounded-xl border border-zinc-200 dark:border-slate-700`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-slate-700 dark:bg-slate-800">
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Action</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Auth</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Permission</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {filteredActions.map((id, idx) => {
              const meta = ACTION_META[id];
              const enabled = isEnabled(id);
              const category = CATEGORY_LABELS[id] ?? "Other";
              const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS["Account"];
              return (
                <tr
                  key={id}
                  className={[
                    idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-zinc-50/50 dark:bg-slate-800/50",
                    !enabled ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <td className="px-4 py-3">
                    <Div>
                      <Text className="font-medium text-zinc-900 dark:text-zinc-100">{meta.label}</Text>
                      <Text className="text-xs text-zinc-400 dark:text-zinc-400">{id}</Text>
                    </Div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor}`}>
                      {category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {meta.requiresAuth ? (
                      <span className={CLS_CUSTOM_PILL}>
                        Auth required
                      </span>
                    ) : (
                      <Text className="text-xs text-zinc-400">—</Text>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {meta.requiredPermission ? (
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-slate-700 dark:text-zinc-300">
                        {meta.requiredPermission}
                      </code>
                    ) : (
                      <Text className="text-xs text-zinc-400">—</Text>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Toggle
                      checked={enabled}
                      onChange={(v) => handleToggle(id, v)}
                      aria-label={`Toggle ${meta.label}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Div>
    </Stack>
  );
}
