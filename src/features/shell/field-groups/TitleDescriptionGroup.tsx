"use client";
import React, { type ReactNode } from "react";
import { Input } from "../../../ui/components/Input";
import { Textarea } from "../../../ui/components/Textarea";
import { SettingsSection } from "../../../ui/components/SettingsSection";

export interface TitleDescriptionGroupProps {
  /** Form field value: title. */
  title: string;
  /** Form field value: description (plain text). */
  description: string;
  /** Setters. */
  onTitleChange: (next: string) => void;
  onDescriptionChange: (next: string) => void;
  /** Optional section label override. */
  sectionTitle?: ReactNode;
  /** Optional section description. */
  sectionDescription?: ReactNode;
  /** Optional placeholder overrides. */
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  /** Disable both inputs. */
  disabled?: boolean;
  /** When true, render a rich-text editor instead of plain `<Textarea>` (consumer-provided). */
  renderDescription?: (args: {
    value: string;
    onChange: (next: string) => void;
    disabled: boolean;
  }) => ReactNode;
  /** Field-level validation messages. */
  titleError?: string;
  descriptionError?: string;
  /** Max length helpers. */
  titleMaxLength?: number;
  descriptionMaxLength?: number;
}

/**
 * `TitleDescriptionGroup` — shared title + description fields used across
 * Product, Blog, Category, Event, FAQ, Feature, Brand editors. Optionally
 * accepts a `renderDescription` slot to plug in the rich-text editor without
 * coupling this primitive to it.
 *
 * W1-15 — extracted 2026-05-23.
 */
export function TitleDescriptionGroup({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  sectionTitle = "Title & description",
  sectionDescription,
  titlePlaceholder,
  descriptionPlaceholder,
  disabled = false,
  renderDescription,
  titleError,
  descriptionError,
  titleMaxLength,
  descriptionMaxLength,
}: TitleDescriptionGroupProps) {
  return (
    <SettingsSection title={sectionTitle} description={sectionDescription}>
      <Input
        label="Title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={titlePlaceholder}
        disabled={disabled}
        maxLength={titleMaxLength}
        error={titleError}
        required
      />
      {renderDescription ? (
        renderDescription({ value: description, onChange: onDescriptionChange, disabled })
      ) : (
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          disabled={disabled}
          maxLength={descriptionMaxLength}
          error={descriptionError}
          rows={5}
        />
      )}
    </SettingsSection>
  );
}
