import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section, Caption } from "../../../ui";
const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-violet-700 to-indigo-700 dark:from-violet-800 dark:to-indigo-800";

export interface FeesViewProps {
  heroBannerClass?: string;
}

export async function FeesView({
  heroBannerClass = DEFAULT_HERO_CLASS,
}: FeesViewProps = {}) {
  const { themed, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("fees");

  const FEE_ROWS = [
    {
      category: t("platformFeeTitle"),
      rate: t("platformFeeRate"),
      who: t("paidBySeller"),
      note: t("platformFeeNote"),
    },
    {
      category: t("gatewayFeeTitle"),
      rate: t("gatewayFeeRate"),
      who: t("paidBySeller"),
      note: t("gatewayFeeNote"),
    },
    {
      category: t("gstTitle"),
      rate: t("gstRate"),
      who: t("paidBySeller"),
      note: t("gstNote"),
    },
    {
      category: t("buyerFeeTitle"),
      rate: t("buyerFeeRate"),
      who: t("paidByBuyer"),
      note: t("buyerFeeNote"),
    },
    {
      category: t("offerFeeTitle"),
      rate: t("offerFeeRate"),
      who: t("paidByBuyer"),
      note: t("offerFeeNote"),
    },
    {
      category: t("shippingFeeTitle"),
      rate: t("shippingFeeRate"),
      who: t("paidByBuyer"),
      note: t("shippingFeeNote"),
    },
  ];

  const OFFER_PAYOUT_ROWS = [
    { label: t("grossSale"), example: "₹1,000" },
    { label: `${t("platformFeeTitle")} (5%)`, example: "− ₹50" },
    { label: `${t("gatewayFeeTitle")} (2.36%)`, example: "− ₹23.60" },
    { label: `${t("gstTitle")} on platform fee (18%)`, example: "− ₹9" },
    { label: t("netPayoutLabel"), example: "= ₹917.40", highlight: true },
  ];

  void ROUTES; // ROUTES imported for future CTA links if needed

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="feesview-div-100">
      {/* Hero */}
      <Section
        className={`${heroBannerClass} text-white py-14 md:py-16 lg:py-20`}
      >
        <div className={`${page.container.sm} text-center`} data-section="feesview-div-101">
          <Heading level={1} variant="none" className="mb-4 text-white">
            {t("title")}
          </Heading>
          <Text variant="none" className="text-white/80 max-w-2xl mx-auto">
            {t("subtitle")}
          </Text>
        </div>
      </Section>

      <div
        className={`${page.container.sm} py-10 md:py-12 lg:py-16 space-y-12`}
       data-section="feesview-div-102">
        {/* Fee table */}
        <Section>
          <Heading level={2} className="mb-6">
            {t("tableTitle")}
          </Heading>
          <div className={`overflow-x-auto rounded-xl border ${themed.border}`} data-section="feesview-div-103">
            <table className="w-full text-sm">
              <thead className={themed.bgSecondary}>
                <tr>
                  <th className="py-3 px-4 text-left font-semibold">
                    {t("colFeeType")}
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">
                    {t("colRate")}
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">
                    {t("colPaidBy")}
                  </th>
                  <th className="py-3 px-4 text-left font-semibold hidden md:table-cell">
                    {t("colNote")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {FEE_ROWS.map((row) => (
                  <tr
                    key={row.category}
                    className={`${themed.bgPrimary} hover:bg-neutral-50 dark:hover:bg-neutral-800/50`}
                  >
                    <td className="py-3 px-4 font-medium">{row.category}</td>
                    <td className="py-3 px-4 font-semibold text-violet-700 dark:text-violet-400">
                      {row.rate}
                    </td>
                    <td className="py-3 px-4">
                      <Caption>{row.who}</Caption>
                    </td>
                    <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 hidden md:table-cell text-xs">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Caption className="mt-3 block text-neutral-500">
            {t("tableNote")}
          </Caption>
        </Section>

        {/* Seller payout example */}
        <Section>
          <Heading level={2} className="mb-3">
            {t("payoutExampleTitle")}
          </Heading>
          <Text variant="secondary" className="mb-6">
            {t("payoutExampleSubtitle")}
          </Text>
          <div
            className={`rounded-xl border ${themed.border} ${themed.bgPrimary} p-5 max-w-sm`}
           data-section="feesview-div-104">
            <Heading level={3} className="text-base mb-4">
              {t("payoutExampleProduct")}
            </Heading>
            <div className="space-y-2" data-section="feesview-div-105">
              {OFFER_PAYOUT_ROWS.map((row, i) => (
                <div
                  key={i}
                  className={`flex justify-between text-sm ${
                    row.highlight
                      ? "border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2 font-bold"
                      : ""
                  }`}
                 data-section="feesview-div-106">
                  <Text
                    className={
                      row.highlight
                        ? "font-bold"
                        : "text-neutral-600 dark:text-neutral-400"
                    }
                  >
                    {row.label}
                  </Text>
                  <Text
                    className={
                      row.highlight
                        ? "font-bold text-green-700 dark:text-green-400"
                        : ""
                    }
                  >
                    {row.example}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Disclaimer */}
        <Section
          className={`rounded-xl border ${themed.border} p-5 ${themed.bgSecondary}`}
        >
          <Heading level={3} className="text-base mb-2">
            {t("disclaimerTitle")}
          </Heading>
          <Caption className="leading-relaxed">{t("disclaimerText")}</Caption>
        </Section>
      </div>
    </div>
  );
}
