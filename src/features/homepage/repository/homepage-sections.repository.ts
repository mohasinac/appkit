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
  DEFAULT_SECTION_SURFACE,
  HOMEPAGE_SECTIONS_COLLECTION,
  type HomepageSectionCreateInput,
  type HomepageSectionDocument,
  type SectionSurface,
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
    /*
     * 🛑 Required, not optional polish. `sieve.ts` sets
     * `throwExceptions: false`, so a field absent from this allowlist does not
     * raise — `findField()` returns undefined and the clause is silently
     * DROPPED. `?filters=surface==category` would then return every section on
     * every surface while looking like it had filtered. Root Cause #62.
     */
    surface: { canFilter: true, canSort: false },
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
    // Surface participates in the id, or a category `products` section would
    // overwrite the homepage's — same type, same slug, one document.
    const id = createHomepageSectionId(input.type, input.surface);

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

  /**
   * Enabled sections for one surface, in `order`.
   *
   * 🛑 The parameter DEFAULTS to `"homepage"`, and that default is the safety
   * property, not a convenience. This method previously returned every enabled
   * row regardless of surface — so the moment a category-surface row exists,
   * an unfiltered homepage would render it. Defaulting here means the existing
   * homepage call site is correct with no change at all, and a caller that
   * wants another surface has to say so.
   *
   * 🛑 The surface is matched IN MEMORY, deliberately. The only composite index
   * on this collection is `(enabled, order)`;
   * `where(enabled).where(surface).orderBy(order)` is a three-field composite it
   * does not cover, and Firestore throws FAILED_PRECONDITION at RUNTIME rather
   * than at build time. `MarketplaceHomepageView` already filters sections in
   * memory for the listing-type gate — this follows that precedent. Section
   * counts are tens, so the read is unchanged in cost.
   */
  async getEnabledSections(
    surface: SectionSurface = DEFAULT_SECTION_SURFACE,
  ): Promise<HomepageSectionDocument[]> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(HOMEPAGE_SECTION_FIELDS.ENABLED, "==", true)
        .orderBy(HOMEPAGE_SECTION_FIELDS.ORDER, "asc")
        .get();

      return snapshot.docs
        .map((doc) => this.mapDoc<HomepageSectionDocument>(doc))
        // Absent means "homepage" — every row written before `surface` existed
        // was a homepage row, so this keeps all 23 of them on the homepage.
        .filter((row) => (row.surface ?? DEFAULT_SECTION_SURFACE) === surface);
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

  /**
   * 🛑 `surface` is NOT optional in spirit, even though it defaults.
   *
   * This was `where(type == X).limit(1)`, which assumed ONE document per type.
   * With surfaces that assumption is false — a `products` section can exist on
   * the homepage AND on a category page — and `limit(1)` would return whichever
   * Firestore happened to order first. An arbitrary-but-plausible answer is the
   * worst failure shape available here, because nothing errors.
   *
   * The surface is matched IN MEMORY rather than added as a second `where`: the
   * only composite index on this collection is `(enabled, order)`, and
   * `where(type).where(surface)` needs one that does not exist. Fetching the few
   * rows of a type and picking by surface costs nothing at these counts.
   */
  async getSectionByType(
    type: SectionType,
    surface: SectionSurface = DEFAULT_SECTION_SURFACE,
  ): Promise<HomepageSectionDocument | null> {
    try {
      const snapshot = await this.db
        .collection(this.collection)
        .where(HOMEPAGE_SECTION_FIELDS.TYPE, "==", type)
        .get();

      if (snapshot.empty) return null;

      const match = snapshot.docs.find((d) => {
        const rowSurface =
          (d.data() as { surface?: SectionSurface }).surface ?? DEFAULT_SECTION_SURFACE;
        return rowSurface === surface;
      });
      if (!match) return null;
      return this.mapDoc<HomepageSectionDocument>(match);
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
