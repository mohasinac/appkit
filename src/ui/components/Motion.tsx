"use client";

import React from "react";
import {
  motion,
  useReducedMotion,
  AnimatePresence as MotionAnimatePresence,
} from "motion/react";
import type { HTMLMotionProps, Transition } from "motion/react";
import { MOTION_PRESETS, SPRING_SNAPPY, EASE_OUT } from "../../tokens/motion";
import type { MotionPreset } from "../../tokens/motion";

// Re-export AnimatePresence for consumer convenience
export const AnimatePresence = MotionAnimatePresence;

// ── Reduced motion helper ────────────────────────────────────────────────────

function useMotionProps(
  // audit-unknown-ok: Motion props passthrough — framer-motion props arbitrary
  props: Record<string, unknown>,
// audit-unknown-ok: Motion props passthrough — framer-motion props arbitrary
): Record<string, unknown> {
  const reduced = useReducedMotion();
  if (!reduced) return props;
  const { initial, animate, exit, whileHover, whileTap, whileInView, transition, ...rest } = props;
  return { ...rest, initial: false, animate: false };
}

// ── FadeIn ───────────────────────────────────────────────────────────────────

export interface FadeInProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
}

export function FadeIn({
  delay = 0,
  duration = 0.3,
  children,
  ...props
}: FadeInProps) {
  const motionProps = useMotionProps({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration, delay },
    ...props,
  });
  return <motion.div {...(motionProps as HTMLMotionProps<"div">)}>{children}</motion.div>;
}

// ── SlideUp ──────────────────────────────────────────────────────────────────

export interface SlideUpProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  delay?: number;
  distance?: number;
  children: React.ReactNode;
}

export function SlideUp({
  delay = 0,
  distance = 20,
  children,
  ...props
}: SlideUpProps) {
  const motionProps = useMotionProps({
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance },
    transition: { ...SPRING_SNAPPY, delay },
    ...props,
  });
  return <motion.div {...(motionProps as HTMLMotionProps<"div">)}>{children}</motion.div>;
}

// ── SlideIn ──────────────────────────────────────────────────────────────────

export interface SlideInProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  distance?: number;
  children: React.ReactNode;
}

const SLIDE_OFFSETS = {
  left: { x: -24, y: 0 },
  right: { x: 24, y: 0 },
  up: { x: 0, y: -20 },
  down: { x: 0, y: 20 },
};

export function SlideIn({
  direction = "left",
  delay = 0,
  distance,
  children,
  ...props
}: SlideInProps) {
  const offset = SLIDE_OFFSETS[direction];
  const scale = distance ? distance / Math.max(Math.abs(offset.x || 1), Math.abs(offset.y || 1)) : 1;
  const motionProps = useMotionProps({
    initial: { opacity: 0, x: offset.x * scale, y: offset.y * scale },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: offset.x * scale, y: offset.y * scale },
    transition: { ...SPRING_SNAPPY, delay },
    ...props,
  });
  return <motion.div {...(motionProps as HTMLMotionProps<"div">)}>{children}</motion.div>;
}

// ── ScaleIn ──────────────────────────────────────────────────────────────────

export interface ScaleInProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  delay?: number;
  children: React.ReactNode;
}

export function ScaleIn({
  delay = 0,
  children,
  ...props
}: ScaleInProps) {
  const motionProps = useMotionProps({
    ...MOTION_PRESETS.scaleIn,
    transition: { ...MOTION_PRESETS.scaleIn.transition, delay } as Transition,
    ...props,
  });
  return <motion.div {...(motionProps as HTMLMotionProps<"div">)}>{children}</motion.div>;
}

// ── Collapse ─────────────────────────────────────────────────────────────────

export interface CollapseProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  isOpen: boolean;
  children: React.ReactNode;
}

export function Collapse({ isOpen, children, ...props }: CollapseProps) {
  const reduced = useReducedMotion();
  return (
    <MotionAnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={reduced ? false : { height: 0, opacity: 0, overflow: "hidden" }}
          animate={{ height: "auto", opacity: 1, overflow: "hidden" }}
          exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          transition={EASE_OUT}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </MotionAnimatePresence>
  );
}

// ── PressScale ───────────────────────────────────────────────────────────────

export interface PressScaleProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  scale?: number;
  children: React.ReactNode;
}

export function PressScale({
  scale = 0.97,
  children,
  ...props
}: PressScaleProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      whileTap={reduced ? undefined : { scale }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── HoverLift ────────────────────────────────────────────────────────────────

export interface HoverLiftProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  lift?: number;
  children: React.ReactNode;
}

export function HoverLift({
  lift = 2,
  children,
  ...props
}: HoverLiftProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -lift }}
      transition={SPRING_SNAPPY}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedList ─────────────────────────────────────────────────────────────

export interface AnimatedListProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  staggerDelay?: number;
  children: React.ReactNode;
}

export function AnimatedList({
  staggerDelay = 0.05,
  children,
  ...props
}: AnimatedListProps) {
  const reduced = useReducedMotion();
  const items = React.Children.toArray(children);

  return (
    <motion.div {...props}>
      {items.map((child, i) => (
        <motion.div
          key={React.isValidElement(child) ? (child.key ?? i) : i}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...EASE_OUT, delay: i * staggerDelay }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── AnimatedDiv / AnimatedStack / AnimatedRow ─────────────────────────────────

export interface AnimatedDivProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  delay?: number;
  children?: React.ReactNode;
}

export function AnimatedDiv({
  delay = 0,
  children,
  ...props
}: AnimatedDivProps) {
  const motionProps = useMotionProps({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, delay },
    ...props,
  });
  return <motion.div {...(motionProps as HTMLMotionProps<"div">)}>{children}</motion.div>;
}

export type AnimatedStackProps = AnimatedDivProps;

export function AnimatedStack({
  delay = 0,
  children,
  className,
  ...props
}: AnimatedStackProps) {
  const motionProps = useMotionProps({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, delay },
    ...props,
  });
  return (
    <motion.div
      {...(motionProps as HTMLMotionProps<"div">)}
      className={["flex flex-col gap-4", className].filter(Boolean).join(" ")}
    >
      {children}
    </motion.div>
  );
}

export type AnimatedRowProps = AnimatedDivProps;

export function AnimatedRow({
  delay = 0,
  children,
  className,
  ...props
}: AnimatedRowProps) {
  const motionProps = useMotionProps({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, delay },
    ...props,
  });
  return (
    <motion.div
      {...(motionProps as HTMLMotionProps<"div">)}
      className={["flex flex-row gap-4", className].filter(Boolean).join(" ")}
    >
      {children}
    </motion.div>
  );
}

// ── Draggable ───────────────────────────────────────────────────────────────

export interface DraggableProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  axis?: "x" | "y" | boolean;
  constraints?: { top?: number; right?: number; bottom?: number; left?: number } | React.RefObject<HTMLElement | null>;
  dragElastic?: number;
  children: React.ReactNode;
}

export function Draggable({
  axis,
  constraints,
  dragElastic = 0.1,
  children,
  ...props
}: DraggableProps) {
  const reduced = useReducedMotion();
  const drag = reduced ? false : (axis === true ? true : axis || true);
  return (
    <motion.div
      drag={drag}
      dragConstraints={constraints}
      dragElastic={dragElastic}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── Swipeable ───────────────────────────────────────────────────────────────

export interface SwipeableProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  children: React.ReactNode;
}

export function Swipeable({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  children,
  ...props
}: SwipeableProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      drag={reduced ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_e, info) => {
        if (info.offset.x < -threshold) onSwipeLeft?.();
        if (info.offset.x > threshold) onSwipeRight?.();
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
