"use client"
import { useRef, useEffect, RefObject } from "react";

/**
 * Gesture types supported
 */
export type GestureType = "tap" | "doubletap" | "pinch" | "rotate";

/**
 * Configuration options for useGesture hook
 */
export interface UseGestureOptions {
  /** Callback for tap gesture */
  onTap?: (x: number, y: number) => void;
  /** Callback for double tap gesture */
  onDoubleTap?: (x: number, y: number) => void;
  /** Callback for pinch gesture (zoom in/out) */
  onPinch?: (scale: number, distance: number) => void;
  /** Callback during pinching */
  onPinching?: (scale: number) => void;
  /** Callback for rotation gesture */
  onRotate?: (angle: number) => void;
  /** Callback during rotation */
  onRotating?: (angle: number) => void;
  /** Maximum time between taps for double tap (ms, default: 300) */
  doubleTapDelay?: number;
  /** Maximum movement allowed for tap (px, default: 10) */
  tapMovementThreshold?: number;
  /** Prevent default behavior */
  preventDefault?: boolean;
}

/**
 * useGesture Hook
 *
 * Detects various touch gestures including tap, double tap, pinch, and rotate.
 * Primarily designed for touch devices but also works with mouse for basic gestures.
 *
 * @param ref - Reference to the element to attach gesture handlers
 * @param options - Configuration options for gesture detection
 *
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 *
 * useGesture(ref, {
 * onTap: (x, y) => console.log('Tapped at', x, y),
 * onDoubleTap: () => console.log('Double tapped'),
 * onPinch: (scale) => console.log('Pinch scale', scale),
 * });
 *
 * return <div ref={ref}>Touch me!</div>;
 * ```
 */
