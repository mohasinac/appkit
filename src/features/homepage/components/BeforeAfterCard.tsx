"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Text } from "@mohasinac/ui";
import type { BeforeAfterItem } from "../types";

export interface BeforeAfterCardProps {
  item: BeforeAfterItem;
  /** Label shown on the left (before) side. Default: "Before". */
  beforeLabel?: string;
  /** Label shown on the right (after) side. Default: "After". */
  afterLabel?: string;
}

export function BeforeAfterCard({
  item,
  beforeLabel = "Before",
  afterLabel = "After",
}: BeforeAfterCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientX =
        "touches" in e
          ? (e as TouchEvent).touches[0]!.clientX
          : (e as MouseEvent).clientX;
      updatePosition(clientX);
    };
    const onUp = () => setDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updatePosition]);

  return (
    <div className="border-border overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div
        ref={containerRef}
        className="relative aspect-[4/3] cursor-col-resize overflow-hidden select-none"
        onMouseDown={(e) => {
          setDragging(true);
          updatePosition(e.clientX);
        }}
        onTouchStart={(e) => {
          setDragging(true);
          updatePosition(e.touches[0]!.clientX);
        }}
        role="slider"
        aria-label={`Before and after comparison: ${item.caption}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 2));
          if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 2));
        }}
      >
        {/* After image — full, behind */}
        <Image
          src={item.afterImage}
          alt={afterLabel}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
        />

        {/* Before image — clipped to left of divider */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <Image
            src={item.beforeImage}
            alt={beforeLabel}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-card shadow-md"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card shadow-lg">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 8L1 5M4 8L1 11M4 8H12M12 8L15 5M12 8L15 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Labels */}
        <span className="absolute top-3 left-3 z-10 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white">
          {beforeLabel}
        </span>
        <span className="absolute top-3 right-3 z-10 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-medium text-white">
          {afterLabel}
        </span>
      </div>

      {/* Caption */}
      <div className="p-4">
        <Text className="text-foreground text-sm font-medium">
          {item.caption}
        </Text>
      </div>
    </div>
  );
}
