import type { FirestoreDocument, FirestoreValue } from "../../../schemas/types";
import { normalizeError } from "../../../errors/normalize";
import { serverLogger } from "../../../monitoring/server-logger";

/**
 * Site Settings Repository
 *
 * Manages site-wide configuration settings (singleton document)
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
/*
 * The DEFINING module, not the `core` barrel — Root Cause #18. `core/index.ts`
 * re-exports `unitOfWork`, which imports this very repository, so reaching
 * `cacheManager` through the barrel closed a six-module import cycle
 * (`audit-import-cycles` component 2). `CacheManager.ts` imports nothing from
 * here, so the deep path has one direction only.
 */
import { cacheManager } from "../../../core/CacheManager";
import {
  SITE_SETTINGS_COLLECTION,
  SiteSettingsDocument,
  SiteSettingsCredentials,
  SiteSettingsCredentialsMasked,
  SiteSettingsUpdateInput,
  DEFAULT_SITE_SETTINGS_DATA,
} from "../schemas";
import { DatabaseError } from "../../../errors";
import { decryptSecret, encryptSecret, maskSecret } from "../../../security";

/**
 * Flatten a nested update into Firestore dotted field paths, so a partial
 * group update MERGES into the stored map instead of replacing it.
 *
 * `update({ commissions: { gstPercent: 18 } })` deletes every other key under
 * `commissions`; `update({ "commissions.gstPercent": 18 })` touches one leaf.
 * See the call site for the five keys that were silently destroyed by the
 * former (D13).
 *
 * Three cases are deliberately NOT recursed into:
 *
 * · **Arrays** — an array is a VALUE, not a map. Flattening
 *   `legalPages.sections.0.title` would make a shorter replacement array leave
 *   the old tail in place, which is a worse bug than the one being fixed.
 * · **`undefined`** — kept at its own path so a caller can still delete a
 *   field. Recursing would turn it into a path to nothing.
 * · **`Date` and any other class instance** — Firestore stores a `Date` as a
 *   Timestamp; walking its properties would write `{}`. Tested by rejecting
 *   anything whose prototype is not `Object.prototype`, which also covers
 *   `FieldValue` sentinels and `Timestamp` itself.
 */
/*
 * `FirestoreDocument`, not `Record<string, unknown>` — its own docstring says
 * "use as the document shape for Firestore-backed repositories and mapDoc
 * helpers". `unknown` values made every branch below unchecked, which is what
 * audit-unknown-leakage reports; `FirestoreValue` admits exactly what Firestore
 * round-trips (JSON + Date + undefined) and nothing else.
 */
export function toDottedPaths(
  input: FirestoreDocument,
  prefix = "",
): FirestoreDocument {
  const out: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(input)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isPlainObject =
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype;

    if (isPlainObject) {
      const nested = toDottedPaths(value as FirestoreDocument, path);
      /*
       * An EMPTY object is written at its own path rather than vanishing.
       * `{ watermark: {} }` is a caller saying "clear this group"; dropping it
       * because it produced no leaves would silently ignore the instruction.
       */
      if (Object.keys(nested).length === 0) out[path] = value;
      else Object.assign(out, nested);
    } else {
      out[path] = value;
    }
  }
  return out;
}

/**
 * Repository for site settings management
 *
 * Note: Site settings is a singleton document with ID "global"
 */
export class SiteSettingsRepository extends BaseRepository<SiteSettingsDocument> {
  /**
   * Singleton document ID
   */
  private readonly SINGLETON_ID = "global";
  private static readonly CACHE_TTL_MS = 60_000;

  constructor() {
    super(SITE_SETTINGS_COLLECTION);
  }

  private cacheKey(): string {
    return `repo:site-settings:${this.SINGLETON_ID}`;
  }

