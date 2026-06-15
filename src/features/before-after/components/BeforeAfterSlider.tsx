"use client"
import React, { useRef, useState } from "react";
import type { BeforeAfterItem } from "../types";
import { Div, Span, Stack } from "../../../ui";
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
    <Div
      ref={containerRef}
      className={`relative aspect-square select-none overflow-hidden ${className}`} rounded="xl"
      onPointerMove={handlePointerMove}
      onTouchMove={handleTouchMove}
    >
      {/* After image (base layer) */}
      <Div
        role="img"
        aria-label="After"
        className="absolute inset-0 h-full w-full bg-center bg-cover"
        style={{ backgroundImage: `url(${item.afterImageUrl})` }}
      />

      {/* Before image (clipped layer) */}
      <Div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <Div
          role="img"
          aria-label="Before"
          className="h-full w-full bg-center bg-cover"
          style={{
            width: containerRef.current?.offsetWidth ?? "100%",
            backgroundImage: `url(${item.beforeImageUrl})`,
          }}
        />
      </Div>

      {/* Divider handle */}
      <Stack
        className="absolute inset-y-0 w-1 -translate-x-1/2 cursor-ew-resize justify-center" align="center"
        style={{ left: `${position}%` }}
      >
        <Div className="h-full w-0.5 shadow" surface="default" />
        <Div className="absolute h-8 w-8 border-2 border-white" surface="default" rounded="full" shadow="md" />
      </Stack>

      {/* Labels */}
      <Span size="xs" weight="medium" className="absolute left-2 top-2 bg-black/40 py-0.5 text-white" rounded="default" padding="x-xs">
        Before
      </Span>
      <Span size="xs" weight="medium" className="absolute right-2 top-2 bg-black/40 py-0.5 text-white" rounded="default" padding="x-xs">
        After
      </Span>

      {item.durationWeeks && (
        <Span size="xs" weight="medium" className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 py-1 text-white" rounded="default" padding="x-sm">
          {item.durationWeeks} weeks
        </Span>
      )}
    </Div>
  );
}
