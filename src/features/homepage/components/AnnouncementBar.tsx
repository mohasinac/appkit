"use client";
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../../react/contexts/SessionContext";
import { Div } from "../../../ui/components/Div";

import { Row } from "@mohasinac/appkit";
const STORAGE_KEY = "letitrip:announcement-dismissed";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function hashBannerMessage(msg: string): string {
  let h = 0;
  for (let i = 0; i < msg.length; i++) {
    h = (Math.imul(31, h) + msg.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

function isLocallyDismissed(message: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { hash, at } = JSON.parse(raw);
    if (hash !== hashBannerMessage(message)) return false;
    return Date.now() - at < ONE_WEEK_MS;
  } catch {
    return false;
  }
}

function saveLocalDismissal(message: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hash: hashBannerMessage(message), at: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

export interface AnnouncementBarProps {
  message: string;
  className?: string;
  /** Called when the user dismisses — consumer wires this to a server action to persist. */
  onDismiss?: (hash: string) => void;
}

export function AnnouncementBar({ message, className = "", onDismiss }: AnnouncementBarProps) {
  const { user } = useAuth();
  const bannerHash = hashBannerMessage(message);
  const userAlreadyDismissed = !!user?.dismissedBannerHash && user.dismissedBannerHash === bannerHash;

  const [dismissed, setDismissed] = useState(userAlreadyDismissed);
  const [mounted, setMounted] = useState(userAlreadyDismissed);

  useEffect(() => {
    if (userAlreadyDismissed) {
      setDismissed(true);
    } else if (isLocallyDismissed(message)) {
      setDismissed(true);
    }
    setMounted(true);
  }, [message, userAlreadyDismissed]);

  if (dismissed) return null;
  return (
    <Div className={`relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-primary-700 transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"} ${className}`} role="banner">
      <Div className="container mx-auto max-w-[1920px] sm:px-6 lg:px-8" padding="x-md">
        <Row className="relative text-center text-sm font-medium text-white" padding="y-xs" align="center" justify="center">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => {
              saveLocalDismissal(message);
              onDismiss?.(bannerHash);
              setDismissed(true);
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </Row>
      </Div>
    </Div>
  );
}
