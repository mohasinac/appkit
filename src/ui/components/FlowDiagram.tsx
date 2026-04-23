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
    <div className={`appkit-flow-diagram ${themed.border} ${className}`} data-section="flowdiagram-div-496">
      <div
        className={`appkit-flow-diagram__header ${themed.bgSecondary} ${themed.border}`}
       data-section="flowdiagram-div-497">
        <Text weight="semibold" size="sm" className={titleClass}>
          {title}
        </Text>
      </div>
      <div className={`appkit-flow-diagram__body ${themed.bgPrimary}`} data-section="flowdiagram-div-498">
        <div
          className={`appkit-flow-diagram__chain ${centered ? "appkit-flow-diagram__chain--centered" : "appkit-flow-diagram__chain--scroll"}`}
         data-section="flowdiagram-div-499">
          {steps.flatMap((step, i) => {
            const nodes: ReactNode[] = [
              <div
                key={`s-${i}`}
                className={`appkit-flow-diagram__step ${stepWidth}`}
               data-section="flowdiagram-div-500">
                <div
                  className={`appkit-flow-diagram__circle ${step.circleClass}`}
                 data-section="flowdiagram-div-501">
                  {step.emoji}
                </div>
                {step.title && (
                  <Text size="xs" weight="medium" className="leading-tight">
                    {step.title}
                  </Text>
                )}
                {step.badge && step.badgeClass && (
                  <Span
                    className={`appkit-flow-diagram__badge ${step.badgeClass}`}
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
                  className={`appkit-flow-diagram__connector ${connectorClass}`}
                />,
              );
            }
            return nodes;
          })}
        </div>
        {children}
        {note && (
          <div className="appkit-flow-diagram__note" data-section="flowdiagram-div-502">
            <Text size="xs" variant="secondary">
              {note}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
