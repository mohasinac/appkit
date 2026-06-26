import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { THEMED_BG_PRIMARY, THEMED_BG_SECONDARY } from "../../../_internal/shared/styles/themed";
import { Caption, Div, Heading, Row, Section, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "../../../ui";
const __P = {
  p5: "p-5",
} as const;

const __O = {
  xAuto: "overflow-x-auto",
} as const;

const CLS_RATE_CELL = "py-3 px-4 font-semibold text-violet-700 dark:text-violet-400";
const CLS_HIGHLIGHT = "font-bold text-green-700 dark:text-green-400";

export interface FeesViewProps {
}

export async function FeesView({
}: FeesViewProps = {}) {
  const themed = { bgPrimary: THEMED_BG_PRIMARY, bgSecondary: THEMED_BG_SECONDARY };
  const page = { container: PAGE_CONTAINER };
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
    <Div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10">
      <Section color="inverse" tone="accent-banner" padding="banner">
        <Div className={`${page.container.sm} text-center`}>
          <Heading color="inverse" level={1} variant="none" className="mb-4">{t("title")}</Heading>
          <Text color="inverse" variant="none" className="/80 max-w-2xl mx-auto">{t("subtitle")}</Text>
        </Div>
      </Section>
      <Stack gap="section" className={`${page.container.sm}`} padding="content-banner">
        {renderFeeTableSection(t, themed, FEE_ROWS)}
        {renderPayoutExampleSection(t, themed, OFFER_PAYOUT_ROWS)}
        {renderDisclaimerSection(t, themed)}
      </Stack>
    </Div>
  );
}

type TranslateFn = Awaited<ReturnType<typeof import("next-intl/server").getTranslations>>;
type ThemedTokens = { bgPrimary: string; bgSecondary: string };
type FeeRow = { category: string; rate: string; who: string; note: string };
type PayoutRow = { label: string; example: string; highlight?: boolean };

function renderFeeTableSection(t: TranslateFn, themed: ThemedTokens, rows: FeeRow[]) {
  return (
    <Section>
      <Heading level={2} className="mb-6">{t("tableTitle")}</Heading>
      <Div className={`${__O.xAuto}`} border="default" rounded="xl">
        <Table size="sm">
          <Thead className={themed.bgSecondary}>
            <Tr>
              <Th className="text-left" padding="md" weight="semibold">{t("colFeeType")}</Th>
              <Th className="text-left" padding="md" weight="semibold">{t("colRate")}</Th>
              <Th className="text-left" padding="md" weight="semibold">{t("colPaidBy")}</Th>
              <Th className="text-left hidden md:table-cell" padding="md" weight="semibold">{t("colNote")}</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((row) => (
              <Tr key={row.category} className={`${themed.bgPrimary} hover:bg-neutral-50 dark:hover:bg-neutral-800/50`}>
                <Td weight="medium" padding="md">{row.category}</Td>
                <Td className={CLS_RATE_CELL}>{row.rate}</Td>
                <Td padding="md"><Caption>{row.who}</Caption></Td>
                <Td className="text-neutral-500 dark:text-neutral-400 hidden md:table-cell" padding="md" size="xs">{row.note}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Div>
      <Caption className="mt-3 block" color="muted">{t("tableNote")}</Caption>
    </Section>
  );
}

function renderPayoutExampleSection(t: TranslateFn, themed: ThemedTokens, rows: PayoutRow[]) {
  return (
    <Section>
      <Heading level={2} className="mb-3">{t("payoutExampleTitle")}</Heading>
      <Text variant="secondary" className="mb-6">{t("payoutExampleSubtitle")}</Text>
      <Div className={`${__P.p5} max-w-sm`} border="default" surface="muted" rounded="xl">
        <Heading level={3} className="mb-4" size="base">{t("payoutExampleProduct")}</Heading>
        <Stack gap="sm">
          {rows.map((row, i) => (
            <Row textWeight="bold" textSize="sm" key={i} className={`${row.highlight ? "border-t border-neutral-200 dark:border-neutral-700 mt-2" : ""}`} paddingY={row.highlight ? "t-xs" : undefined} justify="between">
              <Text className={row.highlight ? "font-bold" : "text-neutral-600 dark:text-neutral-400"}>{row.label}</Text>
              <Text className={row.highlight ? CLS_HIGHLIGHT : ""}>{row.example}</Text>
            </Row>
          ))}
        </Stack>
      </Div>
    </Section>
  );
}

function renderDisclaimerSection(t: TranslateFn, themed: ThemedTokens) {
  return (
    <Section className={`${__P.p5}`} border="default" surface="subtle" rounded="xl">
      <Heading level={3} className="mb-2" size="base">{t("disclaimerTitle")}</Heading>
      <Caption className="leading-relaxed">{t("disclaimerText")}</Caption>
    </Section>
  );
}
