import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  PRODUCT_TEMPLATE_COLLECTION,
  PRODUCT_TEMPLATE_PREFIX,
  type ProductTemplateCreateInput,
  type ProductTemplateDocument,
  type ProductTemplateUpdateInput,
} from "../schemas/product-templates";
import { PRODUCT_FIELDS } from "../../../constants/field-names";
import type { FirestoreDocument } from "@mohasinac/appkit";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ProductTemplateRepository extends BaseRepository<ProductTemplateDocument> {
  constructor() {
    super(PRODUCT_TEMPLATE_COLLECTION);
  }

  generateId(storeId: string, name: string): string {
    const base = `${slugify(storeId)}-${slugify(name)}`;
    return `${PRODUCT_TEMPLATE_PREFIX}${base}`;
  }

  async create(input: ProductTemplateCreateInput): Promise<ProductTemplateDocument> {
    const id = this.generateId(input.storeId, input.name);
    const doc: Omit<ProductTemplateDocument, "id"> = {
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(doc));
    return { id, ...doc };
  }

  async update(id: string, input: ProductTemplateUpdateInput): Promise<ProductTemplateDocument> {
    const update = { ...input, updatedAt: new Date() };
    await this.db
      .collection(this.collection)
      .doc(id)
      .update(prepareForFirestore(update as FirestoreDocument));
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Template ${id} not found after update`);
    return updated;
  }

  async findByStore(storeId: string): Promise<ProductTemplateDocument[]> {
    const snap = await this.db
      .collection(this.collection)
      .where(PRODUCT_FIELDS.STORE_ID, "==", storeId)
      .orderBy(PRODUCT_FIELDS.CREATED_AT, "desc")
      .get();
    return snap.docs.map((d) => this.mapDoc<ProductTemplateDocument>(d));
  }

  async listByStore(
    storeId: string,
    model: SieveModel,
  ): Promise<FirebaseSieveResult<ProductTemplateDocument>> {
    const baseQuery = this.getCollection().where(PRODUCT_FIELDS.STORE_ID, "==", storeId);
    return this.sieveQuery<ProductTemplateDocument>(
      model,
      {
        name: { canFilter: true, canSort: true },
        createdAt: { canFilter: false, canSort: true },
      },
      { baseQuery },
    );
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.collection(this.collection).doc(id).delete();
  }
}

export const productTemplateRepository = new ProductTemplateRepository();
