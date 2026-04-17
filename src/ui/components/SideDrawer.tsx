"use client";
import "client-only";

import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Heading, Button, Span } from "../index";
import { useSwipe } from "../../react";

export type DrawerMode = "create" | "edit" | "delete" | "view";

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Drawer mode controls header styling and unsaved-changes behaviour */
  mode?: DrawerMode;
  /** Whether the form has unsaved changes — triggers a warning on close */
  isDirty?: boolean;
  /** Which side the drawer opens from. Defaults to "right". */
  side?: "left" | "right";
}

/** Selector for all keyboard-focusable elements */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null): Element[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

/**
 * SideDrawer — accessible slide-in panel with focus trap, swipe-to-close,
 * and an optional unsaved-changes confirmation overlay.
 *
 * @example
 * ```tsx
 * <SideDrawer isOpen={open} onClose={() => setOpen(false)} title="Edit product" mode="edit" isDirty={isDirty}>
 *   <MyForm />
 * </SideDrawer>
 * ```
 */
export function SideDrawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  mode = "view",
  isDirty = false,
  side = "right",
}: SideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const tActions = useTranslations("actions");
  const tConfirm = useTranslations("confirm");
  const triggerRef = useRef<Element | null>(null);

  const attemptClose = useCallback(() => {
    if (isDirty && (mode === "create" || mode === "edit")) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [isDirty, mode, onClose]);

  const confirmClose = useCallback(() => {
    setShowUnsavedWarning(false);
    onClose();
  }, [onClose]);

  const cancelClose = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        attemptClose();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusable = getFocusableElements(drawerRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, attemptClose]);

  // Save / restore focus (WCAG 2.4.3)
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(drawerRef.current);
        if (focusable.length > 0) (focusable[0] as HTMLElement).focus();
      });
    } else {
      if (triggerRef.current && "focus" in triggerRef.current) {
        (triggerRef.current as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  useSwipe(drawerRef, {
    ...(side === "left"
      ? { onSwipeLeft: () => attemptClose() }
      : { onSwipeRight: () => attemptClose() }),
    minSwipeDistance: 60,
  });

  if (!isOpen) return null;

  const positionClass =
    side === "left"
      ? "left-0 w-full sm:w-96 md:w-[420px]"
      : "right-0 w-full md:min-w-[50%]";

  const modeHeaderClass: Record<DrawerMode, string> = {
    delete: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    create:
      "bg-gradient-to-r from-primary/5 via-transparent to-teal-50/30 dark:from-primary/10 dark:via-transparent dark:to-teal-950/10 border-zinc-200 dark:border-slate-700",
    edit: "bg-gradient-to-r from-amber-50/40 via-transparent to-primary/5 dark:from-amber-950/15 dark:via-transparent dark:to-primary/10 border-zinc-200 dark:border-slate-700",
    view: "bg-zinc-50 dark:bg-slate-900/80 border-zinc-200 dark:border-slate-700",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={attemptClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed ${positionClass} top-0 bottom-0 z-50 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 ${modeHeaderClass[mode]} border-b`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              onClick={attemptClose}
              className="flex-shrink-0 p-2 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors ring-1 ring-zinc-200 dark:ring-slate-700 hover:ring-zinc-300 dark:hover:ring-slate-600"
              aria-label={tActions("close")}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
            <Heading level={3} id="drawer-title" className="truncate">
              {title}
            </Heading>
          </div>
          {mode === "delete" && (
            <Span className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
              {tActions("delete")}
            </Span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-zinc-200 dark:border-slate-700 bg-zinc-50 dark:bg-slate-900/80 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>

      {/* Unsaved changes warning overlay */}
      {showUnsavedWarning && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={cancelClose}
          />
          <div className="fixed z-[60] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <Heading level={4} className="mb-1">
                  {tConfirm("unsavedChangesTitle")}
                </Heading>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {tConfirm("unsavedChangesDescription")}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={cancelClose} size="sm">
                {tActions("keepEditing")}
              </Button>
              <Button variant="danger" onClick={confirmClose} size="sm">
                {tActions("discardChanges")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
