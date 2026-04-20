import { useEffect } from "react";
import { setupZodErrorMap } from "./zod-error-map";

export interface ZodSetupProps {
  locale?: string;
}

export function ZodSetup(_props: ZodSetupProps) {
  setupZodErrorMap();

  useEffect(() => {
    setupZodErrorMap();
  }, []);

  return null;
}

export default ZodSetup;
