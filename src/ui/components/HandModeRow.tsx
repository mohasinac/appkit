"use client";

import { Row, type RowProps } from "./Layout";
import { useHandMode } from "../../_internal/client/hand-mode";

/**
 * HandModeRow — a `<Row>` that mirrors (flex-row-reverse) in left-hand mode.
 *
 * `<Row>` itself stays a plain server-safe primitive (no hooks) so it can
 * keep rendering inside async Server Components. This thin client wrapper
 * exists specifically for header rows (title + "View All" CTA) that live
 * inside Server Component sections and still need to flip sides with the
 * hand-mode preference — render it as a child of the server component
 * instead of calling `useHandMode()` in the server component itself.
 */
export function HandModeRow(props: RowProps) {
  const { hand } = useHandMode();
  return <Row reverse={hand === "left"} {...props} />;
}
