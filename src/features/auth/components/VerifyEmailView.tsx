"use client";

import React from "react";
import { Div, Heading, Text } from "@mohasinac/ui";

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
    <Div
      className={`flex items-center justify-center min-h-[60vh] px-4 ${className}`}
    >
      <Div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center">
        {status === "loading" && (
          <>
            <Div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-6" />
            <Heading level={2} className="text-xl font-semibold mb-2">
              {labels.loadingTitle ?? "Verifying your email…"}
            </Heading>
            <Text className="text-neutral-500">
              {labels.loadingDescription ?? "Please wait a moment."}
            </Text>
          </>
        )}

        {status === "success" && (
          <>
            <Div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-6 h-6 text-green-600"
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
            <Heading level={2} className="text-xl font-semibold mb-2">
              {labels.successTitle ?? "Email verified!"}
            </Heading>
            <Text className="text-neutral-500 mb-6">
              {labels.successDescription ??
                "Your email has been verified successfully."}
            </Text>
            {renderContinueButton?.()}
          </>
        )}

        {status === "error" && (
          <>
            <Div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-6 h-6 text-red-600"
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
            <Heading level={2} className="text-xl font-semibold mb-2">
              {labels.errorTitle ?? "Verification failed"}
            </Heading>
            <Text className="text-neutral-500 mb-2">
              {error ??
                labels.errorDescription ??
                "The verification link may have expired."}
            </Text>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                {labels.retryLabel ?? "Try again"}
              </button>
            )}
          </>
        )}
      </Div>
    </Div>
  );
}
