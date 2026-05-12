/**
 * Job handler: dispatch pending payouts via Razorpay Payouts API.
 *
 * Reads RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_ACCOUNT_NUMBER from
 * env (via `ctx.env`). On 3rd consecutive failure the record is marked failed.
 *
 * Brand name in the narration is taken from `ctx.env("APP_BRAND_NAME")`
 * (default empty) so appkit stays consumer-agnostic.
 */

import { payoutRepository } from "../../../../repositories";
import type { JobContext, ScheduleHandler } from "../runtime/types";
import type { DocumentReference } from "firebase-admin/firestore";

const MAX_FAILURES = 3;

type PayoutEntry = Awaited<ReturnType<typeof payoutRepository.getPending>>[number];
type PayoutRow = PayoutEntry["data"];

async function dispatch(ctx: JobContext, entry: { ref: DocumentReference; data: PayoutRow }): Promise<void> {
  const { ref, data: payout } = entry;
  await payoutRepository.markProcessing(ref);

  try {
    const keyId = ctx.env("RAZORPAY_KEY_ID") ?? "";
    const keySecret = ctx.env("RAZORPAY_KEY_SECRET") ?? "";
    const accountNumber = ctx.env("RAZORPAY_ACCOUNT_NUMBER") ?? "";
    const apiBaseUrl = ctx.env("RAZORPAY_API_BASE_URL") ?? "https://api.razorpay.com/v1";
    const brandName = ctx.env("APP_BRAND_NAME") ?? "";

    if (!keyId || !keySecret || !accountNumber) {
      throw new Error("Razorpay credentials not configured");
    }

    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    let fundAccount: Record<string, unknown>;
    if (payout.paymentMethod === "upi" && payout.upiId) {
      fundAccount = { account_type: "vpa", vpa: { address: payout.upiId } };
    } else if (payout.bankAccount) {
      fundAccount = {
        account_type: "bank_account",
        bank_account: {
          name: payout.bankAccount.accountHolderName,
          ifsc: payout.bankAccount.ifscCode,
          account_number: payout.bankAccount.accountNumberMasked,
        },
      };
    } else {
      throw new Error("Payout has no fund account configured");
    }

    const payload = {
      account_number: accountNumber,
      fund_account: {
        ...fundAccount,
        contact: { name: payout.sellerEmail, type: "vendor", email: payout.sellerEmail },
      },
      amount: Math.round(payout.amount * 100),
      currency: payout.currency.toUpperCase(),
      mode: payout.paymentMethod === "upi" ? "UPI" : "NEFT",
      purpose: "payout",
      reference_id: payout.id,
      narration: brandName
        ? `${brandName} payout for seller ${payout.storeId}`
        : `Payout for seller ${payout.storeId}`,
    };

    const response = await fetch(`${apiBaseUrl}/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
        "X-Payout-Idempotency": payout.id,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Razorpay ${response.status}: ${errBody}`);
    }

    const result = (await response.json()) as { id: string; status: string };
    await payoutRepository.recordSuccess(ref, result.id, result.status);
    ctx.logger.info(`Payout ${payout.id} dispatched`, { razorpayId: result.id, razorpayStatus: result.status });
  } catch (error) {
    const failureCount = ((payout as PayoutRow & { failureCount?: number }).failureCount ?? 0) + 1;
    const isFinal = failureCount >= MAX_FAILURES;
    const reason = error instanceof Error ? error.message : String(error);
    await payoutRepository.recordFailure(ref, failureCount, reason, isFinal);
    if (isFinal) {
      ctx.logger.error(`Payout ${payout.id} permanently failed after ${MAX_FAILURES} attempts`, error, {
        sellerId: payout.storeId,
      });
    } else {
      ctx.logger.warn(`Payout ${payout.id} failed (attempt ${failureCount})`, { error: reason });
    }
  }
}

export const payoutBatchHandler: ScheduleHandler = async (ctx) => {
  ctx.logger.info("Starting payout batch sweep");
  const pending = await payoutRepository.getPending();
  if (pending.length === 0) {
    ctx.logger.info("No pending payouts to process");
    return;
  }
  ctx.logger.info(`Dispatching ${pending.length} payout(s)`);
  const results = await Promise.allSettled(pending.map((entry) => dispatch(ctx, entry)));
  const failed = results.filter((r) => r.status === "rejected").length;
  ctx.logger.info("Payout batch complete", {
    total: pending.length,
    succeeded: pending.length - failed,
    failed,
  });
};
