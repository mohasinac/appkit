"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X, AlertTriangle, Eye, ArrowLeft } from "lucide-react";
import { Button } from "../../ui/components/Button";
import { classNames } from "../../ui/style.helper";
import { FORM_ACTION_META, FORM_ACTION_ID } from "../products/constants/action-defs";
import { Div, Row, Span, Stack, Text } from "../../ui";

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
  /** Override the Save Draft button label. Defaults to FORM_ACTION_META label. */
  saveLabel?: string;
  /** Override the Publish button label. Defaults to FORM_ACTION_META label. */
  publishLabel?: string;
  /** Override the entire bottom action bar. */
  renderBottomBar?: () => ReactNode;
  /**
   * When provided, a 👁 Preview button appears in the top bar.
   * Clicking it replaces the form body with this read-only render.
   * A draft banner and "← Back to Edit" button are injected automatically.
   */
  previewSlot?: () => ReactNode;
  /**
   * S-STORE-3-D — when true AND previewSlot is provided, desktop renders a
   * 60/40 split with form on the left and live preview on the right.
   * On mobile the preview reverts to a toggleable modal-style view.
   */
  splitPreview?: boolean;
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
  saveLabel = FORM_ACTION_META[FORM_ACTION_ID.SAVE_DRAFT].label,
  publishLabel = FORM_ACTION_META[FORM_ACTION_ID.PUBLISH].label,
  renderBottomBar,
  previewSlot,
  splitPreview: splitPreviewProp,
  children,
}: FormShellProps) {
  // W1-37: auto-enable splitPreview when a previewSlot is provided. Callers
  // can still pass splitPreview={false} explicitly to opt out.
  const splitPreview = splitPreviewProp ?? Boolean(previewSlot);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

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
      <Div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        style={{ zIndex: "calc(var(--appkit-z-modal) - 1)" }}
        aria-hidden="true"
        onClick={attemptClose}
      />

      {/* Panel */}
      <Div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed top-0 bottom-0 left-0 right-0 lg:left-[10%] lg:right-[10%] flex flex-col bg-[var(--appkit-color-surface)] shadow-2xl"
        style={{ zIndex: "var(--appkit-z-modal)" }}
      >
        {/* ── Top bar ─────────────────────────────────────── */}
        <Row gap="sm" className="flex-shrink-0 sticky top-0 z-10 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-5 py-3">
          {previewMode ? (
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              aria-label="Back to edit"
              className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors flex-shrink-0 flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <Span className="hidden sm:inline">Back to Edit</Span>
            </button>
          ) : (
            <button
              type="button"
              onClick={attemptClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <Div className="flex-1 min-w-0">
            {breadcrumb && (
              <Text className="text-xs text-[var(--appkit-color-text-muted)] truncate mb-0.5">{breadcrumb}</Text>
            )}
            <Text className="text-sm font-semibold text-[var(--appkit-color-text)] truncate">
              {previewMode ? `Preview — ${title}` : title}
            </Text>
          </Div>

          <Row gap="xs" className="flex-shrink-0">
            {previewMode ? null : (
              <>
                {previewSlot && (
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[var(--appkit-color-text-muted)] hover:bg-[var(--appkit-color-border-subtle)] transition-colors border border-[var(--appkit-color-border)]"
                  >
                    <Eye className="w-4 h-4" />
                    <Span className="hidden sm:inline">Preview</Span>
                  </button>
                )}
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
              </>
            )}
          </Row>
        </Row>

        {/* ── Body (left nav + scrollable content) ───────── */}
        <Div className="flex flex-1 overflow-hidden">
          {/* Left section nav — desktop only (lg+), hidden in preview mode */}
          {sections && sections.length > 0 && !previewMode && (
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
          {sections && sections.length > 0 && !previewMode && (
            <Row gap="px" className="lg:hidden fixed top-[var(--form-shell-topbar-h,57px)] left-0 right-0 z-10 overflow-x-auto px-5 py-2 bg-[var(--appkit-color-surface)] border-b border-[var(--appkit-color-border)]">
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
            </Row>
          )}

          {/* Scrollable form body / preview pane */}
          <Div
            ref={bodyRef}
            className={classNames(
              "flex-1 overflow-y-auto",
              sections && sections.length > 0 && !previewMode ? "pt-0 lg:pt-0" : "",
            )}
          >
            {previewMode && previewSlot ? (
              <>
                <Row gap="xs" className="sticky top-0 z-10 bg-[var(--appkit-color-warning-surface)] border-b border-[var(--appkit-color-warning)] px-4 py-2 text-sm text-[var(--appkit-color-warning-text,var(--appkit-color-warning))]">
                  <Eye className="w-4 h-4 flex-shrink-0" />
                  <Span>Preview — not visible to buyers until published</Span>
                </Row>
                <Div className="py-4">
                  {previewSlot()}
                </Div>
              </>
            ) : splitPreview && previewSlot ? (
              // S-STORE-3-D — desktop 60/40 split: form left, preview right.
              // Below `lg`, falls back to single-column form (preview-as-modal via existing toggle).
              <Div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-6 lg:px-6 lg:py-6 lg:max-w-[1400px] lg:mx-auto">
                <Div className="max-w-3xl mx-auto px-5 py-6 sm:px-6 lg:max-w-none lg:px-0 lg:py-0">
                  {children}
                </Div>
                <Div className="hidden lg:block sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-6rem)] overflow-y-auto border border-[var(--appkit-color-border)] rounded-lg bg-[var(--appkit-color-surface-raised)] p-4">
                  <Row gap="xs" className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--appkit-color-text-muted)]">
                    <Eye className="w-3.5 h-3.5" />
                    <Span>Live preview</Span>
                  </Row>
                  {previewSlot()}
                </Div>
              </Div>
            ) : (
              <Div className="max-w-3xl mx-auto px-5 py-6 sm:px-6">
                {children}
              </Div>
            )}
          </Div>
        </Div>

        {/* ── Bottom bar — hidden in preview mode ─────────── */}
        {!previewMode && renderBottomBar ? (
          renderBottomBar()
        ) : !previewMode && (onSaveDraft || onPublish) ? (
          <Row justify="between" className="flex-shrink-0 sticky bottom-0 z-10 border-t border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] px-5 py-3">
            <Button variant="ghost" size="sm" onClick={attemptClose} disabled={isLoading}>
              {FORM_ACTION_META[FORM_ACTION_ID.DISCARD].label}
            </Button>
            <Row gap="xs">
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
            </Row>
          </Row>
        ) : null}
      </Div>

      {/* Unsaved changes dialog */}
      {showUnsaved && (
        <>
          <Div
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: "calc(var(--appkit-z-modal) + 5)" }}
            onClick={() => setShowUnsaved(false)}
          />
          <Div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-[var(--appkit-color-surface)] rounded-xl shadow-2xl p-6"
            style={{ zIndex: "calc(var(--appkit-z-modal) + 5)" }}
          >
            <Row gap="sm" align="start" className="mb-4">
              <Span className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--appkit-color-warning-surface)] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--appkit-color-warning)]" />
              </Span>
              <Stack gap="xs">
                <Text className="font-semibold text-[var(--appkit-color-text)]">Unsaved changes</Text>
                <Text className="text-sm text-[var(--appkit-color-text-muted)]">
                  You have unsaved changes. Leave without saving?
                </Text>
              </Stack>
            </Row>
            <Row gap="xs" justify="end">
              <Button variant="outline" size="sm" onClick={() => setShowUnsaved(false)}>Stay</Button>
              <Button variant="danger" size="sm" onClick={() => { setShowUnsaved(false); onClose(); }}>Leave</Button>
            </Row>
          </Div>
        </>
      )}
    </>
  );
}
