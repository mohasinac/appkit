"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { parseChartAttr, CHART_KINDS } from "./chart-spec";
import { chartFigureHtml } from "../rich-text/chart-blocks";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
  placeholder?: string;
  /**
   * The `id` of the element labelling this editor.
   *
   * 🛑 `aria-labelledby`, NOT `htmlFor` ON THE LABEL — and that is a hard
   * constraint rather than a preference. `htmlFor` only associates with a
   * LABELABLE element (`input`, `select`, `textarea`, `button`, `output`,
   * `meter`, `progress`), and this editor is a `contenteditable` div, which is
   * none of them. A `<Label htmlFor>` pointing here associates with nothing:
   * the label is visibly present, the editor has no accessible name, and an
   * accessibility pass reports an unlabelled field while a human sees a
   * perfectly labelled one.
   *
   * This prop did not exist, so EVERY rich-text field in the app was
   * unlabelled — `CategoryForm` rendered a bare `<Label>` with no `htmlFor` at
   * all, which is the honest version of the same gap.
   */
  ariaLabelledBy?: string;
  /** Use when there is no visible label to point at. */
  ariaLabel?: string;
}

/**
 * What the Chart button drops into the editor to be edited.
 *
 * A filled, working example rather than an empty skeleton: an author editing
 * real numbers into a chart that already renders can see what each field does,
 * where one facing `{"kind":"","categories":[],"series":[]}` has to guess the
 * shape before anything appears at all.
 */
const STARTER_CHART = JSON.stringify(
  {
    kind: "groupedBar",
    title: "Untitled chart",
    categories: ["First", "Second", "Third"],
    series: [
      { label: "Series A", values: [3, 5, 4] },
      { label: "Series B", values: [4, 2, 6] },
    ],
    unit: "",
    caption: "",
  },
  null,
  2,
);

