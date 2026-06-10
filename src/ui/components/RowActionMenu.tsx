"use client"
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Span } from "./Typography";
import { useKeyPress } from "../../react";

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

interface DropdownPos { top: number; left?: number; right?: number; }

export function RowActionMenu({
  actions,
  align = "right",
}: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useKeyPress("Escape", () => setOpen(false), { enabled: open });

  // Close on outside click — exclude both trigger wrapper and portal dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapperRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = useCallback(() => {
    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const top = rect.bottom + 4;
      setPos(
        align === "right"
          ? { top, right: window.innerWidth - rect.right }
          : { top, left: rect.left },
      );
    }
    setOpen((v) => !v);
  }, [open, align]);

  const dropdown =
    open && pos && mounted
      ? createPortal(
          <div
            ref={dropdownRef}
            role="menu"
            className="appkit-row-action-menu__dropdown"
            // audit-inline-style-ok: dynamic CSS
            style={{
              position: "fixed",
              zIndex: "var(--appkit-z-modal)",
              top: pos.top,
              ...(pos.right !== undefined ? { right: pos.right } : { left: pos.left }),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action, idx) => (
              <div key={`${action.label}-${idx}`}>
                {action.separator && idx > 0 ? (
                  <div className="appkit-row-action-menu__separator" />
                ) : null}
                <Button
                  type="button"
                  role="menuitem"
                  variant="ghost"
                  disabled={action.disabled}
                  onClick={() => {
                    if (action.disabled) return;
                    action.onClick();
                    setOpen(false);
                  }}
                  className={`appkit-row-action-menu__item ${action.destructive ? "appkit-row-action-menu__item--destructive" : ""} ${action.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {action.icon ? (
                    <Span className="appkit-row-action-menu__icon">{action.icon}</Span>
                  ) : null}
                  {action.label}
                </Button>
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={wrapperRef}
      className="appkit-row-action-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggle}
        className="appkit-row-action-menu__trigger"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
      </Button>
      {dropdown}
    </div>
  );
}
