/**
 * The buyer-policy consent record store (item 1.39).
 *
 * Deliberately tiny and append-only. Two operations, and nothing else:
 *
 *   `record()`  write a consent exactly once, at the moment it is given
 *   `findById()` read it back when an order is being placed against it
 *
 * 🛑 There is no `update()` and no `delete()`. A consent record that can be
 * edited is not evidence — the entire reason this is a separate document from
 * the order is that it must be writable before the order exists (the gateway
 * path takes consent pre-capture) and immutable afterwards. An amended
 * agreement is a new record with a new id.
 *
 * `attachOrders()` is the one exception and it is additive: it appends the
 * order ids the consent ended up covering, which is the join a dispute needs
 * and which cannot be known at write time. It never touches the clauses, the
 * hash, the version or the timestamp — the four fields that carry the meaning.
 */

import { getAdminDb } from "../../../providers/db-firebase";
import {
  BUYER_POLICY_CONSENTS_COLLECTION,
  type BuyerPolicyConsentDocument,
} from "../schemas/firestore";

export interface RecordBuyerPolicyConsentInput {
  uid: string;
  version: number;
  hash: string;
  clauses: { id: string; text: string }[];
  capturedOn: BuyerPolicyConsentDocument["capturedOn"];
}

export class BuyerPolicyConsentRepository {
  private get collection() {
    return getAdminDb().collection(BUYER_POLICY_CONSENTS_COLLECTION);
  }

  async record(
    input: RecordBuyerPolicyConsentInput,
  ): Promise<BuyerPolicyConsentDocument> {
    const ref = this.collection.doc();
    const doc: BuyerPolicyConsentDocument = {
      id: ref.id,
      uid: input.uid,
      version: input.version,
      hash: input.hash,
      clauses: input.clauses,
      capturedOn: input.capturedOn,
      acceptedAt: new Date(),
    };
    /*
     * `.create()`, not `.set()`. A generated id cannot collide in practice, but
     * the difference in intent is worth encoding: this document must never
     * overwrite an existing consent, and `.set()` is the call that would.
     */
    await ref.create(doc);
    return doc;
  }

  async findById(id: string): Promise<BuyerPolicyConsentDocument | null> {
    const snap = await this.collection.doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as BuyerPolicyConsentDocument;
  }

  /**
   * Append the orders this consent covered.
   *
   * Never allowed to fail the checkout: the authoritative copy of the consent
   * is already stamped on each order document, so this is the convenience
   * index, not the evidence. Callers log and continue.
   */
  async attachOrders(id: string, orderIds: string[]): Promise<void> {
    if (orderIds.length === 0) return;
    const existing = await this.findById(id);
    const merged = [...new Set([...(existing?.orderIds ?? []), ...orderIds])];
    await this.collection.doc(id).update({ orderIds: merged });
  }
}

export const buyerPolicyConsentRepository = new BuyerPolicyConsentRepository();
