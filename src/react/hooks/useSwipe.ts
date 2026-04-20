"use client"
import { useRef, useEffect, RefObject } from "react";

/**
 * Swipe direction types
 */
export type SwipeDirection = "left" | "right" | "up" | "down";

/**
 * Configuration options for useSwipe hook
 */
export interface UseSwipeOptions {
  /** Minimum distance in pixels to register as a swipe (default: 50) */
  minSwipeDistance?: number;
  /** Maximum time in ms for a swipe gesture (default: 300) */
  maxSwipeTime?: number;
  /** Threshold for swipe velocity (pixels/ms, default: 0.3) */
  velocityThreshold?: number;
  /** Callback when swipe is detected */
  onSwipe?: (
    direction: SwipeDirection,
    distance: number,
    velocity: number,
  ) => void;
  /** Callback for specific directions */
  onSwipeLeft?: (distance: number, velocity: number) => void;
  onSwipeRight?: (distance: number, velocity: number) => void;
  onSwipeUp?: (distance: number, velocity: number) => void;
  onSwipeDown?: (distance: number, velocity: number) => void;
  /** Callback during swipe (for dragging effect) */
  onSwiping?: (deltaX: number, deltaY: number) => void;
  /** Callback when swipe starts */
  onSwipeStart?: () => void;
  /** Callback when swipe ends (regardless of direction detected) */
  onSwipeEnd?: () => void;
  /** Prevent default behavior during touch */
  preventDefault?: boolean;
}

/**
 * useSwipe Hook
 *
 * Detects swipe gestures on touch and mouse events.
 * Works on both mobile (touch) and desktop (mouse drag).
 *
 * @param ref - Reference to the element to attach swipe handlers
 * @param options - Configuration options for swipe detection
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 *
 * useSwipe(ref, {
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   minSwipeDistance: 100,
 * });
 *
 * return <div ref={ref}>Swipe me!</div>;
 * ```
 */
export function useSwipe<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  options: UseSwipeOptions = {},
) {
  const {
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    velocityThreshold = 0.3,
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwiping,
    onSwipeStart,
    onSwipeEnd,
    preventDefault = false,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const isSwiping = useRef(false);

  const onSwipeRef = useRef(onSwipe);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  const onSwipeUpRef = useRef(onSwipeUp);
  const onSwipeDownRef = useRef(onSwipeDown);
  const onSwipingRef = useRef(onSwiping);
  const onSwipeStartRef = useRef(onSwipeStart);
  const onSwipeEndRef = useRef(onSwipeEnd);

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);
  useEffect(() => {
    onSwipeLeftRef.current = onSwipeLeft;
  }, [onSwipeLeft]);
  useEffect(() => {
    onSwipeRightRef.current = onSwipeRight;
  }, [onSwipeRight]);
  useEffect(() => {
    onSwipeUpRef.current = onSwipeUp;
  }, [onSwipeUp]);
  useEffect(() => {
    onSwipeDownRef.current = onSwipeDown;
  }, [onSwipeDown]);
  useEffect(() => {
    onSwipingRef.current = onSwiping;
  }, [onSwiping]);
  useEffect(() => {
    onSwipeStartRef.current = onSwipeStart;
  }, [onSwipeStart]);
  useEffect(() => {
    onSwipeEndRef.current = onSwipeEnd;
  }, [onSwipeEnd]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const processSwipe = (
      deltaX: number,
      deltaY: number,
      deltaTime: number,
    ) => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / deltaTime;

      if (
        distance < minSwipeDistance ||
        deltaTime > maxSwipeTime ||
        velocity < velocityThreshold
      )
        return;

      let direction: SwipeDirection;
      if (absX > absY) {
        direction = deltaX > 0 ? "right" : "left";
        if (direction === "left") onSwipeLeftRef.current?.(distance, velocity);
        else onSwipeRightRef.current?.(distance, velocity);
      } else {
        direction = deltaY > 0 ? "down" : "up";
        if (direction === "up") onSwipeUpRef.current?.(distance, velocity);
        else onSwipeDownRef.current?.(distance, velocity);
      }
      onSwipeRef.current?.(direction, distance, velocity);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (preventDefault) e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isSwiping.current = true;
      onSwipeStartRef.current?.();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || !isSwiping.current) return;
      if (preventDefault) e.preventDefault();
      onSwipingRef.current?.(
        e.touches[0].clientX - touchStartRef.current.x,
        e.touches[0].clientY - touchStartRef.current.y,
      );
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !isSwiping.current) return;
      if (preventDefault) e.preventDefault();
      const touch = e.changedTouches[0];
      processSwipe(
        touch.clientX - touchStartRef.current.x,
        touch.clientY - touchStartRef.current.y,
        Date.now() - touchStartRef.current.time,
      );
      touchStartRef.current = null;
      isSwiping.current = false;
      onSwipeEndRef.current?.();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (preventDefault) e.preventDefault();
      touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      isSwiping.current = true;
      onSwipeStartRef.current?.();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!touchStartRef.current || !isSwiping.current) return;
      onSwipingRef.current?.(
        e.clientX - touchStartRef.current.x,
        e.clientY - touchStartRef.current.y,
      );
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!touchStartRef.current || !isSwiping.current) return;
      if (preventDefault) e.preventDefault();
      processSwipe(
        e.clientX - touchStartRef.current.x,
        e.clientY - touchStartRef.current.y,
        Date.now() - touchStartRef.current.time,
      );
      touchStartRef.current = null;
      isSwiping.current = false;
      onSwipeEndRef.current?.();
    };

    element.addEventListener("touchstart", handleTouchStart, {
      passive: !preventDefault,
    });
    element.addEventListener("touchmove", handleTouchMove, {
      passive: !preventDefault,
    });
    element.addEventListener("touchend", handleTouchEnd, {
      passive: !preventDefault,
    });
    element.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [ref, minSwipeDistance, maxSwipeTime, velocityThreshold, preventDefault]);
}
