"use client"
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
    <div className={["appkit-tag-input", className].filter(Boolean).join(" ")} data-section="taginput-div-618">
      {label && <Label className="appkit-tag-input__label">{label}</Label>}

      <div
        onClick={() => !disabled && inputRef.current?.focus()}
        className={[
          "appkit-tag-input__field",
          disabled ? "appkit-tag-input__field--disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value.map((tag) => (
          <span key={tag} className="appkit-tag-input__tag">
            <Span size="xs">{tag}</Span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="appkit-tag-input__tag-remove"
                aria-label={`Remove tag ${tag}`}
              >
                ×
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
            "appkit-tag-input__text",
            disabled ? "appkit-tag-input__text--disabled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label={label ?? "Tag input"}
        />
      </div>

      {helperText && (
        <Span size="xs" className="appkit-tag-input__helper">
          {helperText}
        </Span>
      )}
    </div>
  );
}
