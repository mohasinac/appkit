"use client"
import React, { useEffect, useRef, useState } from "react";
import { THEMED_TEXT_PRIMARY, THEMED_TEXT_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Button, Div, Grid, Heading, Row, Section, Span, Text } from "../../../ui";
// --- Constants ---------------------------------------------------------------

const CLS_VISIBLE = "opacity-100 translate-y-0";

// --- Types -------------------------------------------------------------------

export interface HowItWorksStep {
  number: number;
  title: string;
  desc: string;
  renderIcon?: (props: { className?: string }) => React.ReactNode;
  accentFrom?: string;
  iconColor?: string;
  iconBg?: string;
  badgeBg?: string;
}

export interface HowItWorksSectionProps {
  title: string;
  subtitle?: string;
  pillLabel?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  steps: HowItWorksStep[];
  className?: string;
}

// --- Single step card ---------------------------------------------------------

function StepCard({
  step,
  visible,
  delay,
}: {
  step: HowItWorksStep;
  visible: boolean;
  delay: number;
}) {
  const {
    badgeBg = "bg-primary",
    iconColor = "text-primary",
    iconBg = "bg-primary/5 dark:bg-primary/10",
  } = step;

  return (
    <div
      className={[
        "relative rounded-3xl p-8",
        "bg-white dark:bg-slate-900",
        "shadow-md group hover:-translate-y-2 hover:shadow-xl",
        "transition-all duration-300",
        visible ? CLS_VISIBLE : "opacity-0 translate-y-8",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
     data-section="howitworkssection-div-340">
      {/* Step number watermark */}
      <Span
        gradient="brand"
        size="7xl" family="display"
        className="absolute top-4 right-5 opacity-10 select-none pointer-events-none leading-none"
        aria-hidden="true"
      >
        {step.number}
      </Span>

      {/* Visible index badge */}
      <Row textWeight="bold" textSize="sm" 
        className={`relative z-10 w-10 h-10 ${badgeBg} text-white mb-5`} align="center" justify="center" rounded="full" shadow="md"
      >
        {step.number}
      </Row>

      {/* Icon */}
      {step.renderIcon && (
        <Row
          className={`relative z-10 w-14 h-14 ${iconBg} mb-4 border border-white/80 dark:border-slate-700/50`} align="center" justify="center" rounded="2xl"
        >
          <Span className={`${iconColor}`} aria-hidden="true">
            {step.renderIcon({ className: "w-6 h-6" })}
          </Span>
        </Row>
      )}

      {/* Text */}
      <Heading
        level={3}
        className={`relative z-10 ${THEMED_TEXT_PRIMARY} mb-2`} size="base" weight="semibold"
      >
        {step.title}
      </Heading>
      <Text
        className={`relative z-10 ${THEMED_TEXT_SECONDARY} leading-relaxed`} size="sm"
      >
        {step.desc}
      </Text>
    </div>
  );
}

// --- Section -----------------------------------------------------------------

export function HowItWorksSection({
  title,
  subtitle,
  pillLabel,
  ctaLabel,
  onCtaClick,
  steps,
  className = "",
}: HowItWorksSectionProps) {
const themed = { textPrimary: THEMED_TEXT_PRIMARY, textSecondary: THEMED_TEXT_SECONDARY };
const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Section
      ref={sectionRef}
      className={`${className}`} surface="muted" padding="xl"
    >
      <Div className="max-w-6xl mx-auto">
        {/* Header */}
        <Div
          className={`text-center mb-12 transition-all duration-700 ${
 visible ? CLS_VISIBLE : "opacity-0 translate-y-4"
 }`}
        >
          {pillLabel && (
            <Div layout="inline-flex" gap="2" align="center" textWeight="medium" textSize="xs" className="mb-4 border border-primary-500/30 bg-primary-500/10 py-1.5 tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm" padding="x-md" rounded="full">
              {pillLabel}
            </Div>
          )}

          <Heading
            level={2}
            className={`${themed.textPrimary} mb-3`} size="3xl" mdSize="4xl" weight="bold"
          >
            {title}
          </Heading>
          {subtitle && (
            <Text
              className={`${themed.textSecondary} max-w-xl mx-auto`} size="base"
            >
              {subtitle}
            </Text>
          )}
        </Div>

        {/* Steps */}
        <Grid
          gap="lg"
          className="grid-cols-1 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 mb-10"
        >
          {steps.map((step, i) => (
            <StepCard
              key={step.number}
              step={step}
              visible={visible}
              delay={i * 150}
            />
          ))}
        </Grid>

        {/* CTA */}
        {ctaLabel && onCtaClick && (
          <Div
            className={`text-center transition-all duration-700 delay-500 ${
 visible ? CLS_VISIBLE : "opacity-0 translate-y-4"
 }`}
          >
            <Button variant="primary" size="lg" onClick={onCtaClick}>
              {ctaLabel}
            </Button>
          </Div>
        )}
      </Div>
    </Section>
  );
}
