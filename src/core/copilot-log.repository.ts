import { getProviders } from "@mohasinac/contracts";
import type { IRepository } from "@mohasinac/contracts";

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
  private readonly repo: IRepository<CopilotLogDocument>;

  constructor(
    repoOrCollection:
      | IRepository<CopilotLogDocument>
      | string = resolveRepository(),
  ) {
    if (typeof repoOrCollection === "string") {
      const provider = getProviders().db;
      if (!provider) {
        throw new Error(
          "DB provider is not registered. Configure providers before using CopilotLogRepository.",
        );
      }
      this.repo = provider.getRepository<CopilotLogDocument>(repoOrCollection);
      return;
    }

    this.repo = repoOrCollection;
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
