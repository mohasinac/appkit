import type { FirebaseSieveFields, FirebaseSieveResult, SieveModel } from "../../../providers/db-firebase";
import { BaseRepository } from "../../../providers/db-firebase";
import { applySieveToFirestore } from "../../../providers/db-firebase";
import {
  SERVER_ERRORS_COLLECTION,
  SERVER_ERROR_STACK_MAX_BYTES,
  type ServerErrorDocument,
  type ServerErrorSource,
} from "../schemas/firestore";
import { normalizeError } from "../../../errors/normalize";

/** Truncate a stack to the documented byte budget — never persist > 4 KB. */
function truncateStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  if (stack.length <= SERVER_ERROR_STACK_MAX_BYTES) return stack;
  return stack.slice(0, SERVER_ERROR_STACK_MAX_BYTES);
}

export class ServerErrorsRepository extends BaseRepository<ServerErrorDocument> {
  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    occurredAt: { canFilter: true, canSort: true },
    source: { canFilter: true, canSort: false },
    route: { canFilter: true, canSort: false },
    method: { canFilter: true, canSort: false },
    code: { canFilter: true, canSort: false },
    userId: { canFilter: true, canSort: false },
    requestId: { canFilter: true, canSort: false },
  };

  constructor() {
    super(SERVER_ERRORS_COLLECTION);
  }

  /**
   * Persist a server error. NEVER throws — a failure here must not break the
   * request that surfaced the original error. Console-logs internally if the
   * write itself fails.
   */
  async record(
    input: Omit<ServerErrorDocument, "id" | "occurredAt"> & {
      occurredAt?: number;
    },
  ): Promise<void> {
    try {
      const now = Date.now();
      const ref = this.getCollection().doc();
      const doc: ServerErrorDocument = {
        id: ref.id,
        occurredAt: input.occurredAt ?? now,
        source: input.source,
        route: input.route,
        ...(input.method ? { method: input.method } : {}),
        ...(input.userId ? { userId: input.userId } : {}),
        code: input.code,
        message: input.message,
        ...(input.stack ? { stack: truncateStack(input.stack) } : {}),
        ...(input.componentStack
          ? { componentStack: truncateStack(input.componentStack) }
          : {}),
        requestId: input.requestId,
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
        ...(input.bodyDigest ? { bodyDigest: input.bodyDigest } : {}),
      };
      await ref.set(doc);
    } catch (err) {
      void normalizeError(err);
      // Logging a failure to log must never propagate.
      // eslint-disable-next-line no-console
      console.error("[serverErrors.record] failed to persist", err);
    }
  }

  async list(model: SieveModel): Promise<FirebaseSieveResult<ServerErrorDocument>> {
    return applySieveToFirestore<ServerErrorDocument>({
      baseQuery: this.getCollection(),
      model,
      fields: ServerErrorsRepository.SIEVE_FIELDS,
    });
  }

  async listBySource(
    source: ServerErrorSource,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ServerErrorDocument>> {
    return applySieveToFirestore<ServerErrorDocument>({
      baseQuery: this.getCollection().where("source", "==", source),
      model,
      fields: ServerErrorsRepository.SIEVE_FIELDS,
    });
  }
}

let cached: ServerErrorsRepository | null = null;

/** Lazy singleton — avoids cold-start admin SDK init when nobody is reporting. */
export function serverErrorsRepository(): ServerErrorsRepository {
  if (!cached) cached = new ServerErrorsRepository();
  return cached;
}
