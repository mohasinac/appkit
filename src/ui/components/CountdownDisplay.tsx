"use client";
import "client-only";

import { useEffect, useMemo, useState } from "react";
import { Span } from "./Typography";
import { classNames } from "../style.helper";

export interface CountdownRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface CountdownDisplayProps {
  targetDate: Date;
  format?: "dhms" | "hms" | "auto";
  expiredLabel?: string;
  className?: string;
}

function getRemaining(targetDate: Date): CountdownRemaining | null {
  const now = Date.now();
  const distance = targetDate.getTime() - now;
  if (distance <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(distance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function formatLabel(
  remaining: CountdownRemaining,
  format: "dhms" | "hms" | "auto",
): string {
  const { days, hours, minutes, seconds } = remaining;

  if (format === "hms") {
    const totalHours = days * 24 + hours;
    return `${totalHours}h ${minutes}m ${seconds}s`;
  }

  if (format === "dhms") {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function CountdownDisplay({
  targetDate,
  format = "auto",
  expiredLabel = "Ended",
  className,
}: CountdownDisplayProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const remaining = useMemo(() => getRemaining(targetDate), [targetDate, tick]);
  const label = remaining ? formatLabel(remaining, format) : expiredLabel;

  return (
    <Span
      variant="inherit"
      className={classNames("appkit-countdown", className)}
    >
      {label}
    </Span>
  );
}
