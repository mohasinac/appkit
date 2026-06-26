"use client";
import { useRef, useEffect } from "react";

export interface ProgressBarFillProps {
  /** 0–100 percentage */
  pct: number;
  className?: string;
}

export function ProgressBarFill({ pct, className = "" }: ProgressBarFillProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.style.width = `${pct}%`;
  }, [pct]);
  return <div ref={ref} className={className} />;
}
