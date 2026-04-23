"use client"
import React, { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Span } from "./Typography";
import { useClickOutside, useKeyPress } from "../../react";

export interface RowAction {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
  separator?: boolean;
}

export interface RowActionMenuProps {
  actions: RowAction[];
  align?: "left" | "right";
}

export function RowActionMenu({
  actions,
  align = "right",
}: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), { enabled: open });
  useKeyPress("Escape", () => setOpen(false), { enabled: open });

  return (
    <div
      ref={ref}
      className="appkit-row-action-menu"
      onClick={(e) = data-section="rowactionmenu-div-584"> e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="appkit-row-action-menu__trigger"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </Button>

      {open ? (
        <div
          role="menu"
          className={`appkit-row-action-menu__dropdown ${align === "right" ? "appkit-row-action-menu__dropdown--right" : "appkit-row-action-menu__dropdown--left"}`}
         data-section="rowactionmenu-div-585">
          {actions.map((action, idx) => (
            <div key={`${action.label}-${idx}`} data-section="rowactionmenu-div-586">
              {action.separator && idx > 0 ? (
                <div className="appkit-row-action-menu__separator" />
              ) : null}
              <Button
                type="button"
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={`appkit-row-action-menu__item ${action.destructive ? "appkit-row-action-menu__item--destructive" : ""}`}
              >
                {action.icon ? (
                  <Span className="appkit-row-action-menu__icon">
                    {action.icon}
                  </Span>
                ) : null}
                {action.label}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
