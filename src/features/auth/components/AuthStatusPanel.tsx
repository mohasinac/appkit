"use client";

import type { ReactNode } from "react";
import { Div, Heading, Text } from "../../../ui";

type AuthStatusTone = "success" | "error" | "loading";

interface AuthStatusPanelProps {
  tone: AuthStatusTone;
  title: string;
  message?: string;
  actions?: ReactNode;
}

function toneClass(tone: AuthStatusTone): string {
  if (tone === "success") return "text-green-500 dark:text-green-400";
  if (tone === "error") return "text-red-500 dark:text-red-400";
  return "text-primary";
}

function iconPath(tone: AuthStatusTone): string {
  if (tone === "success") {
    return "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z";
  }
  if (tone === "error") {
    return "M6 18L18 6M6 6l12 12";
  }
  return "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
}

export function AuthStatusPanel({
  tone,
  title,
  message,
  actions,
}: AuthStatusPanelProps) {
  return (
    <>
      <Div className={`mb-4 ${toneClass(tone)}`}>
        <svg
          className="w-16 h-16 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={iconPath(tone)}
          />
        </svg>
      </Div>

      <Heading level={2} className="mb-2 text-xl font-semibold">
        {title}
      </Heading>
      {message ? (
        <Text className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </Text>
      ) : null}
      {actions}
    </>
  );
}
