import { z } from "zod";
import { serverLogger } from "../../../monitoring";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
import type {
  HomepageSectionDocument,
  HomepageSectionCreateInput,
  HomepageSectionUpdateInput,
} from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

// ─── Schemas ──────────────────────────────────────────────────────────────

export const createSectionSchema = z.object({
  type: z.string().min(1),
  enabled: z.boolean().default(true),
  order: z.number().int().default(0),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateSectionSchema = z.object({
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type CreateHomepageSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateHomepageSectionInput = z.infer<typeof updateSectionSchema>;

// ─── Actions ──────────────────────────────────────────────────────────────

export async function createHomepageSection(
  input: CreateHomepageSectionInput,
  createdBy: string,
): Promise<HomepageSectionDocument> {
  const section = await homepageSectionsRepository.create(
    input as unknown as HomepageSectionCreateInput,
  );
  serverLogger.info("createHomepageSection", {
    createdBy,
    sectionId: section.id,
  });
  return section;
}

export async function updateHomepageSection(
  id: string,
  input: UpdateHomepageSectionInput,
): Promise<HomepageSectionDocument> {
  const updated = await homepageSectionsRepository.update(
    id,
    input as HomepageSectionUpdateInput,
  );
  serverLogger.info("updateHomepageSection", { sectionId: id });
  return updated;
}

export async function deleteHomepageSection(id: string): Promise<void> {
  await homepageSectionsRepository.delete(id);
  serverLogger.info("deleteHomepageSection", { sectionId: id });
}

export async function reorderHomepageSections(
  sectionIds: string[],
): Promise<HomepageSectionDocument[]> {
  await homepageSectionsRepository.reorderSections(
    sectionIds.map((id, index) => ({ id, order: index + 1 })),
  );
  const updatedSections = await homepageSectionsRepository.findAll();
  updatedSections.sort((a, b) => (a.order || 0) - (b.order || 0));
  serverLogger.info("reorderHomepageSections", { count: sectionIds.length });
  return updatedSections;
}

export async function listHomepageSections(params?: {
  filters?: string;
  sorts?: string;
  page?: number;
  pageSize?: number;
}): Promise<FirebaseSieveResult<HomepageSectionDocument>> {
  const sieve: SieveModel = {
    filters: params?.filters,
    sorts: params?.sorts ?? "order",
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 50,
  };
  return homepageSectionsRepository.list(sieve);
}

export async function listEnabledHomepageSections(): Promise<
  HomepageSectionDocument[]
> {
  return homepageSectionsRepository.getEnabledSections();
}

export async function getHomepageSectionById(
  id: string,
): Promise<HomepageSectionDocument | null> {
  return homepageSectionsRepository.findById(id);
}
