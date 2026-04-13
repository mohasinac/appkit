import { getProviders } from "../contracts";
import type { IRepository } from "../contracts";

export type CopilotFeedback = "positive" | "negative";

export interface CopilotLogDocument {
  id: string;
  userId: string;
  userName: string;
  conversationId: string;
  prompt: string;
  response: string;
  model: string;
  promptTokens?: number;
  responseTokens?: number;
  durationMs?: number;
  feedback: CopilotFeedback | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CopilotLogCreateInput {
  userId: string;
  userName: string;
  conversationId: string;
  prompt: string;
  response: string;
  model: string;
  promptTokens?: number;
  responseTokens?: number;
  durationMs?: number;
}

function resolveRepository(): IRepository<CopilotLogDocument> {
  const provider = getProviders().db;
  if (!provider) {
    throw new Error(
      "DB provider is not registered. Configure providers before using CopilotLogRepository.",
    );
  }
  return provider.getRepository<CopilotLogDocument>("copilotLogs");
}

export class CopilotLogRepository {
  private _repo: IRepository<CopilotLogDocument> | null;
  private readonly _collection: string | null;

  constructor(
    repoOrCollection: IRepository<CopilotLogDocument> | string | null = null,
  ) {
    if (typeof repoOrCollection === "string") {
      this._repo = null;
      this._collection = repoOrCollection;
    } else {
      this._repo = repoOrCollection;
      this._collection = null;
    }
  }

  private get repo(): IRepository<CopilotLogDocument> {
    if (!this._repo) {
      if (this._collection) {
        const provider = getProviders().db;
        if (!provider) {
          throw new Error(
            "DB provider is not registered. Configure providers before using CopilotLogRepository.",
          );
        }
        this._repo = provider.getRepository<CopilotLogDocument>(
          this._collection,
        );
      } else {
        this._repo = resolveRepository();
      }
    }
    return this._repo;
  }

  async create(input: CopilotLogCreateInput): Promise<CopilotLogDocument> {
    return this.repo.create({
      ...input,
      feedback: null,
    } as Omit<CopilotLogDocument, "id" | "createdAt" | "updatedAt">);
  }

  async findByConversation(
    conversationId: string,
    limit = 50,
  ): Promise<CopilotLogDocument[]> {
    const result = await this.repo.findAll({
      filters: `conversationId==${conversationId}`,
      sort: "createdAt",
      order: "asc",
      page: 1,
      perPage: limit,
    });

    return result.data;
  }

  async setFeedback(logId: string, feedback: CopilotFeedback): Promise<void> {
    await this.repo.update(logId, { feedback });
  }
}

export const copilotLogRepository = new CopilotLogRepository();
