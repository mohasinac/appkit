import React from "react";
import { Li, Ul } from "./Semantic";
import { Row } from "./Layout";
import { Span } from "./Typography";

export interface PasswordStrengthIndicatorProps {
  password: string;
  minLength?: number;
  showRequirements?: boolean;
  labels?: {
    weak?: string;
    fair?: string;
    good?: string;
    strong?: string;
  };
}

export function PasswordStrengthIndicator({
  password,
  minLength = 8,
  showRequirements = true,
  labels,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const requirements = [
    {
      label: `At least ${minLength} characters`,
      met: password.length >= minLength,
    },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
  ];

  const metCount = requirements.filter((req) => req.met).length;
  const strength = (metCount / requirements.length) * 100;

  const strengthLabel =
    strength <= 25
      ? (labels?.weak ?? "Weak")
      : strength <= 50
        ? (labels?.fair ?? "Fair")
        : strength <= 75
          ? (labels?.good ?? "Good")
          : (labels?.strong ?? "Strong");

  const strengthColor =
    strength <= 25
      ? "bg-red-500"
      : strength <= 50
        ? "bg-orange-500"
        : strength <= 75
          ? "bg-yellow-500"
          : "bg-green-500";

  return (
    <div
      className="appkit-password-strength"
      aria-live="polite"
      aria-atomic="true"
     data-section="passwordstrengthindicator-div-567">
      <Row gap="sm" className="mb-2">
        <div className="appkit-password-strength__track" data-section="passwordstrengthindicator-div-568">
          <div
            className={`appkit-password-strength__fill ${strengthColor}`}
            style={{ width: `${strength}%` }}
            role="progressbar"
            aria-valuenow={Math.round(strength)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Password strength: ${strengthLabel}`}
          />
        </div>
        <Span className="appkit-password-strength__label">{strengthLabel}</Span>
      </Row>

      {showRequirements ? (
        <Ul className="appkit-password-strength__requirements">
          {requirements.map((req) => (
            <Li
              key={req.label}
              className={`appkit-password-strength__requirement ${req.met ? "appkit-password-strength__requirement--met" : ""}`}
            >
              <Span className="sr-only">{req.met ? "Met: " : "Not met: "}</Span>
              {req.label}
            </Li>
          ))}
        </Ul>
      ) : null}
    </div>
  );
}
