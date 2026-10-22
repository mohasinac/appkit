"use client";

/**
 * GroupMemberPicker — pick which members of a group you want, and how many of
 * each, then add the whole selection as ONE cart line.
 *
 * This is the "pick as you wish" half of the grouped-purchase model. Bundles
 * are the other half and deliberately do NOT use this: a bundle is priced as a
 * whole and is all-or-nothing, so its members render read-only and the only
 * stepper is the bundle's own copy count.
 *
 * Two mount points, one component: the "Part of: …" modal/drawer on a product
 * detail page, and the public `/groups/{slug}` page.
 *
 * The component talks to the API directly rather than taking an `onAdd` server
 * action prop. That keeps `ShowGroupSection`'s `renderGroupSection` slot
 * signature unchanged, which in turn leaves both detail-page views and both
 * consumer pages untouched.
 */

import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Div,
  GatedPrice,
  PricesOnly,
  Row,
  Span,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "../../../ui";
import { QuantityStepper } from "../../../ui/components/QuantityStepper";
import { MediaImage } from "../../media/MediaImage";
import { formatCurrency } from "../../../utils/number.formatter";
import { ACTIONS } from "../../../_internal/shared/actions/action-registry";
import { CART_ENDPOINTS } from "../../../constants/api-endpoints";
import { normalizeError } from "../../../errors/normalize";
import { pluginFor } from "../../../_internal/shared/listing-types/_registry";
import { normalizeListingType } from "../utils/listing-type";
import { resolveGroupMemberImage } from "../utils/group-member-image";
import {
  checkGroupRules,
  describeGroupRules,
  EMPTY_GROUP_RULES,
  type GroupRules,
} from "../../../_internal/shared/features/products/group-rules";
import type { ListingType } from "../types";
import { toUserMessage } from "../../../errors/error-display-map";

const __O = { xAuto: "overflow-x-auto", hidden: "overflow-hidden" } as const;

export interface GroupPickerMember {
  id: string;
  title: string;
  price: number;
  currency?: string;
  images?: string[];
  image?: string;
  slug?: string;
  listingType?: ListingType;
  isGroupParent?: boolean;
  condition?: string;
  availableQuantity?: number;
  /**
   * Printed or built when ordered — no stock ceiling.
   *
   * 🛑 Both the "Out of stock" refusal and the stepper's `max` read
   * `availableQuantity`, so without this a print-on-demand member at quantity 0
   * renders as unselectable while being perfectly buyable.
   */
  madeToOrder?: boolean;
  storeId?: string;
  storeName?: string;
  isSold?: boolean;
  status?: string;
}

export interface GroupMemberPickerProps {
  groupId: string;
  groupSource: "product-group" | "grouped-listing";
  members: GroupPickerMember[];
  /**
   * The group's own selection rules, from whichever home owns them.
   *
   * 🛑 Absent means UNRESTRICTED, which is what every group that exists today
   * is. The server enforces the same rules through `checkGroupRules` whatever
   * is passed here, so omitting them costs correctness nothing — the buyer just
   * finds out on submit instead of while choosing.
   */
  rules?: GroupRules;
  /** Called after a successful add so the host can close its overlay. */
  onAdded?: () => void;
  /** Called when the API reports the caller isn't signed in. */
  onAuthRequired?: () => void;
}

const memberImage = resolveGroupMemberImage;

function memberHref(m: GroupPickerMember): string {
  return pluginFor(normalizeListingType(m)).detailRoute(m.slug ?? m.id);
}

/** A member the buyer cannot choose, and the reason to show instead of a stepper. */
function blockedReason(m: GroupPickerMember): string | null {
  if (m.isSold) return "Sold";
  if (m.status && m.status !== "published") return "Unavailable";
  // Made to order has no stock to be out of — checked BEFORE the quantity
  // test, and after `isSold`, which stays the seller's kill switch whatever
  // the production model.
  if (m.madeToOrder !== true && (m.availableQuantity ?? 0) <= 0) return "Out of stock";
  // `cartLine: "blocked"` is how a classified / live listing says "contact the
  // seller instead" — those can never join a cart line.
  if (pluginFor(normalizeListingType(m)).cartLine === "blocked") return "Not purchasable here";
  return null;
}

