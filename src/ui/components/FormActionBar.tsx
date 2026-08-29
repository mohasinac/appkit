"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { ActionRow } from "./ActionRow";
import { Button } from "./Button";
import { TextLink } from "./TextLink";

export interface FormActionBarBreadcrumb {
  label: string;
  href?: string;
}

export interface FormActionBarProps {
  title?: string;
  breadcrumbs?: FormActionBarBreadcrumb[];
  /** Callback for Save Draft — if omitted, the button is not shown */
  onSaveDraft?: () => void;
  /** Callback for Publish / Save — always shown */
  onPublish: () => void;
  publishLabel?: string;
  /** Callback for Preview — if omitted, the button is not shown */
  onPreview?: () => void;
  /** Callback for Discard — if omitted, the button is not shown */
  onDiscard?: () => void;
  /** Shows unsaved-changes indicator and enables discard */
  isDirty?: boolean;
  isSubmitting?: boolean;
  className?: string;
}

export function FormActionBar({
  title,
  breadcrumbs,
  onSaveDraft,
  onPublish,
  publishLabel = "Publish",
  onPreview,
  onDiscard,
  isDirty,
  isSubmitting,
  className,
}: FormActionBarProps) {
  return (
    /*
     * Up to four actions live here (Discard / Preview / Save draft / Publish),
     * and every one of them used to be `flex-shrink: 0` inside a non-wrapping
     * row — so on a narrow viewport the group simply overflowed the bar. As an
     * ActionRow they wrap instead.
     *
     * `align="end"` keeps the desktop look: an editor bar spans the full page
     * width, and stretching four buttons across it would read as a toolbar of
     * banners. The title/breadcrumb block is the `anchor`, which is what lets
     * it shrink and ellipsise while the actions never do.
     */
    <ActionRow
      align="end"
      gap="sm"
      className={`appkit-form-action-bar${className ? ` ${className}` : ""}`}
      anchor={
        <div className="appkit-form-action-bar__meta">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="appkit-form-action-bar__breadcrumbs">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                  {crumb.href ? (
                    <TextLink href={crumb.href} variant="inherit" truncate>
                      {crumb.label}
                    </TextLink>
                  ) : (
                    <span className="truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          {title && (
            <div className="appkit-form-action-bar__title">
              {isDirty && (
                <span className="appkit-form-action-bar__dirty-dot mr-1.5" aria-label="Unsaved changes" />
              )}
              {title}
            </div>
          )}
        </div>
      }
    >
      {isDirty && onDiscard && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={isSubmitting}
          >
            Discard
          </Button>
        )}
        {onPreview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={isSubmitting}
          >
            Preview
          </Button>
        )}
        {onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveDraft}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Save draft
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onPublish}
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {publishLabel}
        </Button>
    </ActionRow>
  );
}
