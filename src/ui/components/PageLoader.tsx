"use client";

import React from "react";
import { Spinner } from "./Spinner";
import { Button } from "./Button";
import { Text } from "./Typography";

export interface PageLoaderProps {
  /**
   * Optional skeleton layout rendered behind the spinner overlay.
   * Improves Lighthouse CLS — the skeleton reserves the correct page shape
   * while data loads. The spinner floats on top as a semi-transparent overlay.
   * After 15s timeout the overlay switches to the error message.
   */
  children?: React.ReactNode;
}

export function PageLoader({ children }: PageLoaderProps) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 15_000);
    return () => clearTimeout(id);
  }, []);

  if (!children) {
    // No skeleton — simple centred spinner / timeout message
    if (timedOut) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <Text className="text-base font-medium text-zinc-700 dark:text-zinc-300">
            Something went wrong. Please refresh the page.
          </Text>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      );
    }
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <Text className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</Text>
      </div>
    );
  }

  // Skeleton provided — render it behind a floating overlay
  return (
    <div className="relative">
      {/* Skeleton content — improves Lighthouse CLS by preserving page shape */}
      <div aria-hidden="true">{children}</div>

      {/* Floating overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/60 p-8 text-center backdrop-blur-sm dark:bg-zinc-900/60">
        {timedOut ? (
          <>
            <Text className="text-base font-medium text-zinc-700 dark:text-zinc-300">
              Something went wrong. Please refresh the page.
            </Text>
            {/* pointer-events-auto so the button stays clickable */}
            <div className="pointer-events-auto">
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </>
        ) : (
          <>
            <Spinner size="lg" />
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</Text>
          </>
        )}
      </div>
    </div>
  );
}
