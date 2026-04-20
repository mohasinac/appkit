import React, { useEffect, useRef, useState } from "react";
import { THEME_CONSTANTS } from "../../../tokens";
import { Button, Div, Grid, Heading, Section, Text } from "../../../ui";

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
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Step number watermark */}
      <div
        className="absolute top-4 right-5 font-display text-7xl bg-gradient-to-br from-primary to-cobalt opacity-10 bg-clip-text text-transparent select-none pointer-events-none leading-none"
        aria-hidden="true"
      >
        {step.number}
      </div>

      {/* Visible index badge */}
      <div
        className={`relative z-10 w-10 h-10 rounded-full ${badgeBg} text-white font-bold text-sm flex items-center justify-center mb-5 shadow-md`}
      >
        {step.number}
      </div>

      {/* Icon */}
      {step.renderIcon && (
        <div
          className={`relative z-10 w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mb-4 border border-white/80 dark:border-slate-700/50`}
        >
          <span className={`${iconColor}`} aria-hidden="true">
            {step.renderIcon({ className: "w-6 h-6" })}
          </span>
        </div>
      )}

      {/* Text */}
      <Heading
        level={3}
        className={`relative z-10 text-base font-semibold ${THEME_CONSTANTS.themed.textPrimary} mb-2`}
      >
        {step.title}
      </Heading>
      <Text
        className={`relative z-10 text-sm ${THEME_CONSTANTS.themed.textSecondary} leading-relaxed`}
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
  const { themed } = THEME_CONSTANTS;
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
      className={`p-8 ${themed.bgPrimary} ${className}`}
    >
      <Div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {pillLabel && (
            <div className="inline-block mb-4 inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-5 py-1.5 text-xs font-medium tracking-[0.2em] uppercase text-primary-700 dark:text-primary-400 backdrop-blur-sm">
              {pillLabel}
            </div>
          )}

          <Heading
            level={2}
            className={`text-3xl md:text-4xl font-bold ${themed.textPrimary} mb-3`}
          >
            {title}
          </Heading>
          {subtitle && (
            <Text
              className={`text-base ${themed.textSecondary} max-w-xl mx-auto`}
            >
              {subtitle}
            </Text>
          )}
        </div>

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
          <div
            className={`text-center transition-all duration-700 delay-500 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Button variant="primary" size="lg" onClick={onCtaClick}>
              {ctaLabel}
            </Button>
          </div>
        )}
      </Div>
    </Section>
  );
}
