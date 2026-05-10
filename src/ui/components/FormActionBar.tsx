"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "./Button";

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
    <div className={`appkit-form-action-bar${className ? ` ${className}` : ""}`}>
      {/* Left: title / breadcrumbs */}
      <div className="appkit-form-action-bar__meta">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="appkit-form-action-bar__breadcrumbs">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:underline truncate">
                    {crumb.label}
                  </a>
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

      {/* Right: action buttons */}
      <div className="appkit-form-action-bar__actions">
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
      </div>
    </div>
  );
}
