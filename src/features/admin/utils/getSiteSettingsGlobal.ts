import { cache } from "react";
import { siteSettingsRepository } from "../repository/site-settings.repository";

/** React.cache deduplication — one Firestore read per RSC request tree. */
export const getSiteSettingsGlobal = cache(() => siteSettingsRepository.getSingleton());
