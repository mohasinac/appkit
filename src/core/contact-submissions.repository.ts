import { getProviders } from "../contracts/registry";
import type { IRepository, PagedResult } from "../contracts/repository";

export interface ContactSubmissionDocument {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "resolved";
  ipAddress?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export type ContactSubmissionCreateInput = Omit<
  ContactSubmissionDocument,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export interface ContactSubmissionListModel {
  filters?: string;
  sorts?: string;
  page?: string;
  pageSize?: string;
}

export const CONTACT_SUBMISSIONS_COLLECTION = "contactSubmissions" as const;

function resolveRepository(): IRepository<ContactSubmissionDocument> {
  const provider = getProviders().db;
  if (!provider) {
    throw new Error(
      "DB provider is not registered. Configure providers before using ContactSubmissionsRepository.",
    );
  }
  return provider.getRepository<ContactSubmissionDocument>(
    CONTACT_SUBMISSIONS_COLLECTION,
  );
}

export class ContactSubmissionsRepository {
  private _repo: IRepository<ContactSubmissionDocument> | null;

  constructor(repo: IRepository<ContactSubmissionDocument> | null = null) {
    this._repo = repo;
  }

  private get repo(): IRepository<ContactSubmissionDocument> {
    if (!this._repo) {
      this._repo = resolveRepository();
    }
    return this._repo;
  }

  async list(
    model: ContactSubmissionListModel,
  ): Promise<PagedResult<ContactSubmissionDocument>> {
    const page = Number(model.page || "1");
    const perPage = Number(model.pageSize || "50");

    return this.repo.findAll({
      filters: model.filters,
      sort: model.sorts || "-createdAt",
      page: Number.isFinite(page) ? page : 1,
      perPage: Number.isFinite(perPage) ? perPage : 50,
    });
  }

  async findById(id: string): Promise<ContactSubmissionDocument | null> {
    return this.repo.findById(id);
  }

  async save(
    input: ContactSubmissionCreateInput,
  ): Promise<ContactSubmissionDocument> {
    return this.repo.create({
      ...input,
      status: "new",
    });
  }

  async markRead(id: string): Promise<void> {
    await this.repo.update(id, { status: "read", updatedAt: new Date() });
  }

  async markResolved(id: string): Promise<void> {
    await this.repo.update(id, { status: "resolved", updatedAt: new Date() });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

export const contactSubmissionsRepository = new ContactSubmissionsRepository();
