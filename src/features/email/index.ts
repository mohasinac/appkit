/**
 * Public surface for the email-primitive module.
 *
 * Server-side only — these components render to static HTML via
 * `renderToStaticMarkup`. They emit table-based, inline-styled markup that
 * email clients render correctly.
 */
export {
  // Was MISSING from this barrel, so both consumers reached past it into
  // ./primitives directly — a workaround that reads as intentional and
  // quietly says "the barrel is not the public surface after all".
  EmailBold,
  EmailButton,
  EmailColumn,
  EmailContainer,
  EmailDivider,
  EmailDoc,
  EmailFooter,
  EmailHeader,
  EmailImage,
  EmailLink,
  EmailRow,
} from "./primitives";
export type {
  EmailButtonProps,
  EmailColumnProps,
  EmailContainerProps,
  EmailDividerProps,
  EmailDocProps,
  EmailFooterProps,
  EmailHeaderProps,
  EmailImageProps,
  EmailLinkProps,
  EmailRowProps,
  EmailTone,
} from "./primitives";
