"use client";

/**
 * LabelsProvider — zero-dependency i18n bridge for appkit components.
 *
 * appkit ships NO translation bundles and makes NO calls to next-intl,
 * react-intl, or any other i18n library. Instead, every component that
 * renders visible text accepts a `labels` prop typed as a feature-scoped
 * record. Default values are English fallbacks for development only.
 *
 * For shells that render many descendant components, compose a single
 * AppkitLabelSet and pass it once through LabelsProvider at layout level.
 *
 * @example
 * // layout.tsx
 * const t = await getTranslations({ locale, namespace: "appkit" });
 * const labels: AppkitLabelSet = {
 *   "products.detail": { addToCart: t("products.detail.addToCart"), ... },
 * };
 * return <LabelsProvider value={labels}>{children}</LabelsProvider>;
 *
 * // ProductDetailView.tsx (inside appkit)
 * const t = useLabels("products.detail");
 * // t.addToCart → consumer-supplied string (or DEFAULT fallback)
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

/** Union of all feature label namespaces — extended as features migrate to _internal/ */
export type AppkitLabelSet = Record<string, Record<string, string>>;

const LabelsContext = createContext<AppkitLabelSet>({});

export function LabelsProvider({
  value,
  children,
}: {
  value: AppkitLabelSet;
  children: ReactNode;
}) {
  return (
    <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>
  );
}

/**
 * Returns the label map for a given namespace key.
 * Falls back to an empty object when the namespace was not supplied,
 * so components using DEFAULT_*_LABELS fallbacks remain functional.
 */
export function useLabels<K extends string>(key: K): Record<string, string> {
  return useContext(LabelsContext)[key] ?? {};
}
