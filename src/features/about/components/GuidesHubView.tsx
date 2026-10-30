import { ROUTES } from "../../../constants";
import { PAGE_CONTAINER } from "../../../_internal/shared/styles/page";
import { THEMED_BG_PRIMARY } from "../../../_internal/shared/styles/themed";
import { Div } from "../../../ui/components/Div";
import { Grid } from "../../../ui/components/Layout";
import { Heading, Text } from "../../../ui/components/Typography";
import { Section } from "../../../ui/components/Semantic";
import { TextLink } from "../../../ui/components/TextLink";

const __P = {
  p5: "p-[var(--appkit-space-5)]",
} as const;

/**
 * D6 — the content hub: every explainer this site owns, in one place.
 *
 * ## 🛑 Why an index page is worth its own route here
 *
 * There are **fourteen** explainers (`/how-collector-drops-work` … `/fees`, `/gst`,
 * `/spot-a-fake`, the two seller guides) and the only way to reach most of them
 * is the footer. A footer link is reachable but it is not a *destination*: it
 * cannot rank, it cannot be linked to from a blog post as "our guides", and it
 * gives a crawler no page that establishes the topical cluster these fourteen
 * form. worldhobbyshop's measured SEO edge is category bodies plus internal
 * linking depth, and this is the cheapest internal-linking structure available
 * — one page that links fourteen, each of which links back.
 *
 * ## 🛑 The list is hand-curated and that is deliberate
 *
 * It would be tidier to derive it from `FOOTER_LINK_GROUPS`, and wrong: that
 * array mixes browse surfaces, legal pages and dashboards with the explainers,
 * so deriving would need a filter which is itself a second hand-maintained
 * list — one keyed on nothing. A guide either belongs in a learning index or it
 * does not, and that is an editorial judgement, not a derivation.
 *
 * Every href is a `ROUTES` constant, so `audit-nav-page-wiring` fails the build
 * if any of them stops resolving to a real page.
 */
export interface GuidesHubViewProps {}

export async function GuidesHubView({}: GuidesHubViewProps = {}) {
  const page = { container: PAGE_CONTAINER };
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("guidesHub");

  const GROUPS = [
    {
      heading: t("groupBuyingTitle"),
      blurb: t("groupBuyingBlurb"),
      items: [
        { href: String(ROUTES.PUBLIC.HOW_COLLECTOR_DROPS_WORK), label: t("howCollectorDrops"), text: t("howCollectorDropsText") },
        { href: String(ROUTES.PUBLIC.HOW_OFFERS_WORK), label: t("howOffers"), text: t("howOffersText") },
        { href: String(ROUTES.PUBLIC.HOW_PRE_ORDERS_WORK), label: t("howPreOrders"), text: t("howPreOrdersText") },
        { href: String(ROUTES.PUBLIC.HOW_CHECKOUT_WORKS), label: t("howCheckout"), text: t("howCheckoutText") },
        { href: String(ROUTES.PUBLIC.HOW_EMI_WORKS), label: t("howEmi"), text: t("howEmiText") },
        { href: String(ROUTES.PUBLIC.HOW_ORDERS_WORK), label: t("howOrders"), text: t("howOrdersText") },
      ],
    },
    {
      heading: t("groupMoneyTitle"),
      blurb: t("groupMoneyBlurb"),
      items: [
        { href: String(ROUTES.PUBLIC.FEES), label: t("fees"), text: t("feesText") },
        { href: String(ROUTES.PUBLIC.GST), label: t("gst"), text: t("gstText") },
        { href: String(ROUTES.PUBLIC.HOW_PAYOUTS_WORK), label: t("howPayouts"), text: t("howPayoutsText") },
        { href: String(ROUTES.PUBLIC.SHIPPING_POLICY), label: t("shipping"), text: t("shippingText") },
        { href: String(ROUTES.PUBLIC.REFUND_POLICY), label: t("refunds"), text: t("refundsText") },
      ],
    },
    {
      heading: t("groupTrustTitle"),
      blurb: t("groupTrustBlurb"),
      items: [
        { href: String(ROUTES.PUBLIC.SPOT_A_FAKE), label: t("spotAFake"), text: t("spotAFakeText") },
        { href: String(ROUTES.PUBLIC.SCAMS), label: t("scams"), text: t("scamsText") },
        { href: String(ROUTES.PUBLIC.HOW_REVIEWS_WORK), label: t("howReviews"), text: t("howReviewsText") },
        { href: String(ROUTES.PUBLIC.SECURITY), label: t("security"), text: t("securityText") },
      ],
    },
    {
      heading: t("groupSellingTitle"),
      blurb: t("groupSellingBlurb"),
      items: [
        { href: String(ROUTES.PUBLIC.SELLER_GUIDE), label: t("sellerGuide"), text: t("sellerGuideText") },
        /*
         * 🛑 HIDDEN BLOCK — the bundle and random-lots guides, withdrawn
         * 2026-10-20 alongside the footer entries for those listing types
         * (`HIDDEN_FOOTER_LINK_HREFS`, src/constants/navigation.tsx). A hub
         * card is a promise that the thing it describes is open for business;
         * teaching a seller to run random lots they cannot currently publish
         * is worse than saying nothing.
         *
         * The pages, the routes and the `guidesHub.bundleGuide*` /
         * `guidesHub.prizeDrawGuide*` message keys are all left in place, so
         * restoring this is uncommenting two lines.
         *
         * { href: String(ROUTES.PUBLIC.SELLER_GUIDE_BUNDLES), label: t("bundleGuide"), text: t("bundleGuideText") },
         * { href: String(ROUTES.PUBLIC.SELLER_GUIDE_RANDOM_LOTS), label: t("prizeDrawGuide"), text: t("prizeDrawGuideText") },
         */
      ],
    },
  ];

  return (
    <Div>
      <Section className={THEMED_BG_PRIMARY} padding="y-2xl">
        <Div className={page.container.lg}>
          <Heading level={1} size="3xl" mdSize="4xl" weight="bold" className="mb-3">
            {t("title")}
          </Heading>
          <Text size="lg" color="muted" className="max-w-3xl">
            {t("intro")}
          </Text>
        </Div>
      </Section>

      {GROUPS.map((g) => (
        <Section key={g.heading} padding="y-xl">
          <Div className={page.container.lg}>
            <Heading level={2} size="xl" weight="semibold" className="mb-1">
              {g.heading}
            </Heading>
            <Text color="muted" className="mb-4">{g.blurb}</Text>
            {/*
              * `cols="cards"` rather than a hand-written responsive ladder —
              * one ladder for every card grid on the site, so this page changes
              * shape with the rest of them (audit-card-grid-cols).
              */}
            <Grid cols="cards" gap="md">
              {g.items.map((i) => (
                <Div key={i.href} className={__P.p5} surface="card" rounded="xl" border="subtle">
                  <TextLink href={i.href} weight="semibold">{i.label}</TextLink>
                  <Text size="sm" color="muted" className="mt-1">{i.text}</Text>
                </Div>
              ))}
            </Grid>
          </Div>
        </Section>
      ))}
    </Div>
  );
}
