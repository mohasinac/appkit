/**
 * Homepage Sections Repository
 *
 * Manages homepage section configuration and ordering.
 */

import { DatabaseError } from "../../../errors";
import {
  BaseRepository,
  prepareForFirestore,
  type FirebaseSieveFields,
  type FirebaseSieveResult,
  type SieveModel,
} from "../../../providers/db-firebase";
import {
  HOMEPAGE_SECTIONS_COLLECTION,
  type HomepageSectionCreateInput,
  type HomepageSectionDocument,
  type SectionType,
  createHomepageSectionId,
} from "../schemas";

class HomepageSectionsRepository extends BaseRepository<HomepageSectionDocument> {
  constructor() {
    super(HOMEPAGE_SECTIONS_COLLECTION);
  }

  static readonly SIEVE_FIELDS: FirebaseSieveFields = {
    type: { canFilter: true, canSort: false },
    enabled: { canFilter: true, canSort: false },
    order: { canFilter: true, canSort: true },
    createdAt: { canFilter: true, canSort: true },
    updatedAt: { canFilter: true, canSort: true },
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

  async create(
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

  async getEnabledSections(): Promise<HomepageSectionDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("enabled", "==", true)
        .orderBy("order", "asc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<HomepageSectionDocument>(doc),
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to retrieve enabled sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getDisabledSections(): Promise<HomepageSectionDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where("enabled", "==", false)
        .orderBy("order", "asc")
        .get();

      return snapshot.docs.map((doc) =>
        this.mapDoc<HomepageSectionDocument>(doc),
      );
    } catch (error) {
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
        .where("type", "==", type)
        .limit(1)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return this.mapDoc<HomepageSectionDocument>(doc);
    } catch (error) {
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
      throw new DatabaseError(
        `Failed to reorder sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async updateSectionConfig(
    sectionId: string,
    config: Record<string, unknown>,
  ): Promise<HomepageSectionDocument> {
    try {
      await this.db.collection(this.collection).doc(sectionId).update({
        config,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
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
      throw new DatabaseError(
        `Failed to batch toggle sections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async resetSectionToDefault(
    sectionId: string,
    defaultConfig: Record<string, unknown>,
  ): Promise<HomepageSectionDocument> {
    try {
      await this.db.collection(this.collection).doc(sectionId).update({
        config: defaultConfig,
        updatedAt: new Date(),
      });

      return await this.findByIdOrFail(sectionId);
    } catch (error) {
      throw new DatabaseError(
        `Failed to reset section: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

export const homepageSectionsRepository = new HomepageSectionsRepository();
