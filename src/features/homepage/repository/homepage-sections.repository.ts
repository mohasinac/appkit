/**
 * Homepage Sections Repository
 *
 * Manages homepage section configuration and ordering.
 */

import { DatabaseError } from "../../../errors";
import type { JsonValue } from "@mohasinac/appkit";
import { HOMEPAGE_SECTION_FIELDS } from "../../../constants/field-names";
import {
  BaseRepository,
  prepareForFirestore,
  parseSieveDateValue,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import { normalizeError } from "../../../errors/normalize";
import {
  HOMEPAGE_SECTIONS_COLLECTION,
  type HomepageSectionCreateInput,
  type HomepageSectionDocument,
  type SectionType,
  createHomepageSectionId,
} from "../schemas";

export class HomepageSectionsRepository extends BaseRepository<HomepageSectionDocument> {
  constructor() {
    super(HOMEPAGE_SECTIONS_COLLECTION);
  }

  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    type: { canFilter: true, canSort: false },
    enabled: { canFilter: true, canSort: false },
    order: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
    updatedAt: { canFilter: true, canSort: true, parseValue: parseSieveDateValue },
  };

  async list(
    model: SieveModel,
  ): Promise<FirebaseSieveResult<HomepageSectionDocument>> {
    return this.sieveQuery<HomepageSectionDocument>(
      model,
      HomepageSectionsRepository.SIEVE_FIELDS,
      { defaultPageSize: 50, maxPageSize: 200 },
    );
  }

  override async create(
    input: HomepageSectionCreateInput,
  ): Promise<HomepageSectionDocument> {
    const id = createHomepageSectionId(input.type);

    const sectionData: Omit<HomepageSectionDocument, "id"> = {
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db
      .collection(this.collection)
      .doc(id)
      .set(prepareForFirestore(sectionData));

    return { id, ...sectionData };
  }

  /**
   * Merge `config` instead of replacing it.
   *
   * `BaseRepository.update` writes `config` as a top-level key, and a Firestore
   * `update()` REPLACES a map field wholesale rather than merging it. So every
   * config key a caller omitted was silently deleted — HTTP 200, no error. The
   * admin section builder emits only the fields it has inputs for, which meant
   * opening any section and clicking Save destroyed `products.rows`/`maxItems`/
   * `filterByBrand`, `banner.backgroundImage`, `categories.cta`/`filters` and
   * every other unbuilt field. Root Cause #76.
   *
   * Both write paths — `PATCH /api/admin/sections/[id]` and the
   * `updateHomepageSection` server action — funnel through here, so the merge
   * belongs in the write primitive rather than at either call site.
   *
   * Costs one extra read, and only when `config` is actually being written:
   * a reorder or an enable/disable still costs exactly one write.
   *
   * Semantics: an omitted key is PRESERVED. Clearing one requires sending it
   * explicitly (`null` / `""` / `[]`), not omitting it. `resetSectionToDefault`
   * below deliberately keeps replace semantics — that is its whole purpose.
   */
  override async update(
    id: string,
    data: Partial<HomepageSectionDocument>,
  ): Promise<HomepageSectionDocument> {
    if (!data.config) {
      return super.update(id, data);
    }

    // A missing doc falls through to super.update, which fails the same way it
    // did before this override existed — don't invent a new error path here.
    const existing = await this.findById(id);
    if (!existing) {
      return super.update(id, data);
    }

    return super.update(id, {
      ...data,
      config: {
        ...(existing.config ?? {}),
        ...data.config,
      } as HomepageSectionDocument["config"],
    });
  }

  async getEnabledSections(): Promise<HomepageSectionDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(HOMEPAGE_SECTION_FIELDS.ENABLED, "==", true)
        .orderBy(HOMEPAGE_SECTION_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<HomepageSectionDocument>(doc),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve enabled sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getDisabledSections(): Promise<HomepageSectionDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(HOMEPAGE_SECTION_FIELDS.ENABLED, "==", false)
        .orderBy(HOMEPAGE_SECTION_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<HomepageSectionDocument>(doc),
      );
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve disabled sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getSectionByType(
    type: SectionType,
  ): Promise<HomepageSectionDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(HOMEPAGE_SECTION_FIELDS.TYPE, "==", type)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return this.mapDoc<HomepageSectionDocument>(doc);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve section by type: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async enableSection(sectionId: string): Promise<HomepageSectionDocument> {
    try {
      await this.db.collection(this.collection).doc(sectionId).update({
        enabled: true,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to enable section: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async disableSection(sectionId: string): Promise<HomepageSectionDocument> {
    try {
      await this.db.collection(this.collection).doc(sectionId).update({
        enabled: false,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to disable section: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async toggleSection(sectionId: string): Promise<HomepageSectionDocument> {
    try {
      const section = await this.findByIdOrFail(sectionId);

      await this.db.collection(this.collection).doc(sectionId).update({
        enabled: !section.enabled,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to toggle section: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async reorderSections(
    sectionOrders: Array<{ id: string; order: number }>,
  ): Promise<void> {
    try {
      const batch = this.db.batch();
      const now = new Date();

      for (const { id, order } of sectionOrders) {
        const ref = this.db.collection(this.collection).doc(id);
        batch.update(ref, {
          order,
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to reorder sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async updateSectionConfig(
    sectionId: string,
    config: Record<string, JsonValue>,
  ): Promise<HomepageSectionDocument> {
    try {
      await this.db.collection(this.collection).doc(sectionId).update({
        config,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to update section config: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async batchToggleSections(
    sectionIds: string[],
    enabled: boolean,
  ): Promise<void> {
    try {
      const batch = this.db.batch();
      const now = new Date();

      for (const id of sectionIds) {
        const ref = this.db.collection(this.collection).doc(id);
        batch.update(ref, {
          enabled,
          updatedAt: now,
        });
      }

      await batch.commit();
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to batch toggle sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async resetSectionToDefault(
    sectionId: string,
    defaultConfig: Record<string, JsonValue>,
  ): Promise<HomepageSectionDocument> {
    try {
      await this.db.collection(this.collection).doc(sectionId).update({
        config: defaultConfig,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to reset section: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const homepageSectionsRepository = new HomepageSectionsRepository();
