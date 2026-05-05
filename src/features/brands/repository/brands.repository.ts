import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  BRANDS_COLLECTION,
  BRAND_FIELDS,
  type BrandDocument,
  type BrandCreateInput,
  type BrandUpdateInput,
} from "../schemas";
import { serverLogger } from "../../../monitoring";

export class BrandsRepository extends BaseRepository<BrandDocument> {
  constructor() {
    super(BRANDS_COLLECTION);
  }

  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    name: { canFilter: true, canSort: true },
    slug: { canFilter: true, canSort: false },
    isActive: { canFilter: true, canSort: false },
    displayOrder: { canFilter: false, canSort: true },
    createdAt: { canFilter: true, canSort: true },
  };

  async list(model: SieveModel): Promise<FirebaseSieveResult<BrandDocument>> {
    return this.sieveQuery<BrandDocument>(model, BrandsRepository.SIEVE_FIELDS);
  }

  async findBySlug(slug: string): Promise<BrandDocument | null> {
    const snap = await this.getCollection()
      .where(BRAND_FIELDS.SLUG, "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return this.mapDoc<BrandDocument>(snap.docs[0]);
  }

  async findActive(): Promise<BrandDocument[]> {
    const snap = await this.getCollection()
      .where(BRAND_FIELDS.IS_ACTIVE, "==", true)
      .orderBy(BRAND_FIELDS.DISPLAY_ORDER)
      .get();
    return snap.docs.map((d) => this.mapDoc<BrandDocument>(d));
  }

  async create(input: BrandCreateInput): Promise<BrandDocument> {
    const now = new Date();
    const ref = this.getCollection().doc(input.slug);
    const data = prepareForFirestore({
      ...input,
      id: ref.id,
      createdAt: now,
      updatedAt: now,
    });
    await ref.set(data);
    serverLogger.info("Brand created", { id: ref.id, name: input.name });
    return { ...data, id: ref.id } as BrandDocument;
  }

  async update(id: string, input: BrandUpdateInput): Promise<BrandDocument> {
    const data = prepareForFirestore({ ...input, updatedAt: new Date() });
    await this.getCollection().doc(id).update(data);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Brand ${id} not found after update`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.getCollection().doc(id).delete();
    serverLogger.info("Brand deleted", { id });
  }
}

export const brandsRepository = new BrandsRepository();
