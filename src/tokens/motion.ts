/**
 * Motion presets — reusable animation configs for motion/react components.
 *
 * All presets respect `prefers-reduced-motion` via the `useReducedMotion` hook
 * in the consuming component wrappers (Motion.tsx).
 */

import type { Transition } from "motion/react";

export const SPRING_SNAPPY: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
};

export const EASE_OUT: Transition = {
  type: "tween",
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.3,
};

export const MOTION_PRESETS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: EASE_OUT,
  },
  fadeInDown: {
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
    transition: EASE_OUT,
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: SPRING_SNAPPY,
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: SPRING_SNAPPY,
  },
  slideInLeft: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: SPRING_SNAPPY,
  },
  slideInRight: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
    transition: SPRING_SNAPPY,
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: SPRING_GENTLE,
  },
  pressScale: {
    whileTap: { scale: 0.97 },
    transition: { duration: 0.1 },
  },
  hoverLift: {
    whileHover: { y: -2 },
    transition: SPRING_SNAPPY,
  },
  hoverScale: {
    whileHover: { scale: 1.02 },
    transition: SPRING_SNAPPY,
  },
  stagger: {
    transition: { staggerChildren: 0.05 },
  },
  staggerSlow: {
    transition: { staggerChildren: 0.1 },
  },
} as const;

export type MotionPreset = keyof typeof MOTION_PRESETS;
