"use client";
import { normalizeError } from "../../../errors/normalize";
import React, { useState, useTransition } from "react";
import { Code, Table, Tbody, Td, Th, Thead, Tr } from "../../../ui/components/Semantic";
import { Div } from "../../../ui/components/Div";
import { Stack } from "../../../ui/components/Layout";
import { Text } from "../../../ui/components/Typography";
import { Toggle } from "../../../ui/components/Toggle";
import { Button } from "../../../ui/components/Button";
import { useToast } from "../../../ui/components/toast-context";
import { sortByFieldOrder } from "../../shell/field-ui-meta";

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
  initialConfig: Record<string, { enabled: boolean; order?: number }>;
  navGroups: NavGroup[];
  onUpdate: (navId: string, enabled: boolean) => Promise<void>;
  /**
   * Bulk-writes a whole group's reordered id list. Omit to leave that
   * group's items at their original order with no reorder UI — matching
   * every other 3B-1b subsystem's "unconfigured = today's behaviour" rule.
   */
  onReorder?: (orderedIds: string[]) => Promise<void>;
}

export function NavPermissionsManager({
  initialConfig,
  navGroups,
  onUpdate,
  onReorder,
}: NavPermissionsManagerProps) {
  const { showToast } = useToast();
  const [config, setConfig] = useState(initialConfig);
  const [, startTransition] = useTransition();

  const handleToggle = (navId: string, label: string, enabled: boolean) => {
    const prev = config;
    setConfig((c) => ({ ...c, [navId]: { enabled, order: c[navId]?.order } }));
    startTransition(async () => {
      try {
        await onUpdate(navId, enabled);
        showToast(`"${label}" ${enabled ? "enabled" : "disabled"}.`, "success");
      } catch (_err) {
        void normalizeError(_err);
        setConfig(prev);
        showToast("Failed to update nav config. Please try again.", "error");
      }
    });
  };

  const isEnabled = (id: string) => config[id]?.enabled ?? true;

  const orderedItems = (items: NavItem[]): NavItem[] => {
    const fieldOrder = Object.entries(config)
      .filter((entry): entry is [string, { enabled: boolean; order: number }] => typeof entry[1].order === "number")
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id]) => id);
    return fieldOrder.length > 0 ? sortByFieldOrder(items, fieldOrder, (item) => item.id ?? "") : items;
  };

  const handleMove = (group: NavGroup, navId: string, direction: -1 | 1) => {
    const sorted = orderedItems(group.items).filter((i) => i.id);
    const idx = sorted.findIndex((i) => i.id === navId);
    const swapWith = idx + direction;
    if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
    const orderedIds = reordered.map((i) => i.id!);

    const prev = config;
    setConfig((c) => {
      const next = { ...c };
      orderedIds.forEach((id, index) => {
        next[id] = { enabled: next[id]?.enabled ?? true, order: index };
      });
      return next;
    });
    startTransition(async () => {
      try {
        await onReorder?.(orderedIds);
      } catch (_err) {
        void normalizeError(_err);
        setConfig(prev);
        showToast("Failed to reorder navigation. Please try again.", "error");
      }
    });
  };

  return (
    <Stack gap="lg">
      {navGroups.map((group) => (
        <Div key={group.groupLabel}>
          <Text className="mb-3 tracking-wide" color="muted" size="xs" weight="semibold" transform="uppercase">
            {group.groupLabel}
          </Text>
          <Div className={`${__O.hidden}`} rounded="xl" border="default">
            <Table size="sm">
              <Thead>
                <Tr surface="subtle" border="default">
                  {onReorder && <Th className="text-left" padding="md" color="primary" weight="semibold">Order</Th>}
                  <Th className="text-left" padding="md" color="primary" weight="semibold">Nav Item</Th>
                  <Th className="text-left" padding="md" color="primary" weight="semibold">Route</Th>
                  <Th className="text-left" padding="md" color="primary" weight="semibold">Permission</Th>
                  <Th className="text-right" padding="md" color="primary" weight="semibold">Enabled</Th>
                </Tr>
              </Thead>
              <Tbody>
                {orderedItems(group.items).map((item, idx, sorted) => {
                  const hasId = !!item.id;
                  const enabled = hasId ? isEnabled(item.id!) : true;
                  return (
                    <Tr
                      key={item.href}
                      className={[
                        idx % 2 === 0 ? "bg-[var(--appkit-color-surface)]" : "bg-zinc-50/50 bg-[var(--appkit-color-surface-elevated)]/50",
                        !enabled ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      {onReorder && (
                        <Td padding="md">
                          {hasId ? (
                            <Stack className="gap-[0.125rem]">
                              <Button
                                variant="ghost" type="button"
                                onClick={() => handleMove(group, item.id!, -1)}
                                disabled={idx === 0}
                                className="text-zinc-400 hover:text-[var(--appkit-color-text)] disabled:opacity-30 leading-none text-[length:var(--appkit-text-xs)] p-[var(--appkit-space-0)] min-h-0 h-auto rounded-none"
                                aria-label={`Move ${item.label} up`}
                              >▲</Button>
                              <Button
                                variant="ghost" type="button"
                                onClick={() => handleMove(group, item.id!, 1)}
                                disabled={idx >= sorted.length - 1}
                                className="text-zinc-400 hover:text-[var(--appkit-color-text)] disabled:opacity-30 leading-none text-[length:var(--appkit-text-xs)] p-[var(--appkit-space-0)] min-h-0 h-auto rounded-none"
                                aria-label={`Move ${item.label} down`}
                              >▼</Button>
                            </Stack>
                          ) : (
                            <Text size="xs" color="faint">—</Text>
                          )}
                        </Td>
                      )}
                      <Td padding="md">
                        <Div>
                          <Text weight="medium" color="primary">{item.label}</Text>
                          {item.id && (
                            <Text size="xs" color="faint">{item.id}</Text>
                          )}
                        </Div>
                      </Td>
                      <Td padding="md">
                        <Code color="muted" size="xs">{item.href}</Code>
                      </Td>
                      <Td padding="md">
                        {item.requiredPermission ? (
                          <Code className="bg-[var(--appkit-color-surface-elevated)] text-[var(--appkit-color-text)]" padding="sm" size="xs" rounded="default">
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
