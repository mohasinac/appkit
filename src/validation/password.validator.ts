/**
 * Password Validation Utilities
 */

export interface PasswordStrength {
  score: number; // 0-4
  level: "too-weak" | "weak" | "fair" | "good" | "strong";
  feedback: string[];
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export function meetsPasswordRequirements(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS,
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (password.length < requirements.minLength)
    missing.push(`At least ${requirements.minLength} characters`);
  if (requirements.requireUppercase && !/[A-Z]/.test(password))
    missing.push("One uppercase letter");
  if (requirements.requireLowercase && !/[a-z]/.test(password))
    missing.push("One lowercase letter");
  if (requirements.requireNumbers && !/\d/.test(password))
    missing.push("One number");
  if (
    requirements.requireSpecialChars &&
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  )
    missing.push("One special character");
  return { valid: missing.length === 0, missing };
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length < 8) feedback.push("Password is too short");
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push("Avoid repeated characters");
  }
  if (/^(?:password|123456|qwerty)/i.test(password)) {
    score = 0;
    feedback.push("Avoid common passwords");
  }

  score = Math.min(4, Math.max(0, score));
  const levels = ["too-weak", "weak", "fair", "good", "strong"] as const;
  return { score, level: levels[score], feedback };
}

export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    "password",
    "123456",
    "123456789",
    "qwerty",
    "abc123",
    "monkey",
    "1234567",
    "letmein",
    "trustno1",
    "dragon",
    "baseball",
    "iloveyou",
    "master",
    "sunshine",
    "ashley",
    "bailey",
    "passw0rd",
    "shadow",
    "123123",
    "654321",
  ];
  return commonPasswords.includes(password.toLowerCase());
}
