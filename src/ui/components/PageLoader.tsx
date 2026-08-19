"use client";

import React from "react";
import { Button } from "./Button";
import { Text } from "./Typography";
import { SiteMark } from "./SiteMark";
import { AnimatedDiv } from "./Motion";

const SPIN_TRANSITION = { repeat: Infinity, duration: 1.8, ease: "linear" as const };

function SpinningMark() {
  return (
    <AnimatedDiv
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={SPIN_TRANSITION}
    >
      <SiteMark size="lg" title="Loading" />
    </AnimatedDiv>
  );
}

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
          <Text className="text-base font-medium text-[var(--appkit-color-text-muted)]">
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
        <SpinningMark />
        <Text className="text-sm text-[var(--appkit-color-text-muted)]">Loading…</Text>
      </div>
    );
  }

  // Skeleton provided — render it behind a floating overlay
  return (
    <div className="relative">
      {/* Skeleton content — improves Lighthouse CLS by preserving page shape */}
      <div aria-hidden="true">{children}</div>

      {/* Floating overlay */}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/60 p-8 text-center backdrop-blur-sm bg-[var(--appkit-color-surface)]/60">
        {timedOut ? (
          <>
            <Text className="text-base font-medium text-[var(--appkit-color-text-muted)]">
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
            <SpinningMark />
            <Text className="text-sm text-[var(--appkit-color-text-muted)]">Loading…</Text>{/* audit-spinner-defaults-ok — PageLoader primitive: spinner + label by design */}
          </>
        )}
      </div>
    </div>
  );
}
