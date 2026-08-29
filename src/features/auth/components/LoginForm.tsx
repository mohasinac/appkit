"use client"
import { normalizeError } from "../../../errors/normalize";
import React, { useState } from "react";
import { Alert, Button, Div, Heading, Row, SiteMark, Stack, Text, useToast } from "../../../ui";
import { Form } from "../../../ui/components/Form";
import { FieldInput } from "../../../ui/forms/FieldInput";
import { FieldCheckbox } from "../../../ui/forms/FieldCheckbox";
import { applyZodIssues } from "../../../ui/forms/apply-zod-issues";
import { loginSchema } from "../schemas";
import { SocialAuthButtons } from "./SocialAuthButtons";
import { FormErrorSummary } from "../../../ui/forms/FormErrorSummary";

/*
 * 🛑 There is deliberately no `rememberMe`.
 *
 * The form used to collect one and nothing consumed it: a repo-wide grep found
 * six references, all inside this file. It never reached `onSubmit`'s caller,
 * it was absent from `loginSchema`, and `useLogin` reads only email and
 * password. So the checkbox made a promise about session lifetime that the app
 * did not keep.
 *
 * Deleted rather than implemented: making it real means changing session
 * persistence, which is a deliberate decision about how long a stolen cookie
 * stays valid — not something to infer from an orphaned control. Same call as
 * the bulk-cancel action whose onClick only called clearSelection().
 */
export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  labels?: {
    title?: string;
    subtitle?: string;
    signInLink?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    passwordLabel?: string;
    passwordPlaceholder?: string;
    forgotPasswordLabel?: string;
    submitLabel?: string;
    submittingLabel?: string;
    orSeparator?: string;
  };
  renderSocialButtons?: () => React.ReactNode;
  renderCreateAccountLink?: () => React.ReactNode;
  renderForgotPasswordLink?: () => React.ReactNode;
  className?: string;
}

export function LoginForm({
  onSubmit,
  onGoogleLogin,
  isLoading = false,
  error,
  labels = {},
  renderSocialButtons,
  renderCreateAccountLink,
  renderForgotPasswordLink,
  className = "",
}: LoginFormProps) {
  const { showToast } = useToast();
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });

  return (
    <Row className={`min-h-[60vh] ${className}`} align="center" justify="center" padding="x-md">
      <Stack className="max-w-md w-full" gap="lg">
        <Div className="text-center">
          <Row justify="center" className="mb-3">
            <SiteMark size="lg" />
          </Row>
          <Heading level={1} className="font-extrabold" size="3xl">
            {labels.title ?? "Sign In"}
          </Heading>
          {(labels.subtitle || renderCreateAccountLink) && (
            <Text className="mt-2" color="muted" size="sm">
              {labels.subtitle ?? "Or"} {renderCreateAccountLink?.()}
            </Text>
          )}
        </Div>

        {error && (
          <Alert variant="error" compact>
            {error}
          </Alert>
        )}

        <Form schema={loginSchema}
          noValidate
          onSubmit={(e) => e.preventDefault()} spacing="md">
          {({ setFieldError, clearErrors }) => (
            <>
              <FormErrorSummary />
              <FieldInput
                name="email"
                label={labels.emailLabel ?? "Email address"}
                type="email"
                autoComplete="username"
                required
                placeholder={labels.emailPlaceholder ?? "you@example.com"}
                value={values.email}
                onChange={(v) => setValues({ ...values, email: v })}
              />
              <FieldInput
                name="password"
                label={labels.passwordLabel ?? "Password"}
                type="password"
                autoComplete="current-password"
                required
                placeholder={labels.passwordPlaceholder ?? "••••••••"}
                value={values.password}
                onChange={(v) => setValues({ ...values, password: v })}
              />
              <Row justify="end">{renderForgotPasswordLink?.()}</Row>
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full"
                onClick={async () => {
                  clearErrors();
                  const parsed = loginSchema.safeParse(values);
                  if (!parsed.success) return applyZodIssues(parsed.error.issues, setFieldError);
                  try {
                    await onSubmit(values);
                  } catch (err) {
                    void normalizeError(err);
                    showToast("Sign in failed", "error");
                  }
                }}
              >
                {isLoading
                  ? (labels.submittingLabel ?? "Signing in…")
                  : (labels.submitLabel ?? "Sign in")}
              </Button>
            </>
          )}
        </Form>

        {onGoogleLogin && !renderSocialButtons ? (
          <SocialAuthButtons
            onGoogle={onGoogleLogin}
            disabled={isLoading}
            dividerLabel={labels.orSeparator ?? "Or continue with"}
            googleLabel="Sign in with Google"
          />
        ) : (
          renderSocialButtons?.()
        )}
      </Stack>
    </Row>
  );
}
