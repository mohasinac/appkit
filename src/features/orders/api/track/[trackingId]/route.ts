/**
 * Orders — Tracking API handler (GET /api/orders/track/[trackingId])
 *
 * Consuming projects can create a 2-line stub:
 *
 * ```ts
 * // app/api/orders/track/[trackingId]/route.ts
 * export { GET } from "@mohasinac/appkit/features/orders";
 * ```
 */
import "server-only";
import { NextResponse } from "next/server.js";
import { getTrackingInfo } from "../../../actions/order-actions";

export async function GET(
  _request: Request,
  { params }: { params: { trackingId: string } },
): Promise<NextResponse> {
  const { trackingId } = params;
  if (!trackingId?.trim()) {
    return NextResponse.json(
      { success: false, error: "Missing trackingId" },
      { status: 400 },
    );
  }

  try {
    const info = await getTrackingInfo(trackingId);
    if (!info) {
      return NextResponse.json(
        { success: false, error: "Tracking provider not available" },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true, data: info });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch tracking info";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
