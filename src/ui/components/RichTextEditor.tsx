"use client";

import React, { useEffect, useMemo, useRef } from "react";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
  placeholder?: string;
}

type ToolbarAction = {
  label: string;
  title: string;
  run: () => void;
};

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  className = "",
  minHeightClassName = "min-h-[180px]",
  placeholder = "Write formatted content...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const emitChange = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
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
        label: "Clear",
        title: "Clear formatting",
        run: () => exec("removeFormat"),
      },
    ],
    [],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${className}`}
     data-section="richtexteditor-div-582">
      <div className="flex flex-wrap gap-1 border-b border-zinc-200 p-2 dark:border-slate-700" data-section="richtexteditor-div-583">
        {toolbarActions.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            onClick={action.run}
            disabled={disabled}
            className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-zinc-200 dark:hover:bg-slate-800"
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-label="Rich text editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={`prose prose-sm max-w-none p-3 focus:outline-none dark:prose-invert ${minHeightClassName} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      />
    </div>
  );
}
