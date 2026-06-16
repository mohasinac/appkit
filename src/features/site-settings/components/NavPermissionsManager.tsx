"use client";
import React, { useState, useTransition } from "react";
import { Code, Div, Input, Stack, Table, Tbody, Td, Text, Th, Thead, Toggle, Tr } from "../../../ui";
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
          <Text className="mb-3 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
            {group.groupLabel}
          </Text>
          <Div className={`${__O.hidden}`} rounded="xl" border="default">
            <Table className="w-full text-sm">
              <Thead>
                <Tr className="bg-zinc-50 dark:bg-slate-800" border="default">
                  <Th className="text-left" padding="md" color="primary" weight="semibold">Nav Item</Th>
                  <Th className="text-left" padding="md" color="primary" weight="semibold">Route</Th>
                  <Th className="text-left" padding="md" color="primary" weight="semibold">Permission</Th>
                  <Th className="text-right" padding="md" color="primary" weight="semibold">Enabled</Th>
                </Tr>
              </Thead>
              <Tbody>
                {group.items.map((item, idx) => {
                  const hasId = !!item.id;
                  const enabled = hasId ? isEnabled(item.id!) : true;
                  return (
                    <Tr
                      key={item.href}
                      className={[
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-zinc-50/50 dark:bg-slate-800/50",
                        !enabled ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <Td padding="md">
                        <Div>
                          <Text weight="medium" color="primary">{item.label}</Text>
                          {item.id && (
                            <Text size="xs" color="faint">{item.id}</Text>
                          )}
                        </Div>
                      </Td>
                      <Td padding="md">
                        <Code className="text-zinc-500 dark:text-zinc-400" size="xs">{item.href}</Code>
                      </Td>
                      <Td padding="md">
                        {item.requiredPermission ? (
                          <Code className="bg-zinc-100 px-1.5 py-0.5 text-zinc-700 dark:bg-slate-700 dark:text-zinc-300" size="xs" rounded="default">
                            {item.requiredPermission}
                          </Code>
                        ) : (
                          <Text size="xs" color="faint">—</Text>
                        )}
                      </Td>
                      <Td className="text-right" padding="md">
                        {hasId ? (
                          <Toggle
                            checked={enabled}
                            onChange={(v) => handleToggle(item.id!, item.label, v)}
                            aria-label={`Toggle ${item.label}`}
                          />
                        ) : (
                          <Text className="italic" size="xs" color="faint">Legacy — always visible</Text>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Div>
        </Div>
      ))}
    </Stack>
  );
}
