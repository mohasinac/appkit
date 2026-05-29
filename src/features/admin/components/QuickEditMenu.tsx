"use client";
import React, { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../../../ui/components/Button";
import { Div } from "../../../ui";
import { useClickOutside, useKeyPress } from "../../../react";
import { QuickFormDrawer } from "../../shell/QuickFormDrawer";
import type { QuickFieldDef } from "../../shell/QuickFormDrawer";

export interface QuickEditAction {
  label: string;
  icon?: React.ReactNode;
  separator?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  // Form quick-edit — if fields provided, clicking opens a QuickFormDrawer
  formTitle?: string;
  fields?: QuickFieldDef[];
  defaultValues?: Record<string, unknown>;
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  // Plain action — used when no fields provided
  onClick?: () => void;
}

export interface QuickEditMenuProps {
  actions: QuickEditAction[];
  align?: "left" | "right";
}

export function QuickEditMenu({ actions, align = "right" }: QuickEditMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFormIndex, setActiveFormIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(false), { enabled: menuOpen });
  useKeyPress("Escape", () => setMenuOpen(false), { enabled: menuOpen });

  const handleActionClick = (idx: number) => {
    const action = actions[idx];
    if (action.disabled) return;
    setMenuOpen(false);
    if (action.fields && action.fields.length > 0) {
      setActiveFormIndex(idx);
    } else {
      action.onClick?.();
    }
  };

  const activeAction = activeFormIndex !== null ? actions[activeFormIndex] : null;

  return (
    <>
      <div
        ref={menuRef}
        className="appkit-row-action-menu"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          aria-label="Row actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="appkit-row-action-menu__trigger"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
        </Button>

        {menuOpen && (
          <div
            role="menu"
            className={`appkit-row-action-menu__dropdown ${align === "right" ? "appkit-row-action-menu__dropdown--right" : "appkit-row-action-menu__dropdown--left"}`}
          >
            {actions.map((action, idx) => (
              <Div key={`${action.label}-${idx}`}>
                {action.separator && idx > 0 && (
                  <Div className="appkit-row-action-menu__separator" />
                )}
                <Button
                  type="button"
                  role="menuitem"
                  variant="ghost"
                  disabled={action.disabled}
                  onClick={() => handleActionClick(idx)}
                  className={`appkit-row-action-menu__item ${action.destructive ? "appkit-row-action-menu__item--destructive" : ""} ${action.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {action.icon && (
                    <span className="appkit-row-action-menu__icon">{action.icon}</span>
                  )}
                  {action.label}
                </Button>
              </Div>
            ))}
          </div>
        )}
      </div>

      {activeAction?.fields && (
        <QuickFormDrawer
          isOpen={activeFormIndex !== null}
          onClose={() => setActiveFormIndex(null)}
          title={activeAction.formTitle ?? activeAction.label}
          fields={activeAction.fields}
          defaultValues={activeAction.defaultValues}
          onSubmit={async (vals) => {
            await activeAction.onSubmit?.(vals);
            setActiveFormIndex(null);
          }}
          submitLabel={activeAction.submitLabel ?? "Save"}
        />
      )}
    </>
  );
}