export function GroupMemberPicker({
  groupId,
  groupSource,
  members,
  rules = EMPTY_GROUP_RULES,
  onAdded,
  onAuthRequired,
}: GroupMemberPickerProps) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A group whose members span sellers cannot become one cart line: storeId is
  // the order-splitting key and the key per-store add-ons, coupons, shipping and
  // payout all hang off. Rather than offer a button that always fails, the
  // picker stands down and the table stays read-only.
  const storeIds = useMemo(
    () => new Set(members.map((m) => m.storeId).filter(Boolean)),
    [members],
  );
  const isCrossStore = storeIds.size > 1;

  const selected = useMemo(
    () => members
      .map((m) => ({ member: m, quantity: qty[m.id] ?? 0 }))
      .filter((s) => s.quantity > 0),
    [members, qty],
  );
  const selectedTotal = selected.reduce(
    (sum, s) => sum + s.member.price * s.quantity,
    0,
  );
  const selectedUnits = selected.reduce((sum, s) => sum + s.quantity, 0);
  const currency = members[0]?.currency ?? "INR";

  /*
   * The SAME predicate the server applies, so the button's enabled state and
   * the API's answer cannot disagree about what a valid selection is. A
   * server-only rule reads as a broken button; a client-only one is not a rule.
   */
  const violations = useMemo(
    () =>
      checkGroupRules(
        rules,
        selected.map((s) => ({
          productId: s.member.id,
          quantity: s.quantity,
          title: s.member.title,
        })),
      ),
    [rules, selected],
  );

  /*
   * The discount, shown but NOT the number charged.
   *
   * 🛑 This is display arithmetic over a quoted percentage; the authoritative
   * price is computed server-side inside `deriveLinePrice`, the single writer
   * of a grouped line's `price`. Showing it here is honest (it is the figure
   * the buyer is being offered) and computing it here is unavoidable (there is
   * no cart line yet) — but it must never become a second money rule. The 2dp
   * rounding deliberately matches `deriveLinePrice`'s so the two agree to the
   * paisa rather than drifting by a rounding step.
   */
  const discountPercent = Math.min(100, Math.max(0, rules.groupDiscountPercent ?? 0));
  const discountedTotal =
    discountPercent > 0
      ? Math.round(selectedTotal * (1 - discountPercent / 100) * 100) / 100
      : selectedTotal;
  const ruleNotes = useMemo(() => describeGroupRules(rules), [rules]);

  const handleAdd = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(CART_ENDPOINTS.GROUP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          groupSource,
          // Ids and quantities only. Prices and titles are re-resolved on the
          // server — anything else would be a price-manipulation hole.
          members: selected.map((s) => ({ productId: s.member.id, quantity: s.quantity })),
        }),
      });
      if (res.status === 401) {
        onAuthRequired?.();
        return;
      }
      // `code` is the stable identifier the error envelope carries; `error` is
      // the server's own sentence and is deliberately no longer read here.
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        code?: string;
      };
      if (!res.ok || json.success === false) {
        setError(toUserMessage(json.code, undefined, { fallback: "Couldn't add those items to your cart." }));
        return;
      }
      setQty({});
      onAdded?.();
    } catch (err) {
      void normalizeError(err);
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Stack gap="sm">
      {isCrossStore && (
        <Alert variant="info">
          These items are sold by different sellers, so they can&apos;t be combined into
          one cart line. Open an item to buy it on its own.
        </Alert>
      )}
      <Div className={__O.xAuto}>
        <Table className="text-left min-w-[440px]">
          <Thead>
            <Tr border="default">
              <Th paddingY="sm" paddingSide="pr-sm" color="muted" size="xs" weight="semibold">Image</Th>
              <Th paddingY="sm" paddingSide="pr-sm" color="muted" size="xs" weight="semibold">Name</Th>
              <Th paddingY="sm" paddingSide="pr-sm" color="muted" size="xs" weight="semibold">Price</Th>
              {!isCrossStore && (
                <Th paddingY="sm" paddingSide="pr-sm" color="muted" size="xs" weight="semibold">Qty</Th>
              )}
              <Th paddingY="sm" paddingSide="pb-sm" color="muted" size="xs" weight="semibold"></Th>
            </Tr>
          </Thead>
          <Tbody>
            {members.map((m) => {
              const blocked = blockedReason(m);
              return (
                <Tr key={m.id} className="last:border-0" border="subtle">
                  <Td paddingSide="pr-sm" padding="xs-tall">
                    <Div className={`w-10 h-10 ${__O.hidden}`} rounded="full" border="default">
                      <MediaImage src={memberImage(m)} alt={m.title} size="thumbnail" />
                    </Div>
                  </Td>
                  <Td paddingSide="pr-sm" padding="xs-tall">
                    <Text className="line-clamp-2" color="primary" size="sm" weight="medium">
                      {m.title}
                    </Text>
                    {m.isGroupParent && (
                      <Span weight="semibold" className="text-[10px] text-[var(--appkit-color-primary)]">
                        Parent
                      </Span>
                    )}
                  </Td>
                  <Td paddingSide="pr-sm" padding="xs-tall">
                    <Text size="sm" color="muted">
                      <GatedPrice>{formatCurrency(m.price, m.currency ?? currency)}</GatedPrice>
                    </Text>
                  </Td>
                  {!isCrossStore && (
                    <Td paddingSide="pr-sm" padding="xs-tall">
                      {blocked ? (
                        <Span size="xs" color="muted" surface="muted" rounded="default" padding="pill-2xs">
                          {blocked}
                        </Span>
                      ) : (
                        <QuantityStepper
                          value={qty[m.id] ?? 0}
                          onChange={(next) => setQty((prev) => ({ ...prev, [m.id]: next }))}
                          min={0}
                          /*
                           * `undefined` means uncapped — `QuantityStepper`
                           * only disables its increment when a `max` is given.
                           * A made-to-order member has no ceiling; the line's
                           * own 99-per-line cap still applies at the cart.
                           */
                          max={m.madeToOrder === true ? undefined : m.availableQuantity}
                          ariaLabel={`Quantity for ${m.title}`}
                          decrementLabel={ACTIONS.CART["decrease-quantity"].ariaLabel}
                          incrementLabel={ACTIONS.CART["increase-quantity"].ariaLabel}
                        />
                      )}
                    </Td>
                  )}
                  <Td padding="xs-tall">
                    <a
                      href={memberHref(m)}
                      className="text-[length:var(--appkit-text-xs)] text-[var(--appkit-color-primary)] hover:underline"
                    >
                      View →
                    </a>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Div>

      {!isCrossStore && (
        <>
          {/* The rules, stated BEFORE the buyer chooses. A "pick at least 3"
            * discovered only on submit is a rule they have to re-do their
            * selection around. Renders nothing when nothing is restricted. */}
          {ruleNotes.length > 0 && (
            <Text size="xs" color="muted">
              {ruleNotes.join(" · ")}
            </Text>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {/* Every violation at once, unlike the server, which throws on the
            * first. A form lists what to fix; an API answers one reason. Shown
            * only once something is selected — an empty selection violating
            * "pick at least 3" is not a mistake, it is the starting state. */}
          {selectedUnits > 0 && violations.length > 0 && (
            <Alert variant="warning">
              <Stack gap="dense">
                {violations.map((v) => (
                  <Text key={v.code + v.message} size="sm">
                    {v.message}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          <Row justify="between" align="center" gap="sm" className="min-w-0">
            <Text size="sm" color="muted">
              {selectedUnits > 0
                ? `${selectedUnits} item${selectedUnits === 1 ? "" : "s"}`
                : "Nothing selected yet"}
              {selectedUnits > 0 && (
                <PricesOnly>
                  {discountPercent > 0
                    ? ` · ${formatCurrency(discountedTotal, currency)} (${discountPercent}% off ${formatCurrency(selectedTotal, currency)})`
                    : ` · ${formatCurrency(selectedTotal, currency)}`}
                </PricesOnly>
              )}
            </Text>
            <Button
              action={ACTIONS.CART["add-group-to-cart"]}
              disabled={selectedUnits === 0 || violations.length > 0}
              isLoading={isSaving}
              onClick={handleAdd}
            />
          </Row>
        </>
      )}
    </Stack>
  );
}
