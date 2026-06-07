"use client";
import React, { useState, useTransition } from "react";
import { Toggle, Text, Div, Stack, Input } from "../../../ui";
import { useToast } from "../../../ui";

const __O = {
  hidden: "overflow-hidden",
} as const;

export interface NavItem {
  id?: string;
  label: string;
  href: string;
  requiredPermission?: string;
}

export interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

export interface NavPermissionsManagerProps {
  initialConfig: Record<string, { enabled: boolean }>;
  navGroups: NavGroup[];
  onUpdate: (navId: string, enabled: boolean) => Promise<void>;
}

export function NavPermissionsManager({
  initialConfig,
  navGroups,
  onUpdate,
}: NavPermissionsManagerProps) {
  const { showToast } = useToast();
  const [config, setConfig] = useState(initialConfig);
  const [, startTransition] = useTransition();

  const handleToggle = (navId: string, label: string, enabled: boolean) => {
    const prev = config;
    setConfig((c) => ({ ...c, [navId]: { enabled } }));
    startTransition(async () => {
      try {
        await onUpdate(navId, enabled);
        showToast(`"${label}" ${enabled ? "enabled" : "disabled"}.`, "success");
      } catch {
        setConfig(prev);
        showToast("Failed to update nav config. Please try again.", "error");
      }
    });
  };

  const isEnabled = (id: string) => config[id]?.enabled ?? true;

  return (
    <Stack gap="lg">
      {navGroups.map((group) => (
        <Div key={group.groupLabel}>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {group.groupLabel}
          </Text>
          <Div className={`${__O.hidden} rounded-xl border border-zinc-200 dark:border-slate-700`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Nav Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Route</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">Permission</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, idx) => {
                  const hasId = !!item.id;
                  const enabled = hasId ? isEnabled(item.id!) : true;
                  return (
                    <tr
                      key={item.href}
                      className={[
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-zinc-50/50 dark:bg-slate-800/50",
                        !enabled ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <Div>
                          <Text className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</Text>
                          {item.id && (
                            <Text className="text-xs text-zinc-400 dark:text-zinc-400">{item.id}</Text>
                          )}
                        </Div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-zinc-500 dark:text-zinc-400">{item.href}</code>
                      </td>
                      <td className="px-4 py-3">
                        {item.requiredPermission ? (
                          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700 dark:bg-slate-700 dark:text-zinc-300">
                            {item.requiredPermission}
                          </code>
                        ) : (
                          <Text className="text-xs text-zinc-400">—</Text>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasId ? (
                          <Toggle
                            checked={enabled}
                            onChange={(v) => handleToggle(item.id!, item.label, v)}
                            aria-label={`Toggle ${item.label}`}
                          />
                        ) : (
                          <Text className="text-xs text-zinc-400 italic">Legacy — always visible</Text>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Div>
        </Div>
      ))}
    </Stack>
  );
}
