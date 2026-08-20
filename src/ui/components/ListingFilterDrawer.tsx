"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { Span } from "./Typography";
import { sectionBackgroundStyle, type SectionBackgroundConfig } from "./Semantic";
import { useHandMode } from "../../_internal/client/hand-mode";

const CLS_CLEAR_BTN = "text-xs text-[var(--appkit-color-text-muted)] hover:text-error text-[var(--appkit-color-text-muted)] transition-colors min-h-0 h-auto p-0";

export interface ListingFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  activeCount: number;
  children: React.ReactNode;
  /** Optional color/gradient/image background for the drawer panel — same shape as <Section background={…}>. */
  background?: SectionBackgroundConfig;
}

export function ListingFilterDrawer({
  open,
  onClose,
  onApply,
  onClear,
  activeCount,
  children,
  background,
}: ListingFilterDrawerProps) {
  const { hand } = useHandMode();
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={onClose} />
      <div className={`fixed inset-y-0 ${hand === "left" ? "left-0" : "right-0"} z-50 flex w-80 flex-col bg-[var(--appkit-color-surface)] shadow-2xl${background?.value ? " relative overflow-hidden" : ""}`}>
        {background?.value && (
          <>
            <Span aria-hidden className="absolute inset-0 -z-10" style={sectionBackgroundStyle(background)} />
            {background.overlay?.enabled && (
              <Span
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{ backgroundColor: background.overlay.color, opacity: background.overlay.opacity }}
              />
            )}
          </>
        )}
        <div className={`flex items-center justify-between border-b border-[var(--appkit-color-border)] px-4 py-3.5${hand === "left" ? " flex-row-reverse" : ""}`}>
          <Span size="base" weight="semibold" className="text-[var(--appkit-color-text)]">Filters</Span>
          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <Button variant="ghost" type="button" onClick={onClear} className={CLS_CLEAR_BTN}>
                Clear all
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-surface-elevated)] transition-colors min-h-0 h-auto">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {children}
        </div>
        <div className="border-t border-[var(--appkit-color-border)] px-4 py-3.5">
          <Button type="button" onClick={onApply} className="w-full">
            Apply Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </div>
    </>
  );
}
