import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { THEMED_BG_PRIMARY, THEMED_BG_SECONDARY } from "../../../_internal/shared/styles/themed";
import {
  Alert,
  Caption,
  Div,
  Heading,
  Row,
  Section,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  TextLink,
  Th,
  Thead,
  Tr,
} from "../../../ui";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;

const __O = {
  xAuto: "overflow-x-auto",
} as const;

export interface GstExplainerViewProps {}

/**
 * D6b — how GST works on LetItRip, for buyers and for sellers.
 *
 * ## 🛑 Why this page is a differentiator rather than table stakes
 *
 * The round-2 crawl checked seventeen Indian collectibles sites. Exactly ONE
 * (`otakuisland.in`) states tax-inclusive pricing to the buyer in words — *"All
 * prices include GST and there are no hidden charges."* The other sixteen say
 * nothing at all, which means a buyer cannot tell whether the number on the card
 * is what they will pay. Saying it plainly, with the rate bands and who bears
 * what, is the cheapest trust signal available here.
 *
 * ## 🛑 What this page deliberately does NOT claim
 *
 * It does not say "your invoice carries GST today". Charging GST requires a
 * registered GSTIN on `siteSettings.gst`, and `validateGstEnablement` runs a
 * real checksum and refuses an invented one — so until that is entered, orders
 * compute tax at 0 and the Tax row does not render. A page asserting otherwise
 * would be a false statement about a compliance matter, which is the one place
 * this codebase cannot afford confident prose. Everything below is written as
 * "when GST applies", which is true either way.
 *
 * Every figure traces to the model written down in the plan's C0b/C0c and to
 * `taxCodes` — nothing here is an invented rate.
 */
export async function GstExplainerView({}: GstExplainerViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const themed = { bgPrimary: THEMED_BG_PRIMARY, bgSecondary: THEMED_BG_SECONDARY };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("gstGuide");

  /*
   * The rate bands, which are a property of the HSN code a category carries —
   * not of the seller and not of the buyer's state. Stated as bands rather than
   * as one number because the catalogue genuinely spans three.
   */
  const RATE_ROWS = [
    { band: t("band1Label"), rate: "0%", examples: t("band1Examples"), hsn: "—" },
    { band: t("band2Label"), rate: "5%", examples: t("band2Examples"), hsn: "9503 0020" },
    { band: t("band3Label"), rate: "18%", examples: t("band3Examples"), hsn: "9503 0010" },
  ];

  const WHO_PAYS = [
    { line: t("whoPays1Item"), who: t("whoPays1Who"), note: t("whoPays1Note") },
    { line: t("whoPays2Item"), who: t("whoPays2Who"), note: t("whoPays2Note") },
    { line: t("whoPays3Item"), who: t("whoPays3Who"), note: t("whoPays3Note") },
    { line: t("whoPays4Item"), who: t("whoPays4Who"), note: t("whoPays4Note") },
  ];

  return (
    <Div>
      <Section className={themed.bgPrimary} padding="y-2xl">
        <Div className={page.container.lg}>
          <Heading level={1} size="3xl" mdSize="4xl" weight="bold" className="mb-3">
            {t("title")}
          </Heading>
          <Text size="lg" color="muted" className="max-w-3xl">
            {t("intro")}
          </Text>
        </Div>
      </Section>

      <Section padding="y-xl">
        <Div className={page.container.lg}>
          {/*
            * The inclusive-pricing promise, first, because it is the one thing a
            * buyer wants before anything else — and the one thing sixteen of
            * seventeen crawled competitors never say.
            */}
          <Alert variant="info" className="mb-8">
            <Text weight="semibold">{t("inclusiveTitle")}</Text>
            <Text size="sm">{t("inclusiveText")}</Text>
          </Alert>

          <Heading level={2} size="xl" weight="semibold" className="mb-4">
            {t("ratesTitle")}
          </Heading>
          <Text color="muted" className="mb-4 max-w-3xl">
            {t("ratesIntro")}
          </Text>
          <Div className={__O.xAuto}>
            <Table size="sm">
              <Thead>
                <Tr border="default">
                  <Th>{t("colBand")}</Th>
                  <Th>{t("colRate")}</Th>
                  <Th>{t("colExamples")}</Th>
                  <Th>{t("colHsn")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {RATE_ROWS.map((r) => (
                  <Tr key={r.band} border="subtle">
                    <Td padding="sm">{r.band}</Td>
                    <Td padding="sm">
                      <Text weight="semibold">{r.rate}</Text>
                    </Td>
                    <Td padding="sm" color="muted">{r.examples}</Td>
                    <Td padding="sm" color="muted">{r.hsn}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Div>
          <Caption className="mt-2">{t("ratesCaption")}</Caption>
        </Div>
      </Section>

      <Section className={themed.bgSecondary} padding="y-xl">
        <Div className={page.container.lg}>
          <Heading level={2} size="xl" weight="semibold" className="mb-4">
            {t("whoPaysTitle")}
          </Heading>
          <Div className={__O.xAuto}>
            <Table size="sm">
              <Thead>
                <Tr border="default">
                  <Th>{t("colLine")}</Th>
                  <Th>{t("colWho")}</Th>
                  <Th>{t("colNote")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {WHO_PAYS.map((r) => (
                  <Tr key={r.line} border="subtle">
                    <Td padding="sm">{r.line}</Td>
                    <Td padding="sm">
                      <Text weight="semibold">{r.who}</Text>
                    </Td>
                    <Td padding="sm" color="muted">{r.note}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Div>
        </Div>
      </Section>

      <Section padding="y-xl">
        <Div className={page.container.lg}>
          <Stack gap="lg">
            <Div className={__P.p5} surface="card" rounded="xl" border="subtle">
              <Heading level={3} size="lg" weight="semibold" className="mb-2">
                {t("splitTitle")}
              </Heading>
              <Text color="muted">{t("splitText")}</Text>
            </Div>
            <Div className={__P.p5} surface="card" rounded="xl" border="subtle">
              <Heading level={3} size="lg" weight="semibold" className="mb-2">
                {t("invoiceTitle")}
              </Heading>
              <Text color="muted">{t("invoiceText")}</Text>
            </Div>
            <Div className={__P.p5} surface="card" rounded="xl" border="subtle">
              <Heading level={3} size="lg" weight="semibold" className="mb-2">
                {t("sellerTitle")}
              </Heading>
              <Text color="muted">{t("sellerText")}</Text>
            </Div>
          </Stack>

          <Row gap="md" wrap className="mt-8">
            <TextLink href={String(ROUTES.PUBLIC.FEES)}>{t("linkFees")}</TextLink>
            <TextLink href={String(ROUTES.PUBLIC.HOW_PAYOUTS_WORK)}>{t("linkPayouts")}</TextLink>
            <TextLink href={String(ROUTES.PUBLIC.FAQS)}>{t("linkFaqs")}</TextLink>
          </Row>
        </Div>
      </Section>
    </Div>
  );
}
