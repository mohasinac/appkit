"use client";
import React, { useRef, useState } from "react";
import type { BeforeAfterItem } from "../types";
import { Span } from "@mohasinac/ui";

interface BeforeAfterSliderProps {
  item: BeforeAfterItem;
  className?: string;
}

export function BeforeAfterSlider({
  item,
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!(e.buttons & 1)) return;
    move(e.clientX);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    move(e.touches[0].clientX);
  }

  function move(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square select-none overflow-hidden rounded-xl ${className}`}
      onPointerMove={handlePointerMove}
      onTouchMove={handleTouchMove}
    >
      {/* After image (base layer) */}
      <div
        role="img"
        aria-label="After"
        className="absolute inset-0 h-full w-full bg-center bg-cover"
        style={{ backgroundImage: `url(${item.afterImageUrl})` }}
      />

      {/* Before image (clipped layer) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <div
          role="img"
          aria-label="Before"
          className="h-full w-full bg-center bg-cover"
          style={{
            width: containerRef.current?.offsetWidth ?? "100%",
            backgroundImage: `url(${item.beforeImageUrl})`,
          }}
        />
      </div>

      {/* Divider handle */}
      <div
        className="absolute inset-y-0 flex w-1 -translate-x-1/2 cursor-ew-resize flex-col items-center justify-center"
        style={{ left: `${position}%` }}
      >
        <div className="h-full w-0.5 bg-white/80 shadow" />
        <div className="absolute h-8 w-8 rounded-full border-2 border-white bg-white/80 shadow-md" />
      </div>

      {/* Labels */}
      <Span className="absolute left-2 top-2 rounded bg-black/40 px-2 py-0.5 text-xs font-medium text-white">
        Before
      </Span>
      <Span className="absolute right-2 top-2 rounded bg-black/40 px-2 py-0.5 text-xs font-medium text-white">
        After
      </Span>

      {item.durationWeeks && (
        <Span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/50 px-3 py-1 text-xs font-medium text-white">
          {item.durationWeeks} weeks
        </Span>
      )}
    </div>
  );
}
