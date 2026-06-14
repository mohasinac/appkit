/**
 * Public surface for the email-primitive module.
 *
 * Server-side only — these components render to static HTML via
 * `renderToStaticMarkup`. They emit table-based, inline-styled markup that
 * email clients render correctly.
 */
export {
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
