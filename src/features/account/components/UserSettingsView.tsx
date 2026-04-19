import React from "react";
import { StackedViewShell } from "../../../ui";
import type { StackedViewShellProps } from "../../../ui";

export interface UserSettingsViewLabels {
  title?: string;
}

export interface UserSettingsViewProps extends Omit<
  StackedViewShellProps,
  "sections"
> {
  labels?: UserSettingsViewLabels;
  renderAccountInfo?: () => React.ReactNode;
  renderProfileForm?: () => React.ReactNode;
  renderEmailVerification?: () => React.ReactNode;
  renderPhoneVerification?: () => React.ReactNode;
  renderPasswordForm?: () => React.ReactNode;
  renderMessage?: () => React.ReactNode;
}

export function UserSettingsView({
  labels = {},
  renderAccountInfo,
  renderProfileForm,
  renderEmailVerification,
  renderPhoneVerification,
  renderPasswordForm,
  renderMessage,
  ...rest
}: UserSettingsViewProps) {
  return (
    <StackedViewShell
      portal="user"
      {...rest}
      title={labels.title}
      sections={[
        renderMessage?.(),
        renderAccountInfo?.(),
        renderProfileForm?.(),
        renderEmailVerification?.(),
        renderPhoneVerification?.(),
        renderPasswordForm?.(),
      ]}
    />
  );
}
