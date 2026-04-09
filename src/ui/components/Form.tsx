import React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

/**
 * Semantic `<form>` wrapper. Passes all standard form attributes through.
 * Use with `react-hook-form`:
 *
 * ```tsx
 * const { handleSubmit } = useForm();
 * <Form onSubmit={handleSubmit(onSubmit)}>
 *   <FormGrid>...</FormGrid>
 *   <Button type="submit">Submit</Button>
 * </Form>
 * ```
 */
export function Form({ children, className = "", ...props }: FormProps) {
  return (
    <form className={className} {...props}>
      {children}
    </form>
  );
}
