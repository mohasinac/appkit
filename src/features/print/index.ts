/*
 * The print feature's surface — physical labels and printable documents.
 *
 * Everything here is a Client Component or a pure isomorphic helper, so unlike
 * `features/inventory` there is no `firebase-admin` reachability hazard. It is
 * still not re-exported from `appkit/src/index.ts`: nothing in the consumer
 * imports it through a barrel, and adding a re-export for convenience is what
 * Root Cause #18 is about.
 *
 * @tag domain:print
 * @tag layer:feature
 * @tag access:client
 */

export {
  LabelPageStyle,
  LabelSheet,
  ProductLabel,
  BoxLabel,
  BoxContentsSheet,
  PrintScaleWarning,
  mmToCssPx,
  moduleWidthPx,
} from "./components/labels";
export type {
  ProductLabelData,
  BoxLabelData,
  BoxContentsRow,
} from "./components/labels";

export { LabelProfilePicker } from "./components/LabelProfilePicker";
export type { LabelProfilePickerProps } from "./components/LabelProfilePicker";

export { BoxLabelPrintView } from "./components/BoxLabelPrintView";
export type {
  BoxLabelPrintViewProps,
  PrintableBox,
} from "./components/BoxLabelPrintView";