/** The chart JSON editor shown under the toolbar, with live validation. */
function ChartDraftPanel({
  draft,
  onDraftChange,
  onInsert,
  onCancel,
}: {
  draft: string;
  onDraftChange: (v: string) => void;
  onInsert: () => void;
  onCancel: () => void;
}) {
  const result = useMemo(() => parseChartAttr(draft), [draft]);
  const errorId = "appkit-chart-draft-error";

  return (
    <div className="appkit-rich-text-editor__chart border-b p-2 border-[var(--appkit-color-border)]">
      <label
        className="mb-1 block text-xs font-medium text-[var(--appkit-color-text-muted)]"
        htmlFor="appkit-chart-draft"
      >
        Chart data — kinds: {CHART_KINDS.join(", ")}. Each series needs one
        value per category.
      </label>
      <textarea
        id="appkit-chart-draft"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={12}
        spellCheck={false}
        aria-invalid={!result.ok}
        aria-describedby={result.ok ? undefined : errorId}
        className="w-full rounded border p-2 font-mono text-xs border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-input)] text-[var(--appkit-color-text)]"
      />
      {/*
        The reason comes straight from the shared validator, so the author is
        told which rule they broke ("Series X has 2 values but there are 3
        categories") instead of a generic "invalid".
      */}
      {result.ok ? null : (
        <p id={errorId} role="alert" className="mt-1 text-xs text-[var(--appkit-color-error)]">
          {result.reason}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onInsert}
          disabled={!result.ok}
          className="rounded px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--appkit-color-primary)] text-[var(--appkit-color-text-on-primary)]"
        >
          Insert chart
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs font-medium transition hover:bg-surface-hover text-[var(--appkit-color-text-muted)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

type ToolbarAction = {
  label: string;
  title: string;
  run: () => void;
};

// Matches exactly what this editor's own toolbar (bold/italic/underline/
// lists/link/clear-formatting) and typing can legitimately produce.
// Anything else — <script>, <img onerror=...>, <iframe>, <svg>, <style>,
// <form>, event-handler attributes — can only have arrived via paste, and is
// dropped entirely rather than risk it either executing live in the editor
// or being persisted and re-rendered elsewhere as stored XSS.
const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE",
  "UL", "OL", "LI", "A", "BR", "DIV", "SPAN", "P",
  // FIGURE is here only because the toolbar's "Chart" button produces it.
  // It carries no text content — see sanitizeAttribute for the data-chart rule.
  "FIGURE",
]);

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  // Same rule as string.formatter.ts's applyMark: allow http(s)/mailto, a
  // single leading "/" (same-site relative path, NOT "//host" protocol-
  // relative), or "#" — reject everything else including javascript:.
  return /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(trimmed);
}

/**
 * 🛑 This is the SAVE-time sanitiser, and it is a different, stricter one from
 * `RichText.tsx`'s render-time `sanitiseHtml`. Both had to learn about
 * `data-chart` — teaching only the renderer, as a first pass here did, means a
 * chart inserted in the editor is silently deleted the moment it is saved,
 * with the toolbar button appearing to work perfectly.
 *
 * The rule is stricter than the renderer's on purpose: the value is not merely
 * allowed through, it must PARSE as a valid ChartSpec. Invalid JSON or a spec
 * that fails validation loses the attribute, and the empty `<figure>` that
 * remains is then dropped by `sanitizeElement`. So malformed chart data cannot
 * be persisted at all, which is the right place to stop it — once stored, it
 * is every future reader's problem.
 */
function sanitizeAttribute(el: HTMLElement, attr: Attr): void {
  const name = attr.name.toLowerCase();

  if (el.tagName === "A" && name === "href") {
    if (!isSafeHref(attr.value)) el.setAttribute("href", "#");
    return;
  }

  if (el.tagName === "FIGURE" && name === "data-chart") {
    if (!parseChartAttr(attr.value).ok) el.removeAttribute(attr.name);
    return;
  }

  el.removeAttribute(attr.name);
}

function sanitizeElement(root: DocumentFragment | HTMLElement, el: HTMLElement): void {
  if (!ALLOWED_TAGS.has(el.tagName)) {
    root.removeChild(el);
    return;
  }
  Array.from(el.attributes).forEach((attr) => sanitizeAttribute(el, attr));

  // A <figure> is only legal here as a chart carrier. If the attribute did not
  // survive validation above, what is left is an empty element with no text and
  // no meaning — drop it rather than persist a blank block the author cannot
  // see, select, or delete.
  if (el.tagName === "FIGURE" && !el.hasAttribute("data-chart")) {
    root.removeChild(el);
    return;
  }

  sanitizeChildren(el);
}

function sanitizeChildren(root: DocumentFragment | HTMLElement): void {
  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      sanitizeElement(root, child as HTMLElement);
    } else if (child.nodeType !== Node.TEXT_NODE) {
      root.removeChild(child);
    }
  });
}