export function useGesture<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  options: UseGestureOptions = {},
) {
  const {
    onTap,
    onDoubleTap,
    onPinch,
    onPinching,
    onRotate,
    onRotating,
    doubleTapDelay = 300,
    tapMovementThreshold = 10,
    preventDefault = false,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const lastTapRef = useRef<number>(0);
  const initialPinchDistanceRef = useRef<number>(0);
  const initialRotationRef = useRef<number>(0);
  // Real devices lift two fingers in separate touchend events, so by the
  // final touchend `e.changedTouches` only ever has one entry — tracking
  // the last-known two-finger positions here lets us compute the true
  // final pinch distance / rotation angle instead of pairing a touch with
  // itself (which always yields 0).
  const lastTwoTouchesRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null,
  );

  // Store callbacks in refs to avoid event listener churn
  const onTapRef = useRef(onTap);
  const onDoubleTapRef = useRef(onDoubleTap);
  const onPinchRef = useRef(onPinch);
  const onPinchingRef = useRef(onPinching);
  const onRotateRef = useRef(onRotate);
  const onRotatingRef = useRef(onRotating);

  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);
  useEffect(() => {
    onDoubleTapRef.current = onDoubleTap;
  }, [onDoubleTap]);
  useEffect(() => {
    onPinchRef.current = onPinch;
  }, [onPinch]);
  useEffect(() => {
    onPinchingRef.current = onPinching;
  }, [onPinching]);
  useEffect(() => {
    onRotateRef.current = onRotate;
  }, [onRotate]);
  useEffect(() => {
    onRotatingRef.current = onRotating;
  }, [onRotating]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const getDistance = (
      touch1: { clientX: number; clientY: number },
      touch2: { clientX: number; clientY: number },
    ): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getAngle = (
      touch1: { clientX: number; clientY: number },
      touch2: { clientX: number; clientY: number },
    ): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.atan2(dy, dx) * (180 / Math.PI);
    };

    const captureTwoTouches = (t1: Touch, t2: Touch) => {
      lastTwoTouchesRef.current = {
        x1: t1.clientX,
        y1: t1.clientY,
        x2: t2.clientX,
        y2: t2.clientY,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (preventDefault) e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      if (e.touches.length === 2) {
        initialPinchDistanceRef.current = getDistance(
          e.touches[0],
          e.touches[1],
        );
        initialRotationRef.current = getAngle(e.touches[0], e.touches[1]);
        captureTwoTouches(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (
        e.touches.length === 2 &&
        (onPinchRef.current ||
          onPinchingRef.current ||
          onRotateRef.current ||
          onRotatingRef.current)
      ) {
        if (preventDefault) e.preventDefault();
        captureTwoTouches(e.touches[0], e.touches[1]);
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const currentAngle = getAngle(e.touches[0], e.touches[1]);
        if (initialPinchDistanceRef.current > 0) {
          onPinchingRef.current?.(
            currentDistance / initialPinchDistanceRef.current,
          );
        }
        if (initialRotationRef.current !== 0) {
          onRotatingRef.current?.(currentAngle - initialRotationRef.current);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (preventDefault) e.preventDefault();
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      if (deltaX < tapMovementThreshold && deltaY < tapMovementThreshold) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        if (onDoubleTapRef.current && timeSinceLastTap < doubleTapDelay) {
          onDoubleTapRef.current(
            touchStartRef.current.x,
            touchStartRef.current.y,
          );
          lastTapRef.current = 0;
        } else {
          onTapRef.current?.(touchStartRef.current.x, touchStartRef.current.y);
          lastTapRef.current = now;
        }
      }

      if (e.touches.length === 0 && initialPinchDistanceRef.current > 0) {
        // `e.changedTouches` only has the LAST-lifted finger at this point
        // (the other one already ended in a prior touchend event), so pair
        // it against the last-known two-finger positions instead of
        // self-pairing it (which always yields a distance of 0).
        const last = lastTwoTouchesRef.current;
        if (last) {
          const currentDistance = getDistance(
            { clientX: last.x1, clientY: last.y1 },
            { clientX: last.x2, clientY: last.y2 },
          );
          onPinchRef.current?.(
            currentDistance / initialPinchDistanceRef.current,
            currentDistance,
          );
        }
        initialPinchDistanceRef.current = 0;
      }

      if (e.touches.length === 0 && initialRotationRef.current !== 0) {
        const last = lastTwoTouchesRef.current;
        if (last) {
          const currentAngle = getAngle(
            { clientX: last.x1, clientY: last.y1 },
            { clientX: last.x2, clientY: last.y2 },
          );
          onRotateRef.current?.(currentAngle - initialRotationRef.current);
        }
        initialRotationRef.current = 0;
      }

      if (e.touches.length === 0) {
        lastTwoTouchesRef.current = null;
      }

      touchStartRef.current = null;
    };

    const handleTouchCancel = () => {
      // OS/browser gesture takeover interrupted the touch sequence — reset
      // all tracked state without firing any callback, matching the "quick
      // taps don't fire" contract. Without this, stale pinch/rotation refs
      // survive into the next unrelated tap and spuriously fire onPinch /
      // onRotate for it.
      touchStartRef.current = null;
      initialPinchDistanceRef.current = 0;
      initialRotationRef.current = 0;
      lastTwoTouchesRef.current = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (preventDefault) e.preventDefault();
      touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!touchStartRef.current) return;
      if (preventDefault) e.preventDefault();
      const deltaX = Math.abs(e.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(e.clientY - touchStartRef.current.y);
      if (deltaX < tapMovementThreshold && deltaY < tapMovementThreshold) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        if (onDoubleTapRef.current && timeSinceLastTap < doubleTapDelay) {
          onDoubleTapRef.current(
            touchStartRef.current.x,
            touchStartRef.current.y,
          );
          lastTapRef.current = 0;
        } else {
          onTapRef.current?.(touchStartRef.current.x, touchStartRef.current.y);
          lastTapRef.current = now;
        }
      }
      touchStartRef.current = null;
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
    element.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchCancel);
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("mouseup", handleMouseUp);
    };
  }, [ref, doubleTapDelay, tapMovementThreshold, preventDefault]);
}
