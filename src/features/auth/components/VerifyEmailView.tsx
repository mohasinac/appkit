import React from "react";
import { Button, Div, Heading, Row, Text } from "../../../ui";
import { THEME_CONSTANTS } from "../../../tokens";

const CLS_SUCCESS_CIRCLE = "w-12 h-12 rounded-full bg-success-surface flex items-center justify-center mx-auto mb-6";
const CLS_ERROR_CIRCLE = "w-12 h-12 rounded-full bg-error-surface flex items-center justify-center mx-auto mb-6";
const CLS_ERROR_ICON = "w-6 h-6 text-error";

export interface VerifyEmailViewProps {
  /** Status of the verification */
  status: "loading" | "success" | "error";
  error?: string | null;
  labels?: {
    loadingTitle?: string;
    loadingDescription?: string;
    successTitle?: string;
    successDescription?: string;
    errorTitle?: string;
    errorDescription?: string;
    retryLabel?: string;
    continueLabel?: string;
  };
  onRetry?: () => void;
  renderContinueButton?: () => React.ReactNode;
  className?: string;
}

export function VerifyEmailView({
  status,
  error,
  labels = {},
  onRetry,
  renderContinueButton,
  className = "",
}: VerifyEmailViewProps) {
  return (
    <Row
      className={`min-h-[60vh] ${className}`} align="center" justify="center" padding="x-md"
    >
      <Div surface="elevated" padding="xl" className="max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin mx-auto mb-6" rounded="full" />
            <Heading level={2} className="mb-2" size="xl" weight="semibold">
              {labels.loadingTitle ?? "Verifying your email…"}
            </Heading>
            <Text color="muted">
              {labels.loadingDescription ?? "Please wait a moment."}
            </Text>
          </>
        )}

        {status === "success" && (
          <>
            <Div className={CLS_SUCCESS_CIRCLE}>
              <svg
                className={`w-6 h-6 ${THEME_CONSTANTS.themed.textSuccess}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </Div>
            <Heading level={2} className="mb-2" size="xl" weight="semibold">
              {labels.successTitle ?? "Email verified!"}
            </Heading>
            <Text className="mb-6" color="muted">
              {labels.successDescription ??
                "Your email has been verified successfully."}
            </Text>
            {renderContinueButton?.()}
          </>
        )}

        {status === "error" && (
          <>
            <Div className={CLS_ERROR_CIRCLE}>
              <svg
                className={CLS_ERROR_ICON}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Div>
            <Heading level={2} className="mb-2" size="xl" weight="semibold">
              {labels.errorTitle ?? "Verification failed"}
            </Heading>
            <Text className="mb-2" color="muted">
              {error ??
                labels.errorDescription ??
                "The verification link may have expired."}
            </Text>
            {onRetry && (
              <Button
                onClick={onRetry}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                {labels.retryLabel ?? "Try again"}
              </Button>
            )}
          </>
        )}
      </Div>
    </Row>
  );
}