function sanitizeRichTextHtml(html: string): string {
  if (typeof document === "undefined" || !html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  sanitizeChildren(template.content);
  return template.innerHTML;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  className = "",
  minHeightClassName = "min-h-[180px]",
  placeholder = "Write formatted content...",
  ariaLabelledBy,
  ariaLabel,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [chartDraft, setChartDraft] = useState<string | null>(null);

  const emitChange = () => {
    if (!editorRef.current) return;
    const raw = editorRef.current.innerHTML;
    const sanitized = sanitizeRichTextHtml(raw);
    // Only touch the live DOM (which would reset caret position) when
    // sanitization actually changed something — a no-op for every normal
    // keystroke/toolbar action, since those only ever produce allowlisted
    // markup; only a malicious paste triggers this branch.
    if (sanitized !== raw) {
      editorRef.current.innerHTML = sanitized;
    }
    onChange(sanitized);
  };

  const exec = (command: string, commandValue?: string) => {
    if (disabled || typeof document === "undefined") return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  const toolbarActions = useMemo<ToolbarAction[]>(
    () => [
      { label: "B", title: "Bold", run: () => exec("bold") },
      { label: "I", title: "Italic", run: () => exec("italic") },
      { label: "U", title: "Underline", run: () => exec("underline") },
      {
        label: "• List",
        title: "Bulleted list",
        run: () => exec("insertUnorderedList"),
      },
      {
        label: "1. List",
        title: "Numbered list",
        run: () => exec("insertOrderedList"),
      },
      {
        label: "Link",
        title: "Insert link",
        run: () => {
          if (typeof window === "undefined") return;
          const href = window.prompt("Enter URL", "https://");
          if (!href) return;
          exec("createLink", href);
        },
      },
      {
        label: "Chart",
        title: "Insert chart",
        run: () => setChartDraft(STARTER_CHART),
      },
      {
        label: "Clear",
        title: "Clear formatting",
        run: () => exec("removeFormat"),
      },
    ],
    [],
  );

  /*
   * `insertHTML` rather than building a node and splicing it in: the editor is
   * a contenteditable and execCommand is already how every other toolbar action
   * writes, so this keeps the caret and the undo stack behaving the same way.
   * The inserted markup then goes straight through `emitChange` →
   * `sanitizeRichTextHtml`, so the chart is validated on the way out exactly as
   * a pasted one would be — the button gets no privileged path.
   */
  const insertChart = () => {
    if (chartDraft === null) return;
    const parsed = parseChartAttr(chartDraft);
    if (!parsed.ok) return;
    exec("insertHTML", chartFigureHtml(parsed.spec));
    setChartDraft(null);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Sanitize on every incoming `value` too — this is the stored-XSS path:
    // previously-saved content (e.g. loaded from Firestore) must not be
    // trusted just because it was already persisted.
    const safeValue = sanitizeRichTextHtml(value);
    if (editor.innerHTML !== safeValue) {
      editor.innerHTML = safeValue;
    }
  }, [value]);

  return (
    <div
      className={`appkit-rich-text-editor rounded-lg border border-zinc-200 bg-[var(--appkit-color-surface)] border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] ${className}`}
     data-section="richtexteditor-div-582">
      <div className="appkit-rich-text-editor__toolbar flex flex-wrap gap-1 border-b p-2 border-[var(--appkit-color-border)]" data-section="richtexteditor-div-583">
        {toolbarActions.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            onClick={action.run}
            disabled={disabled}
            className="appkit-rich-text-editor__btn rounded px-2 py-1 text-xs font-medium transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 text-[var(--appkit-color-text-muted)]"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/*
        Inline panel rather than a Modal: <Modal> mounts the overlay context
        that makes <Form>'s bottom bar stand itself down, and this editor is
        frequently rendered INSIDE a form. Opening a chart editor would then
        blank the surrounding form's Save bar until it closed.

        The author edits JSON. That is honest for a first cut — the validator
        gives a specific, readable reason for every mistake, which is more
        useful than a field-by-field builder that silently permits a series
        length mismatch. A visual builder can replace the textarea later
        without touching anything else, because the contract is the spec.
      */}
      {chartDraft !== null ? (
        <ChartDraftPanel
          draft={chartDraft}
          onDraftChange={setChartDraft}
          onInsert={insertChart}
          onCancel={() => setChartDraft(null)}
        />
      ) : null}

      <div
        ref={editorRef}
        /*
         * 🛑 `role` and `aria-label` USED TO BE DECLARED HERE TOO, hardcoded
         * to "Rich text editor" — and when the labelling props were added
         * below, that made two of each on one element (`TS17001: JSX elements
         * cannot have multiple attributes with the same name`). Removed here
         * rather than there, because the hardcoded name was the weaker of the
         * two: every rich-text field in the app announced itself as "Rich
         * text editor", which says what the WIDGET is and never which FIELD
         * it is — on the category editor that is the one describing the
         * category, and the user could not tell.
         */
        contentEditable={!disabled}
        suppressContentEditableWarning
        /*
         * 🛑 `role="textbox"` AND `aria-multiline` ARE REQUIRED FOR THE NAME TO
         * BE ANNOUNCED. A bare `contenteditable` div has no role, and
         * `aria-labelledby` on a roleless generic element is not reliably
         * exposed — the name attaches to something the user is never told is
         * editable. The role is what makes it a form control to assistive
         * technology, and only then does the label mean anything.
         */
        role="textbox"
        aria-multiline="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        aria-disabled={disabled || undefined}
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={`prose max-w-none p-3 focus:outline-none ${minHeightClassName} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      />
    </div>
  );
}
