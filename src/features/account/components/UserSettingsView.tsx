"use client";

import React from "react";
import { Div, Heading } from "@mohasinac/ui";

export interface UserSettingsViewLabels {
  title?: string;
}

export interface UserSettingsViewProps {
  labels?: UserSettingsViewLabels;
  renderAccountInfo?: () => React.ReactNode;
  renderProfileForm?: () => React.ReactNode;
  renderEmailVerification?: () => React.ReactNode;
  renderPhoneVerification?: () => React.ReactNode;
  renderPasswordForm?: () => React.ReactNode;
  renderMessage?: () => React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function UserSettingsView({
  labels = {},
  renderAccountInfo,
  renderProfileForm,
  renderEmailVerification,
  renderPhoneVerification,
  renderPasswordForm,
  renderMessage,
  isLoading = false,
  className = "",
}: UserSettingsViewProps) {
  return (
    <Div className={className}>
      {labels.title && (
        <Heading level={1} className="text-2xl font-bold mb-6">
          {labels.title}
        </Heading>
      )}
      {renderMessage?.()}
      {renderAccountInfo?.()}
      {renderProfileForm?.()}
      {renderEmailVerification?.()}
      {renderPhoneVerification?.()}
      {renderPasswordForm?.()}
    </Div>
  );
}