  /**
   * Get the global site settings
   * Creates default settings if not exists
   *
   * @returns Promise<SiteSettingsDocument>
   */
  async getSingleton(): Promise<SiteSettingsDocument> {
    const cached = cacheManager.get<SiteSettingsDocument>(this.cacheKey());
    if (cached) return cached;

    try {
      const doc = await this.db
        .collection(this.collection)
        .doc(this.SINGLETON_ID)
        .get();

      if (!doc.exists) {
        // Create default settings on first access
        const defaultSettings: SiteSettingsDocument = {
          id: this.SINGLETON_ID,
          ...DEFAULT_SITE_SETTINGS_DATA,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as SiteSettingsDocument;

        await this.db
          .collection(this.collection)
          .doc(this.SINGLETON_ID)
          .set(
            prepareForFirestore(
              defaultSettings,
            ),
          );

        cacheManager.set(this.cacheKey(), defaultSettings, {
          ttl: SiteSettingsRepository.CACHE_TTL_MS,
        });

        return defaultSettings;
      }

      const mapped = this.mapDoc<SiteSettingsDocument>(doc);
      cacheManager.set(this.cacheKey(), mapped, {
        ttl: SiteSettingsRepository.CACHE_TTL_MS,
      });
      return mapped;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to retrieve site settings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private mergeEncryptedCredentials(
    existing: SiteSettingsCredentials,
    updates: Partial<SiteSettingsCredentials>,
  ): SiteSettingsCredentials {
    const encrypted: SiteSettingsCredentials = { ...existing };
    for (const [key, value] of Object.entries(updates) as [
      keyof SiteSettingsCredentials,
      string | Record<string, string> | undefined,
    ][]) {
      if (typeof value === "string" && value.trim()) {
         
        (encrypted as any)[key] = encryptSecret(value.trim());
      } else if (value !== undefined && typeof value !== "string") {
        // Non-string credential fields (e.g. a nested Record<string,string>)
        // are stored as-is — they are not secret values to encrypt.
         
        (encrypted as any)[key] = value;
      }
      // Empty / undefined → keep whatever was already stored
    }
    return encrypted;
  }

  /**
   * Update the global site settings
   *
   * Credentials are encrypted before being written to Firestore.
   * Pass an empty string for a credential field to leave it unchanged.
   *
   * @param updates - Partial updates to apply
   * @returns Promise<SiteSettingsDocument>
   */
  async updateSingleton(
    updates: SiteSettingsUpdateInput,
  ): Promise<SiteSettingsDocument> {
    try {
      cacheManager.delete(this.cacheKey());

      let finalUpdates: SiteSettingsUpdateInput = updates;

      if (updates.credentials) {
        const existing = await this.getSingleton();
        const encryptedCreds = this.mergeEncryptedCredentials(
          existing.credentials ?? {},
          updates.credentials,
        );
        finalUpdates = { ...updates, credentials: encryptedCreds };
      }

      const updateData = prepareForFirestore({
        ...finalUpdates,
        updatedAt: new Date(),
      });

      /*
       * ── D13: DOTTED PATHS, not a wholesale nested-map replace ────────────
       *
       * 🛑 This was `.update(updateData)` with nested objects, and Firestore's
       * `update()` REPLACES a nested map wholesale rather than merging into
       * it. So saving `{ commissions: { platformFeePercent: 2 } }` deleted
       * every other key under `commissions`.
       *
       * That is not hypothetical. `AdminSiteSettingsView`'s commissions
       * payload omitted FIVE keys — `saleProtectionFeeEnabled`,
       * `saleProtectionFeePercent`, `saleProtectionFeeMin`,
       * `codHandlingFeeCap`, `codHandlingFeePercent` — with no state, no field
       * and no control for any of them. So the FIRST save of any commissions
       * field silently:
       *
       *   · stopped sale protection being sold, a product we charge 3% (min
       *     ₹49) for, with no error and nothing in the UI to notice; and
       *   · reverted COD handling to code defaults.
       *
       * It also made CLAUDE.md's stated remediation — "enable them once at
       * Admin → Site Settings → Commissions" — impossible, because there was
       * no control there to enable them with.
       *
       * Flattening to dotted paths is the structural fix: `commissions.gstPercent`
       * touches exactly that leaf. The alternative (adding the five missing
       * fields to the form) fixes TODAY'S instance and leaves the next group
       * that grows a field to hit the same wall — and `legalPages` had already
       * hit it independently (D19), which is the evidence that this recurs.
       *
       * 🛑 ARRAYS AND `undefined` ARE NOT FLATTENED. An array is a value, not a
       * map: flattening `legalPages.sections.0.title` would make a shorter
       * replacement array leave the old tail behind. And `undefined` must stay
       * a top-level delete rather than becoming a dotted path to nothing.
       */
      await this.db
        .collection(this.collection)
        .doc(this.SINGLETON_ID)
        .update(toDottedPaths(updateData as FirestoreDocument));

      const latest = await this.getSingleton();
      cacheManager.set(this.cacheKey(), latest, {
        ttl: SiteSettingsRepository.CACHE_TTL_MS,
      });
      return latest;
    } catch (error) {
      void normalizeError(error);
      throw new DatabaseError(
        `Failed to update site settings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Decrypt all stored provider credentials.
   * FOR INTERNAL BACKEND USE ONLY — never return plaintext to the client.
   *
   * Falls back gracefully: returns an empty string for any field that
   * cannot be decrypted (wrong key, missing value, etc.).
   */
  async getDecryptedCredentials(): Promise<Record<string, string>> {
    const settings = await this.getSingleton();
    const creds = settings.credentials ?? {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(creds)) {
      if (value) {
        try {
          result[key] = decryptSecret(value);
        } catch (_err) {
          void normalizeError(_err); // Auth-tag mismatch or key rotation — treat as missing credential
          result[key] = "";
        }
      }
    }
    return result;
  }

  /**
   * Return masked credential values for the admin UI (e.g. "rzp_li…key4").
   * Safe to include in API responses for authenticated admins.
   */
  async getCredentialsMasked(): Promise<SiteSettingsCredentialsMasked> {
    const decrypted = await this.getDecryptedCredentials();
    const masked: SiteSettingsCredentialsMasked = {};
    for (const [key, value] of Object.entries(decrypted)) {
      (masked as Record<string, string>)[key] = value ? maskSecret(value) : "";
    }
    return masked;
  }

  /**
   * Get FAQ variables for interpolation
   *
   * @returns Promise<Record<string, string | number>>
   */
  async getFAQVariables(): Promise<Record<string, string | number>> {
    const settings = await this.getSingleton();
    return settings.faq?.variables || {};
  }

  /**
   * Update FAQ variables
   *
   * @param variables - New FAQ variable values
   * @returns Promise<void>
   */
  async updateFAQVariables(variables: {
    shippingDays: number;
    minOrderValue: number;
    returnWindow: number;
    supportEmail: string;
    supportPhone: string;
    codDeposit: number;
  }): Promise<void> {
    await this.updateSingleton({
      faq: { variables },
    } as any);
  }

  /**
   * Get site features
   *
   * @returns Promise<Array<{id, icon, title, description}>>
   */
  async getFeatures() {
    const settings = await this.getSingleton();
    return settings.features || [];
  }

  /**
   * Update site features
   *
   * @param features - New features array
   * @returns Promise<void>
   */
  async updateFeatures(
    features: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      enabled: boolean;
    }>,
  ): Promise<void> {
    await this.updateSingleton({ features } as any);
  }

  /**
   * Get email settings for transactional emails
   *
   * @returns Promise<{fromName, fromEmail, replyTo}>
   */
  async getEmailSettings() {
    const settings = await this.getSingleton();
    return settings.emailSettings;
  }

  /**
   * Check if site settings exist
   *
   * @returns Promise<boolean>
   */
  override async exists(): Promise<boolean> {
    try {
      const doc = await this.db
        .collection(this.collection)
        .doc(this.SINGLETON_ID)
        .get();
      return doc.exists;
    } catch (err) {
      void normalizeError(err);
      serverLogger.error("site-settings-repo: exists() Firestore read failed — rethrowing to avoid masking missing settings", { error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }

  /**
   * Reset site settings to defaults
   * WARNING: This will overwrite all custom settings
   *
   * @returns Promise<SiteSettingsDocument>
   */
  async resetToDefaults(): Promise<SiteSettingsDocument> {
    const defaultSettings: SiteSettingsDocument = {
      id: this.SINGLETON_ID,
      ...DEFAULT_SITE_SETTINGS_DATA,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SiteSettingsDocument;

    await this.db
      .collection(this.collection)
      .doc(this.SINGLETON_ID)
      .set(
        prepareForFirestore(
          defaultSettings,
        ),
      );

    cacheManager.set(this.cacheKey(), defaultSettings, {
      ttl: SiteSettingsRepository.CACHE_TTL_MS,
    });

    return defaultSettings;
  }
}

// Export singleton instance
export const siteSettingsRepository = new SiteSettingsRepository();
