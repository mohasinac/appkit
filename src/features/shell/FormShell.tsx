"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "../../ui/components/Button";
import { classNames } from "../../ui/style.helper";

export interface FormShellSection {
  id: string;
  label: string;
}

export interface FormShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  breadcrumb?: string;
  isDirty?: boolean;
  isLoading?: boolean;
  /** Left-nav anchor sections (section mode). Omit when using StepForm inside. */
  sections?: FormShellSection[];
  onSaveDraft?: () => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  saveLabel?: string;
  publishLabel?: string;
  /** Override the entire bottom action bar. */
  renderBottomBar?: () => ReactNode;
  children: ReactNode;
}

export interface UseFormShellResult {
  isDirty: boolean;
  markDirty: () => void;
  markClean: () => void;
}

export function useFormShell(): UseFormShellResult {
  const [isDirty, setIsDirty] = useState(false);
  return {
    isDirty,
    markDirty: useCallback(() => setIsDirty(true), []),
    markClean: useCallback(() => setIsDirty(false), []),
  };
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function FormShell({
  isOpen,
  onClose,
  title,
  breadcrumb,
  isDirty = false,
  isLoading = false,
  sections,
  onSaveDraft,
  onPublish,
  saveLabel = "Save Draft",
  publishLabel = "Publish",
  renderBottomBar,
  children,
}: FormShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const attemptClose = useCallback(() => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  // Keyboard: Esc → attempt close; Tab → trap focus inside panel
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!els.length) { e.preventDefault(); return; }
        if (e.shiftKey) {
          if (document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
        } else {
          if (document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isOpen, attemptClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const scrollToSection = (id: string) => {
    const el = bodyRef.current?.querySelector<HTMLElement>(`#${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    setSavingDraft(true);
    try { await onSaveDraft(); } finally { setSavingDraft(false); }
  };

  const handlePublish = async () => {
    if (!onPublish) return;
    setPublishing(true);
    try { await onPublish(); } finally { setPublishing(false); }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        style={{ zIndex: "calc(var(--appkit-z-modal) - 1)" }}
        aria-hidden="true"
        onClick={attemptClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 flex flex-col bg-[var(--appkit-color-surface)] shadow-2xl"
        style={{ zIndex: "var(--appkit-z-modal)" }}
      >
        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="flex-shrink-0 sticky top-0 z-10 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            {breadcrumb && (
              <p className="text-xs text-[var(--appkit-color-text-muted)] truncate mb-0.5">{breadcrumb}</p>
            )}
            <p className="text-sm font-semibold text-[var(--appkit-color-text)] truncate">{title}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onSaveDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isLoading || savingDraft || publishing}
                isLoading={savingDraft}
              >
                {saveLabel}
              </Button>
            )}
            {onPublish && (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                disabled={isLoading || savingDraft || publishing}
                isLoading={publishing}
              >
                {publishLabel}
              </Button>
            )}
          </div>
        </div>

        {/* ── Body (left nav + scrollable content) ───────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left section nav — desktop only (lg+) */}
          {sections && sections.length > 0 && (
            <nav
              aria-label="Form sections"
              className="hidden lg:flex flex-col flex-shrink-0 w-48 border-r border-[var(--appkit-color-border)] py-4 px-3 gap-1 overflow-y-auto"
            >
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className="text-left text-sm px-3 py-2 rounded-lg text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors"
                >
                  {sec.label}
                </button>
              ))}
            </nav>
          )}

          {/* Mobile horizontal section strip */}
          {sections && sections.length > 0 && (
            <div className="lg:hidden fixed top-[var(--form-shell-topbar-h,57px)] left-0 right-0 z-10 flex overflow-x-auto gap-1 px-4 py-2 bg-[var(--appkit-color-surface)] border-b border-[var(--appkit-color-border)]">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-[var(--appkit-color-border)] text-[var(--appkit-color-text-muted)] hover:border-[var(--appkit-color-primary)] hover:text-[var(--appkit-color-primary)] transition-colors whitespace-nowrap"
                >
                  {sec.label}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable form body */}
          <div
            ref={bodyRef}
            className={classNames(
              "flex-1 overflow-y-auto",
              sections && sections.length > 0 ? "pt-0 lg:pt-0" : "",
            )}
          >
            <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
              {children}
            </div>
          </div>
        </div>

        {/* ── Bottom bar ──────────────────────────────────── */}
        {renderBottomBar ? (
          renderBottomBar()
        ) : (onSaveDraft || onPublish) ? (
          <div className="flex-shrink-0 sticky bottom-0 z-10 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={attemptClose} disabled={isLoading}>
              Discard
            </Button>
            <div className="flex items-center gap-2">
              {onSaveDraft && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={isLoading || savingDraft || publishing}
                  isLoading={savingDraft}
                >
                  {saveLabel}
                </Button>
              )}
              {onPublish && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={isLoading || savingDraft || publishing}
                  isLoading={publishing}
                >
                  {publishLabel} →
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Unsaved changes dialog */}
      {showUnsaved && (
        <>
          <div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: "calc(var(--appkit-z-modal) + 5)" }}
            onClick={() => setShowUnsaved(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-[var(--appkit-color-surface)] rounded-xl shadow-2xl p-6"
            style={{ zIndex: "calc(var(--appkit-z-modal) + 5)" }}
          >
            <div className="flex gap-3 mb-4">
              <span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--appkit-color-warning-surface)] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--appkit-color-warning)]" />
              </span>
              <div>
                <p className="font-semibold text-[var(--appkit-color-text)]">Unsaved changes</p>
                <p className="text-sm text-[var(--appkit-color-text-muted)] mt-1">
                  You have unsaved changes. Leave without saving?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowUnsaved(false)}>Stay</Button>
              <Button variant="danger" size="sm" onClick={() => { setShowUnsaved(false); onClose(); }}>Leave</Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
