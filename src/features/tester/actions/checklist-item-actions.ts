import { z } from "zod";
import { serverLogger } from "../../../monitoring";
import { testerChecklistItemRepository } from "../repository/tester-checklist-item.repository";
import type { TesterChecklistItemDocument } from "../schemas/firestore";

// --- Schemas --------------------------------------------------------------

const checklistItemBaseSchema = z.object({
  groupKey: z.string().min(1).max(100),
  groupLabel: z.string().min(1).max(200),
  pageKey: z.string().min(1).max(100),
  pageLabel: z.string().min(1).max(200),
  label: z.string().min(3).max(500),
  description: z.string().max(2000).optional(),
  href: z.string().max(300).optional(),
  order: z.number().int().min(0).default(0),
  phase: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  adminOnly: z.boolean().default(false),
});

export const checklistItemCreateSchema = checklistItemBaseSchema;
export const checklistItemUpdateSchema = checklistItemBaseSchema.partial();

export type ChecklistItemCreateInput = z.infer<typeof checklistItemCreateSchema>;
export type ChecklistItemUpdateInput = z.infer<typeof checklistItemUpdateSchema>;

// --- Actions --------------------------------------------------------------

export async function createChecklistItem(
  input: ChecklistItemCreateInput,
): Promise<TesterChecklistItemDocument> {
  const item = await testerChecklistItemRepository.createItem({
    groupKey: input.groupKey,
    groupLabel: input.groupLabel,
    pageKey: input.pageKey,
    pageLabel: input.pageLabel,
    label: input.label,
    description: input.description,
    href: input.href,
    order: input.order ?? 0,
    phase: input.phase ?? 1,
    isActive: input.isActive ?? true,
    adminOnly: input.adminOnly ?? false,
  });

  serverLogger.info("createChecklistItem", { itemId: item.id });
  return item;
}

export async function updateChecklistItem(
  id: string,
  input: ChecklistItemUpdateInput,
): Promise<TesterChecklistItemDocument> {
  const item = await testerChecklistItemRepository.update(id, input);
  serverLogger.info("updateChecklistItem", { itemId: id });
  return item;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await testerChecklistItemRepository.delete(id);
  serverLogger.info("deleteChecklistItem", { itemId: id });
}
