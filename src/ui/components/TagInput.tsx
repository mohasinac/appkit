"use client";

import React, { useRef, useState } from "react";
import { Label, Span } from "./Typography";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  helperText?: string;
}

export function TagInput({
  value,
  onChange,
  disabled = false,
  label,
  placeholder = "Add a tag...",
  className = "",
  helperText = "Press Enter or comma to add a tag",
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/,+$/, "").trim();
    if (!tag || value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
      return;
    }

    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (inputValue.includes(",")) {
      const parts = inputValue.split(",");
      const last = parts.pop() ?? "";
      parts.forEach((part) => addTag(part));
      setDraft(last);
      return;
    }

    setDraft(inputValue);
  };

  const handleBlur = () => {
    if (draft.trim()) {
      addTag(draft);
    }
  };

  return (
    <div className={className}>
      {label && <Label className="mb-1.5 block text-sm font-medium">{label}</Label>}

      <div
        onClick={() => !disabled && inputRef.current?.focus()}
        className={[
          "flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2",
          "border-zinc-300 bg-white dark:border-slate-700 dark:bg-slate-900",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "transition-colors focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/30",
        ].join(" ")}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-700 dark:text-primary-300"
          >
            <Span size="xs">{tag}</Span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="ml-0.5 text-primary-700/70 hover:text-primary-700 dark:text-primary-300/70 dark:hover:text-primary-300"
                aria-label={`Remove tag ${tag}`}
              >
                x
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ""}
          className={[
            "min-w-[100px] flex-1 bg-transparent text-sm outline-none",
            "text-zinc-900 placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500",
            disabled ? "cursor-not-allowed" : "",
          ].join(" ")}
          aria-label={label ?? "Tag input"}
        />
      </div>

      {helperText && (
        <Span size="xs" className="mt-1 text-zinc-500 dark:text-zinc-400">
          {helperText}
        </Span>
      )}
    </div>
  );
}
