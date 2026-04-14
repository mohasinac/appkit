"use client";

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
  const alignClass = align === "right" ? "right-0" : "left-0";

  useClickOutside(ref, () => setOpen(false), { enabled: open });
  useKeyPress("Escape", () => setOpen(false), { enabled: open });

  return (
    <div
      ref={ref}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </Button>

      {open ? (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-[160px] rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 ${alignClass}`}
        >
          {actions.map((action, idx) => (
            <div key={`${action.label}-${idx}`}>
              {action.separator && idx > 0 ? (
                <div className="my-1 h-px bg-zinc-200 dark:bg-slate-700" />
              ) : null}
              <Button
                type="button"
                role="menuitem"
                variant="ghost"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm",
                  action.destructive
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                {action.icon ? (
                  <Span className="h-4 w-4 shrink-0">{action.icon}</Span>
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
