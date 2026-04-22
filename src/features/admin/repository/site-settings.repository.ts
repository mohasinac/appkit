/**
 * Site Settings Repository
 *
 * Manages site-wide configuration settings (singleton document)
 */

import {
  BaseRepository,
  prepareForFirestore,
} from "../../../providers/db-firebase";
import { cacheManager } from "../../../core";
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
              defaultSettings as unknown as Record<string, unknown>,
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
      throw new DatabaseError(
        `Failed to retrieve site settings: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
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
        const existingCreds: SiteSettingsCredentials =
          existing.credentials ?? {};
        const encryptedCreds: SiteSettingsCredentials = { ...existingCreds };

        for (const [key, value] of Object.entries(updates.credentials) as [
          keyof SiteSettingsCredentials,
          string | undefined,
        ][]) {
          if (value && value.trim()) {
            // Non-empty plaintext → encrypt and store
            encryptedCreds[key] = encryptSecret(value.trim());
          }
          // Empty / undefined → keep whatever was already stored
        }

        finalUpdates = { ...updates, credentials: encryptedCreds };
      }

      const updateData = prepareForFirestore({
        ...finalUpdates,
        updatedAt: new Date(),
      });

      await this.db
        .collection(this.collection)
        .doc(this.SINGLETON_ID)
        .update(updateData);

      const latest = await this.getSingleton();
      cacheManager.set(this.cacheKey(), latest, {
        ttl: SiteSettingsRepository.CACHE_TTL_MS,
      });
      return latest;
    } catch (error) {
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
        } catch {
          result[key] = ""; // auth-tag mismatch or malformed blob → treat as missing
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
  async exists(): Promise<boolean> {
    try {
      const doc = await this.db
        .collection(this.collection)
        .doc(this.SINGLETON_ID)
        .get();
      return doc.exists;
    } catch {
      return false;
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
          defaultSettings as unknown as Record<string, unknown>,
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
