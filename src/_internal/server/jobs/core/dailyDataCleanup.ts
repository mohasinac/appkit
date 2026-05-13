import { sessionRepository, tokenRepository } from "../../../../repositories";
import type { JobContext } from "../runtime/types";
import { batchDelete } from "../handlers/_helpers";

export async function runDailyDataCleanup(ctx: JobContext): Promise<void> {
  ctx.logger.info("Starting daily data cleanup (sessions + tokens)");

  const sessionRefs = await sessionRepository.getExpiredRefs(ctx.now);
  const sessionsDeleted = await batchDelete(ctx, sessionRefs);
  ctx.logger.info("Session cleanup complete", { deleted: sessionsDeleted });

  const emailRefs = await tokenRepository.getExpiredEmailVerificationRefs(ctx.now);
  const emailDeleted = await batchDelete(ctx, emailRefs);

  const pwRefs = await tokenRepository.getExpiredPasswordResetRefs(ctx.now);
  const pwDeleted = await batchDelete(ctx, pwRefs);

  ctx.logger.info("Token cleanup complete", {
    emailVerificationDeleted: emailDeleted,
    passwordResetDeleted: pwDeleted,
  });

  ctx.logger.info("Daily data cleanup complete", {
    sessionsDeleted,
    tokensDeleted: emailDeleted + pwDeleted,
  });
}
