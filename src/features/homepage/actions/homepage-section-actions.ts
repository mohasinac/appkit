import { z } from "zod";
import { serverLogger } from "../../../monitoring";
import { sortBy } from "../../../constants/sort";
import { HOMEPAGE_SECTION_FIELDS } from "../../../constants/field-names";
import { homepageSectionsRepository } from "../repository/homepage-sections.repository";
import { homepageSectionTypeSchema } from "../schemas";
import type {
  HomepageSectionDocument,
  HomepageSectionCreateInput,
  HomepageSectionUpdateInput,
} from "../schemas";
import type {
  FirebaseSieveResult,
  SieveModel,
} from "../../../providers/db-firebase";

// --- Schemas --------------------------------------------------------------

/*
 * 🛑 `type` was `z.string().min(1)` — ANY non-empty string.
 *
 * This is the third of three create paths for `homepageSections`
 * (`POST /api/admin/sections`, `POST /api/homepage-sections`, and this server
 * action via `createHomepageSectionAction`), and it was the loosest: a caller
 * could store a section whose `type` matches no renderer, which the homepage
 * then skips in silence — a row that exists, occupies an order slot, and draws
 * nothing.
 *
 * All three now agree on `homepageSectionTypeSchema`, which is derived from
 * the `SectionType` union.
 */
export const createSectionSchema = z.object({
  type: homepageSectionTypeSchema,
  enabled: z.boolean().default(true),
  order: z.number().int().default(0),
  config: z.object({}).passthrough().optional(),
});

/**
 * The next free `order` value.
 *
 * `HomepageSectionCreateInput.order` is REQUIRED, and both API create routes
 * need the same answer for "the caller did not choose one". Two copies of this
 * query is how they would come to disagree about where a new section lands.
 */
export async function resolveNextSectionOrder(): Promise<number> {
  const latest = await homepageSectionsRepository.list({
    sorts: sortBy(HOMEPAGE_SECTION_FIELDS.ORDER),
    page: "1",
    pageSize: "1",
  });
  const top = latest.items[0]?.order;
  return typeof top === "number" ? top + 1 : 1;
}

export const updateSectionSchema = z.object({
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
  config: z.object({}).passthrough().optional(),
});

export type CreateHomepageSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateHomepageSectionInput = z.infer<typeof updateSectionSchema>;

// --- Actions --------------------------------------------------------------

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
