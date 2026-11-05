"use client"
import React from "react";
import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Span } from "./Typography";

export interface RowAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  separator?: boolean;
}

export interface RowActionMenuProps {
  actions: RowAction[];
  align?: "left" | "right";
}

const ALIGN_MAP: Record<NonNullable<RowActionMenuProps["align"]>, "start" | "end"> = {
  left: "start",
  right: "end",
};

export function RowActionMenu({
  actions,
  align = "right",
}: RowActionMenuProps) {
  return (
    <RadixDropdownMenu.Root>
      <RadixDropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Row actions"
          className="appkit-row-action-menu appkit-row-action-menu__trigger"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </RadixDropdownMenu.Trigger>
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          className="appkit-row-action-menu__dropdown"
          align={ALIGN_MAP[align]}
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, idx) => (
            <React.Fragment key={`${action.label}-${idx}`}>
              {action.separator && idx > 0 ? (
                <RadixDropdownMenu.Separator className="appkit-row-action-menu__separator" />
              ) : null}
              <RadixDropdownMenu.Item
                disabled={action.disabled}
                onSelect={() => {
                  if (action.disabled) return;
                  action.onClick();
                }}
                className={`appkit-row-action-menu__item ${action.destructive ? "appkit-row-action-menu__item--destructive" : ""}`}
              >
                {action.icon ? (
                  <Span className="appkit-row-action-menu__icon">{action.icon}</Span>
                ) : null}
                {action.label}
              </RadixDropdownMenu.Item>
            </React.Fragment>
          ))}
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}
