/**
 * feat-whatsapp-bot — POST /api/whatsapp/webhook
 *
 * WhatsApp webhook receiver for incoming messages.
 *
 * Consumer stub:
 * ```ts
 * export { whatsappWebhookPOST as POST } from "@mohasinac/feat-whatsapp-bot";
 * ```
 */

import { NextResponse } from "next/server.js";
import { getProviders } from "@mohasinac/contracts";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const { db, eventBus } = getProviders();
    if (!db)
      return NextResponse.json(
        { success: false, error: "DB not configured" },
        { status: 503 },
      );

    // Store webhook payload for processing
    const repo = db.getRepository<Record<string, unknown>>("whatsapp_messages");
    const created = await repo.create({
      ...body,
      receivedAt: new Date(),
      processed: false,
    });

    // Emit event for async processing if eventBus available
    if (eventBus) {
      await eventBus.emit("whatsapp.message.received", created);
    }

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
