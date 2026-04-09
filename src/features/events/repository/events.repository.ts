import type {
  IRepository,
  PagedResult,
  SieveQuery,
} from "@mohasinac/contracts";
import type { EventItem, EventEntryItem } from "../types";

export class EventsRepository {
  constructor(private readonly repo: IRepository<EventItem>) {}

  async findAll(query?: SieveQuery): Promise<PagedResult<EventItem>> {
    return this.repo.findAll(query ?? {});
  }

  async findById(id: string): Promise<EventItem | null> {
    return this.repo.findById(id);
  }

  async findActive(): Promise<EventItem[]> {
    const result = await this.repo.findAll({
      filters: "status==active",
      sort: "startsAt",
    });
    return result.data;
  }

  async findByType(
    type: string,
    page = 1,
    perPage = 20,
  ): Promise<PagedResult<EventItem>> {
    return this.repo.findAll({
      filters: `type==${type},status==active`,
      sort: "-startsAt",
      page,
      perPage,
    });
  }

  async create(
    data: Omit<EventItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<EventItem> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<EventItem>): Promise<EventItem> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}

export class EventEntriesRepository {
  constructor(private readonly repo: IRepository<EventEntryItem>) {}

  async findByEvent(
    eventId: string,
    page = 1,
    perPage = 50,
  ): Promise<PagedResult<EventEntryItem>> {
    return this.repo.findAll({
      filters: `eventId==${eventId}`,
      sort: "-submittedAt",
      page,
      perPage,
    });
  }

  async findPending(eventId: string): Promise<EventEntryItem[]> {
    const result = await this.repo.findAll({
      filters: `eventId==${eventId},reviewStatus==pending`,
      sort: "submittedAt",
    });
    return result.data;
  }

  async findLeaderboard(
    eventId: string,
    limit = 10,
  ): Promise<EventEntryItem[]> {
    const result = await this.repo.findAll({
      filters: `eventId==${eventId},reviewStatus==approved`,
      sort: "-points",
      perPage: limit,
    });
    return result.data;
  }

  async create(data: Omit<EventEntryItem, "id">): Promise<EventEntryItem> {
    return this.repo.create(
      data as Omit<EventEntryItem, "id" | "createdAt" | "updatedAt">,
    );
  }

  async updateReviewStatus(
    id: string,
    status: "approved" | "flagged",
    reviewedBy: string,
    note?: string,
  ): Promise<EventEntryItem> {
    return this.repo.update(id, {
      reviewStatus: status,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
      reviewNote: note,
    });
  }
}
