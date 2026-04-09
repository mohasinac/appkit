// appkit/src/seed/factories/faq.factory.ts
let _seq = 1;

export interface SeedFaqDocument {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  voteCount: number;
  isActive: boolean;
}

export function makeFaq(
  overrides: Partial<SeedFaqDocument> = {},
): SeedFaqDocument {
  const n = _seq++;
  return {
    id: overrides.id ?? `faq-${n}`,
    question: overrides.question ?? `Frequently asked question ${n}`,
    answer: overrides.answer ?? "This is the answer to the frequently asked question.",
    category: overrides.category ?? "general",
    sortOrder: overrides.sortOrder ?? n,
    voteCount: overrides.voteCount ?? 0,
    isActive: overrides.isActive ?? true,
    ...overrides,
  };
}
