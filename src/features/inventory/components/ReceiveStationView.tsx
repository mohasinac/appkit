"use client";

/**
 * The receive station — a scan loop that ends in one commit.
 *
 * A crate arrives, someone opens it, and for the next twenty minutes their
 * hands are full and their eyes are on the item, not the screen. Everything
 * here follows from that.
 *
 * THE LOOP:  scan `BOX-AC60-03` → that box is ARMED
 *            scan `LIR-DRAN-4F2A1` → one unit of that product staged into it
 *            scan it again → the same row increments
 *            scan another `BOX-…` → the armed box changes, rows keep theirs
 *            press Commit → the whole table lands in one transaction
 *
 * 🛑 ARMING IS WHAT MAKES THIS WORTH BUILDING. Thirty items into one box is
 * thirty-one scans, not sixty. A station that asked for the box every time
 * would be slower than a clipboard, which is what it is replacing.
 *
 * 🛑 RECEIVING NEVER TOUCHES `stockQuantity`. The shipment-link route already
 * does, and doing both double-counts. This answers "where is it", never "how
 * many exist".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Div,
  Heading,
  Row,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  TextLink,
  Th,
  Thead,
  Tr,
} from "../../../ui/index";
import { QuantityStepper } from "../../../ui/components/QuantityStepper";
import { FieldInput } from "../../../ui/forms";
import { Form } from "../../../ui/components/Form";
import { useToast } from "../../../ui/components/Toast";
import { apiClient } from "../../../http/index";
import { ADMIN_ENDPOINTS } from "../../../constants/api-endpoints";
import { ROUTES } from "../../../next/routing/route-map";
import { operatorMessage } from "./operator-message";
import { normalizeError } from "../../../errors/normalize";
import {
  trackError,
  ErrorCategory,
  ErrorSeverity,
} from "../../../monitoring/error-tracking";
import { MAX_RECEIVE_ROWS } from "../schemas/firestore";

/** A shipment item that can actually be received — i.e. one that is linked. */
export interface ReceivableItem {
  itemId: string;
  productId: string;
  productTitle: string;
  /**
   * 🛑 THE MACHINE KEY, and what a scan actually produces. `id-generators.ts`'s
   * reconciliation header is explicit that `barcodeId` is "what a CODE128
   * symbol encodes and what a scan resolves" while `sku` is the human key —
   * so a station indexed on `sku` alone would fail to recognise its own
   * printed labels. I built it that way first.
   */
  barcodeId: string | null;
  /** The human key. Accepted too, because an operator reads and types this. */
  sku: string | null;
  /** What the shipment says arrived, for the operator to count against. */
  expectedQuantity: number;
}

/** An item with no `linkedProductId` — nameable, but not receivable. */
export interface UnlinkedItem {
  itemId: string;
  lotId: string;
  title: string;
}

export interface BoxOption {
  id: string;
  code: string;
  location: string | null;
}

interface StagedRow {
  boxId: string;
  boxCode: string;
  productId: string;
  productTitle: string;
  /** Whichever code identified it — barcode preferred, SKU accepted. */
  code: string | null;
  quantity: number;
}

export interface ReceiveStationViewProps {
  shipmentId: string;
  shipmentNumber: string;
  items: ReceivableItem[];
  unlinked: UnlinkedItem[];
  boxes: BoxOption[];
  itemsFailed: boolean;
  boxesFailed: boolean;
}

/** `boxId::productId` — the staging table's natural key, mirroring `placementId`. */
function rowKey(boxId: string, productId: string): string {
  return `${boxId}::${productId}`;
}

