"use client";

import React from "react";

export interface TourContextValue {
  startTour: () => void;
}

const TourContext = React.createContext<TourContextValue>({
  startTour: () => {},
});

export function useTour(): TourContextValue {
  return React.useContext(TourContext);
}

/**
 * TourProvider — skeleton shell for Patch 1.
 * driver.js steps are wired in Patch 2+; this provider is an identity wrapper.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const startTour = React.useCallback(() => {
    // driver.js will be imported and configured here in Patch 2+.
  }, []);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
}
