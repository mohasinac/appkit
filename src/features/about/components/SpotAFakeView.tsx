import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { THEMED_BG_PRIMARY, THEMED_BG_SECONDARY } from "../../../_internal/shared/styles/themed";
import {
  Alert,
  Div,
  Heading,
  Row,
  Section,
  Stack,
  Text,
  TextLink,
} from "../../../ui";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;

export interface SpotAFakeViewProps {}

/**
 * D6 — the spot-a-fake guide.
 *
 * ## 🛑 The framing is the finding, and it is not the obvious one
 *
 * The crawl's counterfeit intelligence (plan section 3.7) measured something
 * counter-intuitive: the largest seller of copies in this market makes **ZERO
 * authenticity claims**. It sells itself as an "aftermarket brand" at a
 * fraction of the real price and leaves the inference to the buyer. So a guide
 * written as "here is how they pretend to be real" would be describing a
 * deception that is not happening, and would teach the wrong signals.
 *
 * What actually distinguishes them is silence plus price, then code, then
 * weight — which is why this page is ordered that way and why the authenticity
 * section explains that **"unknown" is a legitimate answer**. A guide that
 * treated every non-original as a fraud would push honest second-hand sellers
 * into overclaiming, which makes the catalogue less truthful, not more.
 *
 * ## 🛑 Every signal here is one the SITE can back up
 *
 * The price band comes from the realised-price index, the printed codes come
 * from the canonical corpus, and the part weights come from the part glossary —
 * 963 slots carrying their weight as fitted. A guide that said "check the
 * weight" without somewhere to check it against would be advice shaped like
 * help, so each signal links to the surface that answers it.
 */
export async function SpotAFakeView({}: SpotAFakeViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const themed = { bgPrimary: THEMED_BG_PRIMARY, bgSecondary: THEMED_BG_SECONDARY };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("spotAFake");

  const SIGNALS = [
    { n: 1, title: t("signal1Title"), text: t("signal1Text"), href: String(ROUTES.PUBLIC.TOOL_PRICE_INDEX) },
    { n: 2, title: t("signal2Title"), text: t("signal2Text"), href: null },
    { n: 3, title: t("signal3Title"), text: t("signal3Text"), href: String(ROUTES.PUBLIC.PARTS) },
    { n: 4, title: t("signal4Title"), text: t("signal4Text"), href: null },
    { n: 5, title: t("signal5Title"), text: t("signal5Text"), href: null },
    { n: 6, title: t("signal6Title"), text: t("signal6Text"), href: null },
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
          <Alert variant="warning" className="mb-8">
            <Text weight="semibold">{t("whyTitle")}</Text>
            <Text size="sm">{t("whyText")}</Text>
          </Alert>

          <Heading level={2} size="xl" weight="semibold" className="mb-4">
            {t("signalsTitle")}
          </Heading>
          <Stack gap="md">
            {SIGNALS.map((s) => (
              <Div key={s.n} className={__P.p5} surface="card" rounded="xl" border="subtle">
                <Heading level={3} size="lg" weight="semibold" className="mb-1">
                  {`${s.n}. ${s.title}`}
                </Heading>
                <Text color="muted">{s.text}</Text>
                {/*
                  * Each signal that the SITE can answer links to where it is
                  * answered. A guide saying "check the weight" with nowhere to
                  * check against is advice shaped like help.
                  */}
                {s.href && (
                  <Div padding="t-xs">
                    <TextLink href={s.href} size="sm">
                      {s.n === 1 ? t("linkTools") : t("linkParts")}
                    </TextLink>
                  </Div>
                )}
              </Div>
            ))}
          </Stack>
        </Div>
      </Section>

      <Section className={themed.bgSecondary} padding="y-xl">
        <Div className={page.container.lg}>
          <Stack gap="lg">
            <Div className={__P.p5} surface="card" rounded="xl" border="subtle">
              <Heading level={3} size="lg" weight="semibold" className="mb-2">
                {t("authenticityTitle")}
              </Heading>
              <Text color="muted">{t("authenticityText")}</Text>
            </Div>
            <Div className={__P.p5} surface="card" rounded="xl" border="subtle">
              <Heading level={3} size="lg" weight="semibold" className="mb-2">
                {t("reportTitle")}
              </Heading>
              <Text color="muted">{t("reportText")}</Text>
              <Row gap="md" wrap className="mt-3">
                <TextLink href={String(ROUTES.PUBLIC.REPORT_ENTITY)}>{t("linkReport")}</TextLink>
                <TextLink href={String(ROUTES.PUBLIC.SCAMS)}>{t("linkScams")}</TextLink>
              </Row>
            </Div>
          </Stack>
        </Div>
      </Section>
    </Div>
  );
}