export function ReceiveStationView({
  shipmentId,
  shipmentNumber,
  items,
  unlinked,
  boxes,
  itemsFailed,
  boxesFailed,
}: ReceiveStationViewProps) {
  const { showToast } = useToast();
  const [armed, setArmed] = useState<BoxOption | null>(null);
  const [rows, setRows] = useState<Record<string, StagedRow>>({});
  /*
   * 🛑 THE REF IS THE AUTHORITY; `rows` only renders.
   *
   * Two reasons, and the second is a correctness bug I wrote before noticing.
   *
   * 1. A scanner types faster than React re-renders. Two `LIR-…` scans can
   *    both submit before a single render commits, and a handler reading the
   *    state `rows` from its closure would see the pre-first-scan value for
   *    both — the second overwrites the first and one item silently vanishes
   *    from the table while the operator's echo says it landed twice.
   *
   * 2. A `setRows(prev => …)` updater does NOT run synchronously. It is
   *    evaluated during the next render, so `stage()` cannot learn from it
   *    whether it actually staged anything — a flag mutated inside the updater
   *    is still `false` when `stage()` returns, which made every refused scan
   *    report success.
   *
   * Writing the ref first and passing a plain value to `setRows` makes both
   * problems go away: the decision is always against the real current table.
   */
  const rowsRef = useRef<Record<string, StagedRow>>({});

  /** Mutates the authoritative table and schedules the render. */
  function applyRows(
    next: (current: Record<string, StagedRow>) => Record<string, StagedRow>,
  ): void {
    const computed = next(rowsRef.current);
    rowsRef.current = computed;
    setRows(computed);
  }
  const [scan, setScan] = useState("");
  const [committing, setCommitting] = useState(false);
  /** The in-flight guard. State renders the spinner; this prevents the second send. */
  const committingRef = useRef(false);
  /*
   * The last scan, echoed large. A toast per scan would be thirty toasts
   * stacked over the table, and the operator is not reading them — they need
   * one glance to confirm the beep meant something.
   */
  const [lastScan, setLastScan] = useState<{
    text: string;
    tone: "ok" | "bad";
  } | null>(null);
  const scanRef = useRef<HTMLInputElement | null>(null);

  /*
   * ONE index, keyed by both codes.
   *
   * `barcodeId` is what the symbol on the label encodes; `sku` is what is
   * printed beneath it in human-readable text. An operator with a peeled or
   * smudged label types the SKU, so refusing it would make the station useless
   * for exactly the items most likely to need typing. Both resolve to the same
   * product, so accepting both costs nothing and the ambiguity is only
   * apparent — the two formats cannot collide (`LIR-XXXXXXXX`, two segments
   * of fixed width, versus `LIR-TOKEN-SUFFIX`, three).
   */
  const byCode = useMemo(() => {
    const m = new Map<string, ReceivableItem>();
    for (const it of items) {
      if (it.barcodeId) m.set(it.barcodeId.toUpperCase(), it);
      if (it.sku) m.set(it.sku.toUpperCase(), it);
    }
    return m;
  }, [items]);

  /*
   * 🛑 Box codes are matched WITH AND WITHOUT the `BOX-` prefix.
   *
   * The stored `code` is `AC60-03` (`generateStorageBoxId` slugifies exactly
   * that) while the printed label's symbol encodes `BOX-AC60-03` — the prefix
   * exists so the station knows what KIND of thing it just read without a
   * lookup. Indexing only the stored spelling would mean the station does not
   * recognise the labels this project prints, which is the same mistake as
   * indexing items on `sku`.
   */
  const byBoxCode = useMemo(() => {
    const m = new Map<string, BoxOption>();
    for (const b of boxes) {
      const code = b.code.toUpperCase();
      m.set(code, b);
      m.set(`BOX-${code}`, b);
    }
    return m;
  }, [boxes]);

  const staged = Object.values(rows);
  const atCap = staged.length >= MAX_RECEIVE_ROWS;
  const totalUnits = staged.reduce((n, r) => n + r.quantity, 0);

  /*
   * 🛑 THE FIELD IS RE-FOCUSED AFTER EVERY SCAN AND EVERY ROW EDIT.
   *
   * A barcode scanner is a keyboard that types very fast and presses Enter.
   * If focus has moved — because the operator nudged a stepper, or a toast
   * took it, or they clicked the table — the barcode goes wherever focus is:
   * into a quantity box as digits, or nowhere at all. Nothing on screen says
   * so, and the operator has already put the item in the box. That is the
   * failure this effect exists to prevent, and it is why the dependency list
   * includes the row count.
   */
  useEffect(() => {
    scanRef.current?.focus();
  }, [lastScan, staged.length, armed?.id]);

  /**
   * Stages one unit, and REPORTS WHETHER IT DID.
   *
   * 🛑 THE RETURN VALUE IS THE POINT. This used to return void and bail with a
   * bare `return prev` at the cap, while every caller announced "+1 …" the
   * moment it had called — so a refused scan rendered as a successful one. At
   * a station where the operator trusts the echo instead of re-reading the
   * table, that is the single worst bug this screen could have: the item is
   * physically in the box and the record says it is not.
   *
   * The cap is checked against `rowsRef`, never the caller's `atCap`: that
   * value comes from the last render and a scanner fires two submits before
   * React commits one, so it is routinely a row stale. The ref is the only
   * authority. `atCap` survives solely to render the informational notice,
   * where being one render behind costs nothing.
   */
  function stage(item: ReceivableItem, box: BoxOption, by = 1): boolean {
    const key = rowKey(box.id, item.productId);
    const current = rowsRef.current;
    const existing = current[key];

    /*
     * 🛑 A REPEAT SCAN INCREMENTS; it does not add a second row. Twenty scans
     * of one product would otherwise be twenty rows, and the 50-row
     * transaction ceiling would be hit by a single item while the operator
     * thinks they have barely started. An increment is therefore allowed even
     * at the cap — it adds no row.
     */
    if (existing) {
      applyRows((c) => ({
        ...c,
        [key]: { ...existing, quantity: existing.quantity + by },
      }));
      return true;
    }

    // A NEW row at the cap is refused, and the caller is told so.
    if (Object.keys(current).length >= MAX_RECEIVE_ROWS) return false;

    applyRows((c) => ({
      ...c,
      [key]: {
        boxId: box.id,
        boxCode: box.code,
        productId: item.productId,
        productTitle: item.productTitle,
        code: item.barcodeId ?? item.sku,
        quantity: by,
      },
    }));
    return true;
  }

  /**
   * A box the prefetched list does not contain, resolved from the server.
   *
   * 🛑 THIS EXISTS BECAUSE THE PREFETCHED LIST IS CAPPED AT 50 (Rule #6 — every
   * list endpoint paginates). Without this, registering a 51st box produces a
   * station that reads its label, finds nothing, and says "unrecognised code"
   * about a box that plainly exists — the silent-ceiling failure this codebase
   * keeps paying for, where a bounded read is mistaken for the whole set.
   *
   * It runs only on a miss, so the common case stays instant and a box-arm is
   * roughly one scan in twenty anyway.
   */
  /*
   * Three outcomes, and the third is the point: `BoxOption` (found), `null`
   * (asked, no such box), `undefined` (could not ask). The caller used to see
   * only the first two and told the operator "No box registered as …" for a
   * network failure.
   */
  async function resolveBoxFromServer(
    code: string,
  ): Promise<BoxOption | null | undefined> {
    const bare = code.startsWith("BOX-") ? code.slice(4) : code;
    try {
      const res = await apiClient.get<{
        items?: { id: string; code: string; location?: string | null }[];
      }>(
        `${ADMIN_ENDPOINTS.INVENTORY_BOXES}?filters=code==${encodeURIComponent(bare)}&pageSize=1`,
      );
      const hit = res?.items?.[0];
      return hit
        ? { id: hit.id, code: hit.code, location: hit.location ?? null }
        : null;
    } catch (err) {
      /*
       * 🛑 The predecessor comment here claimed "a failed lookup must not
       * masquerade as 'no such box' — the caller distinguishes the two". It
       * could not: the success path returns `null` on a miss and this returned
       * the same `null`, so the two were indistinguishable by construction and
       * a network failure WAS reported to the operator as an unrecognised
       * code. That is the exact confusion the function's own header says it
       * exists to prevent.
       *
       * Classified and recorded rather than swallowed, and `undefined` now
       * means "could not ask" while `null` keeps meaning "asked, no such box".
       */
      const n = normalizeError(err);
      trackError(n.message, ErrorCategory.API, ErrorSeverity.MEDIUM, {
        component: "ReceiveStationView",
        action: "resolveBoxFromServer",
        metadata: { code: bare },
      });
      return undefined;
    }
  }

  async function handleScan(raw: string) {
    const code = raw.trim().toUpperCase();
    setScan("");
    if (!code) return;

    const box = byBoxCode.get(code);
    if (box) {
      setArmed(box);
      setLastScan({ text: `Armed ${box.code}`, tone: "ok" });
      return;
    }

    /*
     * A `BOX-` prefix is an unambiguous declaration of intent, so a miss here
     * is worth a round trip rather than an "unrecognised code" — the operator
     * is holding a box with a label this project printed.
     */
    if (code.startsWith("BOX-")) {
      const fetched = await resolveBoxFromServer(code);
      if (fetched) {
        setArmed(fetched);
        setLastScan({ text: `Armed ${fetched.code}`, tone: "ok" });
        return;
      }
      setLastScan(
        fetched === undefined
          ? {
              // "Could not ask" — never "does not exist". The operator is
              // holding the box; telling them it is unregistered sends them
              // to re-register something that is already in the system.
              text: `Could not check ${code.slice(4)} — connection problem, scan again`,
              tone: "bad",
            }
          : {
              text: `No box registered as ${code.slice(4)} — register it first`,
              tone: "bad",
            },
      );
      return;
    }

    const item = byCode.get(code);
    if (item) {
      if (!armed) {
        /*
         * 🛑 REFUSED, not staged into a guessed box. Defaulting to "the last
         * box" or "the only box" would put stock somewhere nobody chose, and
         * a placement is only worth having if it is where the thing actually
         * is. The operator loses one scan; a wrong shelf loses the item.
         */
        setLastScan({
          text: `No box armed — scan a box code before ${item.productTitle}`,
          tone: "bad",
        });
        return;
      }
      /*
       * 🛑 THE ECHO FOLLOWS WHAT `stage` ACTUALLY DID. There is no pre-check
       * against `atCap` here any more: that value comes from the last render
       * and a scanner outruns it, so a scan could be refused by `stage`'s
       * authoritative check and still echo "+1". `stage` owns the decision
       * and reports it; this only phrases it.
       */
      if (stage(item, armed)) {
        setLastScan({
          text: `+1 ${item.productTitle} → ${armed.code}`,
          tone: "ok",
        });
      } else {
        setLastScan({
          text: `Table is full at ${MAX_RECEIVE_ROWS} rows — commit, then carry on`,
          tone: "bad",
        });
      }
      return;
    }

    /*
     * 🛑 AN UNKNOWN CODE IS AN ERROR, NEVER A NO-OP. Clearing the field and
     * saying nothing is the worst available behaviour: the operator hears the
     * scanner beep, sees the field empty, and assumes it counted. This is the
     * one case that also gets a toast, because it is rare and does need eyes.
     */
    setLastScan({ text: `Unrecognised code: ${code}`, tone: "bad" });
    showToast(
      `${code} is not a box code or a SKU in this shipment. Check the label, or add the item by hand below.`,
      "error",
    );
  }

  async function commit() {
    /*
     * 🛑 SENT FROM THE REF, not the rendered `staged`. Pressing Commit
     * immediately after the last scan — which is exactly what an operator
     * does — can run this handler before the render carrying that scan has
     * committed, and the rendered array would then be one row short. The
     * dropped row is the last thing scanned, so it is also the one the
     * operator remembers putting in the box.
     */
    /*
     * 🛑 A REF GUARD, even though `<Button isLoading>` already sets
     * `disabled` and refuses its own click handler. Both of those read the
     * `committing` STATE, which is one render stale — and the cost of the gap
     * here is not a wasted request, it is the entire crate received twice,
     * with a second ledger row per item saying it arrived again. Two lines
     * against a double-counted shipment is not a close call.
     */
    if (committingRef.current) return;

    const sending = Object.values(rowsRef.current);
    if (sending.length === 0) return;
    committingRef.current = true;
    setCommitting(true);
    try {
      const res = await apiClient.post<{ rows: number; units: number }>(
        ADMIN_ENDPOINTS.INVENTORY_RECEIVE,
        {
          shipmentId,
          rows: sending.map((r) => ({
            boxId: r.boxId,
            productId: r.productId,
            quantity: r.quantity,
          })),
        },
      );
      /*
       * The SERVER's counts are quoted when it returns them. It is the only
       * party that knows what actually landed, and `sending` is merely what we
       * asked for — reporting our own request back as a result is how a UI
       * ends up confidently describing a write that differed.
       */
      const units = sending.reduce((n, r) => n + r.quantity, 0);
      showToast(
        `Received ${res?.units ?? units} units across ${res?.rows ?? sending.length} rows`,
        "success",
      );
      /*
       * 🛑 ONLY THE SENT ROWS ARE REMOVED — not the whole table.
       *
       * The scan field keeps focus through the request, so the operator
       * carries on scanning while it is in flight; that is the designed
       * behaviour, not an edge case. A blanket clear would throw those scans
       * away, and they are the ones nobody can reconstruct — the items are
       * already in the boxes and the echo said they counted.
       *
       * The quantity is compared, not just the key: a row scanned again
       * mid-flight has a HIGHER quantity than what was sent, so the delta has
       * to survive. Subtracting what was sent and keeping the remainder is the
       * only version that neither loses nor double-counts.
       *
       * Cleared only on success. A failed commit keeps the table exactly as it
       * was — the server refused as a unit, so nothing landed.
       */
      applyRows((c) => {
        const next = { ...c };
        for (const r of sending) {
          const key = rowKey(r.boxId, r.productId);
          const live = next[key];
          if (!live) continue;
          const remainder = live.quantity - r.quantity;
          if (remainder > 0) next[key] = { ...live, quantity: remainder };
          else delete next[key];
        }
        return next;
      });
      setLastScan({ text: "Committed. Carry on.", tone: "ok" });
    } catch (err) {
      // Normalized first: `operatorMessage` duck-types `.status`/`.code`/
      // `.message`, and the api/app branches of `NormalizedError` carry exactly
      // those three — so the 4xx passthrough still works and every other kind
      // correctly falls through to a constant instead of server text.
      showToast(operatorMessage(normalizeError(err)), "error");
    } finally {
      committingRef.current = false;
      setCommitting(false);
    }
  }

  return (
    <Stack gap="comfortable">
      <Div>
        <Heading level={1} size="2xl">
          Receive into boxes
        </Heading>
        <Text color="muted">
          Shipment {shipmentNumber}. Scan a box code to arm it, then scan items.
        </Text>
      </Div>

      {boxesFailed && (
        <Alert variant="warning">
          Could not load the box list. Scanning a box code will not arm
          anything until this page is reloaded — the list is unknown, not
          empty.
        </Alert>
      )}
      {itemsFailed && (
        <Alert variant="warning">
          Could not load this shipment&apos;s items. Scanning a SKU will not
          match anything until this page is reloaded.
        </Alert>
      )}
      {!boxesFailed && boxes.length === 0 && (
        <Alert variant="warning">
          There are no storage boxes registered yet. Register one before
          receiving — stock has to go somewhere named.
        </Alert>
      )}

      {/* The armed-box bar. Deliberately the loudest thing on the page:
          everything scanned next lands here, and an operator who has lost
          track of which box is armed will put twelve items on the wrong
          shelf before anything on screen contradicts them. */}
      <Card variant={armed ? "default" : "outlined"}>
        <CardBody>
          <Row align="center" justify="between" gap="md" wrap>
            <Div>
              <Text size="xs" color="muted" transform="uppercase">
                Armed box
              </Text>
              {armed ? (
                <Row align="center" gap="sm">
                  <Heading level={2} size="2xl">
                    {armed.code}
                  </Heading>
                  {armed.location && (
                    <Badge variant="info">{armed.location}</Badge>
                  )}
                </Row>
              ) : (
                <Heading level={2} size="xl" color="muted">
                  Nothing armed — scan a box code
                </Heading>
              )}
            </Div>
            {armed && (
              <Button variant="ghost" onClick={() => setArmed(null)}>
                Disarm
              </Button>
            )}
          </Row>
        </CardBody>
      </Card>

      <Card variant="default">
        <CardBody>
          {/*
            A real <Form>, so Enter submits natively. A scanner ends its
            transmission with Enter, which means the submit handler IS the
            scan handler — an `onChange` debounce would fire mid-barcode and
            try to resolve a prefix.
          */}
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              void handleScan(scan);
            }}
          >
            <FieldInput
              name="scan"
              label="Scan"
              // `inputRef`, not `ref` — see FieldInput's own note on why the
              // inner control is named rather than implied.
              inputRef={scanRef}
              value={scan}
              onChange={setScan}
              autoComplete="off"
              placeholder="BOX-… to arm a box · LIR-… to add an item"
              hint={
                armed
                  ? `Items scanned now go into ${armed.code}`
                  : "Scan a box code first"
              }
            />
          </Form>

          {lastScan && (
            <Div>
              <Text
                size="lg"
                weight="semibold"
                color={lastScan.tone === "ok" ? "success" : "error"}
                role="status"
                aria-live="polite"
              >
                {lastScan.text}
              </Text>
            </Div>
          )}
        </CardBody>
      </Card>

      <Card variant="default">
        <CardBody>
          <Row align="center" justify="between" wrap gap="sm">
            <Heading level={2} size="lg">
              Staged ({staged.length}/{MAX_RECEIVE_ROWS})
            </Heading>
            <Row align="center" gap="sm">
              <Text size="sm" color="muted">
                {totalUnits} unit{totalUnits === 1 ? "" : "s"}
              </Text>
              <Button
                variant="primary"
                isLoading={committing}
                disabled={staged.length === 0}
                onClick={() => void commit()}
              >
                Commit {staged.length > 0 ? `${staged.length} rows` : ""}
              </Button>
            </Row>
          </Row>

          {atCap && (
            <Alert variant="info">
              {MAX_RECEIVE_ROWS} rows is one transaction&apos;s worth. Commit
              these, then keep scanning — a bigger table would have to be
              written in pieces, and a half-received crate is worse than two
              commits.
            </Alert>
          )}

          {staged.length === 0 ? (
            <Text color="muted">
              Nothing staged. Scan a box, then scan items into it.
            </Text>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Box</Th>
                  <Th>Product</Th>
                  <Th>Code</Th>
                  <Th>Qty</Th>
                  <Th>Remove</Th>
                </Tr>
              </Thead>
              <Tbody>
                {staged.map((r) => {
                  const key = rowKey(r.boxId, r.productId);
                  return (
                    <Tr key={key}>
                      <Td>
                        <Badge variant="info">{r.boxCode}</Badge>
                      </Td>
                      <Td>{r.productTitle}</Td>
                      <Td>
                        <Text numeric size="sm">
                          {r.code ?? "—"}
                        </Text>
                      </Td>
                      <Td>
                        <QuantityStepper
                          value={r.quantity}
                          min={1}
                          max={9999}
                          // Many steppers on one page, so a bare "Quantity"
                          // names none of them.
                          ariaLabel={`Quantity of ${r.productTitle} for ${r.boxCode}`}
                          onChange={(n) =>
                            applyRows((c) => ({
                              ...c,
                              [key]: { ...c[key]!, quantity: n },
                            }))
                          }
                        />
                      </Td>
                      <Td>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            applyRows((c) => {
                              const next = { ...c };
                              delete next[key];
                              return next;
                            })
                          }
                        >
                          Remove
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/*
        The manual path. A scanner is the fast way, not the only way — a
        product that predates the SKU backfill has no code to scan, and a
        peeled label is normal. Without this the station is unusable for
        exactly the items most likely to need it.
      */}
      <Card variant="default">
        <CardBody>
          <Heading level={2} size="lg">
            Add by hand
          </Heading>
          {items.length === 0 ? (
            <Text color="muted">
              No linked items on this shipment yet.
            </Text>
          ) : (
            <Table>
              <Thead>
                <Tr>
                  <Th>Item</Th>
                  <Th>Scan code</Th>
                  <Th>Expected</Th>
                  <Th>Add</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((it) => (
                  <Tr key={it.itemId}>
                    <Td>{it.productTitle}</Td>
                    <Td>
                      {/*
                        🛑 Shows whichever code a scan WILL match, and says so
                        plainly when neither exists. Labelling this column
                        "SKU" and printing `sku` was wrong twice: the symbol on
                        the label encodes `barcodeId`, and an item with a
                        barcode but no SKU would have read "—" next to a button
                        that works — telling the operator to type it by hand
                        when scanning was available.
                      */}
                      <Text numeric size="sm">
                        {it.barcodeId ??
                          it.sku ??
                          "no code yet — add by hand, or run the SKU backfill"}
                      </Text>
                    </Td>
                    <Td>{it.expectedQuantity}</Td>
                    <Td>
                      <Button
                        variant="outline"
                        // Disabled only for the one condition that is stable
                        // between renders. The cap is `stage`'s call, and it
                        // reports — the same reasoning as the scan path.
                        disabled={!armed}
                        onClick={() => {
                          if (!armed) return;
                          const ok = stage(it, armed);
                          setLastScan(
                            ok
                              ? {
                                  text: `+1 ${it.productTitle} → ${armed.code}`,
                                  tone: "ok",
                                }
                              : {
                                  text: `Table is full at ${MAX_RECEIVE_ROWS} rows — commit first`,
                                  tone: "bad",
                                },
                          );
                        }}
                      >
                        {armed ? `Into ${armed.code}` : "Arm a box first"}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/*
        🛑 UNLINKED ITEMS ARE NAMED, NOT HIDDEN. A placement keys on
        `productId`, so an item with no `linkedProductId` genuinely cannot be
        received — but omitting it silently means the operator counts the
        crate, finds the station one item short of reality, and has no way to
        tell whether they miscounted or the screen is lying. Saying what is
        missing and why is the whole value here.
      */}
      {unlinked.length > 0 && (
        <Alert variant="warning">
          <Text weight="semibold">
            {unlinked.length} item{unlinked.length === 1 ? "" : "s"} cannot be
            received yet
          </Text>
          <Text size="sm">
            A box placement records a product, so each of these needs linking
            to a listing first:
          </Text>
          <Stack gap="xs">
            {unlinked.map((u) => (
              <Text key={u.itemId} size="sm">
                · {u.title} —{" "}
                <TextLink
                  href={String(
                    ROUTES.ADMIN.SHIPMENT_LOT_ITEMS(shipmentId, u.lotId),
                  )}
                >
                  link it in its lot
                </TextLink>
              </Text>
            ))}
          </Stack>
        </Alert>
      )}
    </Stack>
  );
}
