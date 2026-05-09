"use client";

import React from "react";
import { Spinner } from "./Spinner";
import { Button } from "./Button";

export function PageLoader() {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 15_000);
    return () => clearTimeout(id);
  }, []);

  if (timedOut) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
          Something went wrong. Please refresh the page.
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
    </div>
  );
}
