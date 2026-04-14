import type { ReactNode } from "react";
import { Text, Span } from "./Typography";
import { THEME_CONSTANTS } from "../../tokens";

const { themed, flex } = THEME_CONSTANTS;

export interface FlowStep {
  emoji: string;
  /** Full Tailwind class string for the circle background + border. */
  circleClass: string;
  /** Step name rendered as medium Text (title+badge style). */
  title?: string;
  /** Short status badge label. */
  badge?: string;
  /** Full Tailwind class string for the badge background + text colors. */
  badgeClass?: string;
  /** Description rendered below the badge (badge+desc style). */
  desc?: string;
}

export interface FlowDiagramProps {
  /** Header title including any emoji prefix. */
  title: string;
  /** Tailwind color classes for the header title text. Defaults to text-primary. */
  titleClass?: string;
  /** Tailwind bg class for the horizontal connectors between steps. */
  connectorClass: string;
  steps: FlowStep[];
  /** Width class applied to every step column. Defaults to "w-[86px]". */
  stepWidth?: string;
  /** Centers the step chain instead of making it horizontally scrollable. */
  centered?: boolean;
  /** Optional note strip rendered at the very bottom of the diagram body. */
  note?: string;
  className?: string;
  /** Slot rendered inside the body, between the step chain and the note strip. */
  children?: ReactNode;
}

export function FlowDiagram({
  title,
  titleClass = "text-primary",
  connectorClass,
  steps,
  stepWidth = "w-[86px]",
  centered = false,
  note,
  className = "",
  children,
}: FlowDiagramProps) {
  return (
    <div
      className={`rounded-2xl border ${themed.border} overflow-hidden ${className}`}
    >
      <div
        className={`${themed.bgSecondary} px-5 py-3 border-b ${themed.border}`}
      >
        <Text weight="semibold" size="sm" className={titleClass}>
          {title}
        </Text>
      </div>
      <div className={`${themed.bgPrimary} p-5`}>
        <div
          className={
            centered
              ? "flex justify-center items-start gap-1.5 mb-4"
              : "flex items-start overflow-x-auto pb-3 gap-1.5 scroll-smooth"
          }
        >
          {steps.flatMap((step, i) => {
            const nodes: ReactNode[] = [
              <div
                key={`s-${i}`}
                className={`shrink-0 flex flex-col items-center text-center gap-1 ${stepWidth}`}
              >
                <div
                  className={`w-12 h-12 rounded-full ${step.circleClass} ${flex.center} text-xl`}
                >
                  {step.emoji}
                </div>
                {step.title && (
                  <Text size="xs" weight="medium" className="leading-tight">
                    {step.title}
                  </Text>
                )}
                {step.badge && step.badgeClass && (
                  <Span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${step.badgeClass}`}
                  >
                    {step.badge}
                  </Span>
                )}
                {step.desc && (
                  <Text size="xs" variant="secondary" className="leading-tight">
                    {step.desc}
                  </Text>
                )}
              </div>,
            ];
            if (i < steps.length - 1) {
              nodes.push(
                <div
                  key={`c-${i}`}
                  className={`shrink-0 self-start h-0.5 w-5 ${connectorClass} mt-6`}
                />,
              );
            }
            return nodes;
          })}
        </div>
        {children}
        {note && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
            <Text size="xs" variant="secondary">
              {note}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
