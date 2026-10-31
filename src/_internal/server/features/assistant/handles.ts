import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeError } from "../../../../errors/normalize";

/**
 * Per-turn, single-use, TTL'd, conversation-scoped references.
 *
 * A tool that touches anything PII-adjacent (A3) mints one of these instead of
 * putting a raw identifier — an address, an order id, a buyer name — into the
 * model's context. The model may paraphrase or echo the token in its final
 * answer; `turn.ts`'s rendering step resolves it back to the real value, or
 * fails the whole response if it does not resolve. See the plan's "Rendering
 * is a trust boundary" note.
 *
 * ## 🛑 Copied from the consumer app's `/api/media/ext` signer — with BOTH postures inverted
 *
 * That module is the shape to copy (HMAC-SHA256, length pre-check then
 * `timingSafeEqual`, one module owning the secret) and the shape to invert:
 *
 * - It fails OPEN — with its HMAC secret unset, verification returns
 *   `{ok: true, reason: "DISABLED"}` and unsigned requests pass. A handle
 *   registry with no secret configured must refuse to mint anything, full
 *   stop — `mint()` throws at construction time rather than emitting a token
 *   nothing can verify.
 * - Its signatures are reusable for the whole 60s replay window. Handles are
 *   SINGLE-USE: `resolve()` marks the entry consumed, and a second resolve of
 *   the same token fails even while it is otherwise still valid.
 *
 * ## 🛑 Lifetime is ONE `runAssistantTurn()` call, never a module-level singleton
 *
 * Cloud Functions reuse warm instances across invocations. A `HandleRegistry`
 * constructed fresh per turn and discarded when the turn ends means a stale
 * entry from a PRIOR conversation can never be looked up by a later one, even
 * on the same warm instance — there is no shared Map for it to survive in.
 * `turn.ts` constructs exactly one of these per call and never exports it.
 *
 * ## Two independent checks, not one
 *
 * The in-memory `store` alone would be enough IF the per-turn lifetime
 * guarantee always held. The HMAC is defense in depth for the case where it
 * doesn't — a registry accidentally promoted to module scope, a token copied
 * between conversations by a prompt-injection attempt, a future caller that
 * forgets the "construct fresh" rule above. `resolve()` requires BOTH the
 * signature to verify AND the token to be present, unconsumed, unexpired, and
 * scoped to this exact conversation + turn in this call's own `store`.
 *
 * @tag domain:assistant
 * @tag layer:server
 * @tag access:server
 * @tag sideEffects:none
 */

const SECRET_ENV = "ASSISTANT_HANDLE_SECRET";
/** Long enough to cover one turn's tool rounds and render pass, no longer. */
const DEFAULT_TTL_MS = 5 * 60_000;

/**
 * `kind_<12 hex>.<expiresAtMs>.<64 hex sig>` — self-describing enough that a
 * reviewer can tell what class of reference an unresolved token is without
 * resolving it.
 *
 * Exported as an UNANCHORED string, not a `RegExp`, so this module's own
 * full-string check (`HANDLE_SHAPE_RE` below) and `turn.ts`'s render-time scan
 * build their own anchoring from the same source rather than one of them
 * stripping `^`/`$` out of the other's compiled pattern — string surgery on a
 * `RegExp.source` is exactly the kind of thing that silently matches one
 * character more or less than intended. `turn.ts` wraps this in `\b...\b`;
 * `\b` holds at both ends because the pattern starts and ends on a word
 * character. See Root Cause #42/#61 for why there is exactly one definition.
 */
export const HANDLE_CORE_PATTERN = "[a-z][a-z0-9]*_[a-f0-9]{12}\\.\\d+\\.[a-f0-9]{64}";

/** Full-string form, for validating one already-extracted token. */
export const HANDLE_SHAPE_RE = new RegExp(`^${HANDLE_CORE_PATTERN}$`);

function readSecret(): string {
  const v = process.env[SECRET_ENV];
  if (!v || v.length === 0) {
    throw new Error(
      `${SECRET_ENV} is not set. Unlike the /api/media/ext signer, a handle registry ` +
        "fails CLOSED: minting without a secret would let an unverifiable reference " +
        "reach user-visible text with nothing to check it against.",
    );
  }
  return v;
}

interface StoredHandle {
  value: string;
  conversationId: string;
  turnId: string;
  expiresAt: number;
  consumed: boolean;
}

export class HandleRegistry {
  private readonly store = new Map<string, StoredHandle>();

  constructor(
    private readonly conversationId: string,
    private readonly turnId: string,
    private readonly ttlMs: number = DEFAULT_TTL_MS,
  ) {}

  /*
   * 🛑 The secret is read LAZILY, on first mint/resolve — not in the
   * constructor.
   *
   * `runAssistantTurn` builds a registry for EVERY turn, including turns that
   * only ever call `piiClass: "none"` tools and never mint anything. Reading
   * the secret eagerly made a missing env var a hard 500 on a plain FAQ
   * question — measured live: "What is your return policy?" returned 500
   * because a handle registry that was never used refused to be constructed.
   *
   * This changes WHEN it fails, never WHETHER: minting still requires the
   * secret and still throws without it, so an unverifiable reference can
   * still never reach user-visible text. A turn that mints nothing has
   * nothing to verify and correctly needs no key.
   */
  private secretOrThrow(): string {
    return readSecret();
  }

  /**
   * Mint a handle standing for `value`. `kind` becomes the token's visible
   * prefix (`"addr"`, `"order"`, …) — pick a name a reviewer could classify
   * without resolving it.
   */
  mint(kind: string, value: string): string {
    const id = randomBytes(6).toString("hex");
    const expiresAt = Date.now() + this.ttlMs;
    const token = `${kind}_${id}`;
    const sig = this.sign(token, expiresAt);
    this.store.set(token, {
      value,
      conversationId: this.conversationId,
      turnId: this.turnId,
      expiresAt,
      consumed: false,
    });
    return `${token}.${expiresAt}.${sig}`;
  }

  /**
   * Resolve a rendered token back to its real value, exactly once.
   *
   * Returns `null` for anything that is not a handle minted by THIS registry,
   * this turn, unexpired, and unconsumed — including a syntactically
   * plausible string the model paraphrased or hallucinated. The caller MUST
   * treat `null` as a hard failure of the response, never as "value unknown,
   * render the raw token" — see `turn.ts`'s rendering step.
   */
  resolve(rendered: string): string | null {
    if (!HANDLE_SHAPE_RE.test(rendered)) return null;
    const lastDot = rendered.lastIndexOf(".");
    const secondLastDot = rendered.lastIndexOf(".", lastDot - 1);
    const token = rendered.slice(0, secondLastDot);
    const expiresAtStr = rendered.slice(secondLastDot + 1, lastDot);
    const sig = rendered.slice(lastDot + 1);
    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt)) return null;

    let expectedSig: string;
    try {
      expectedSig = this.sign(token, expiresAt);
    } catch (err) {
      void normalizeError(err);
      return null;
    }
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    if (Date.now() > expiresAt) return null;

    const entry = this.store.get(token);
    if (!entry) return null;
    if (entry.consumed) return null;
    if (entry.conversationId !== this.conversationId || entry.turnId !== this.turnId) return null;

    entry.consumed = true;
    return entry.value;
  }

  private sign(token: string, expiresAt: number): string {
    return createHmac("sha256", this.secretOrThrow())
      .update(`${token}.${expiresAt}`)
      .digest("hex");
  }
}
