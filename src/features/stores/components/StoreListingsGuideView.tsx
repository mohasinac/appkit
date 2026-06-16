import React from "react";
import { ArrowLeft } from "lucide-react";
import { Alert, Div, Heading, Li, Section, Span, Stack, Table, Tbody, Td, Text, Th, Thead, Tr, Ul } from "../../../ui";
import { ROUTES } from "../../../next/routing/route-map";

const SUBHEADING = "mb-1 font-semibold text-[var(--appkit-color-text)]";
const LIST_DISC = "list-disc leading-relaxed";

// -- Section wrapper -----------------------------------------------------------

function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)]" rounded="xl" shadow="sm" padding="lg">
      <Heading level={2} className="mb-4 text-[var(--appkit-color-text)]" size="lg" weight="semibold">
        {title}
      </Heading>
      {children}
    </Section>
  );
}

// -- Section 1: Comparison table -----------------------------------------------

const LISTING_TYPES = [
  {
    type: "Standard Product",
    pricing: "Fixed price set by seller",
    buyerFlow: "Add to cart → checkout → instant order",
    requiredFields: "Title · condition · price · ≥1 image",
    idealUseCase: "Collectibles with a clear market value",
  },
  {
    type: "Auction",
    pricing: "Starts at reserve/starting bid; buyers compete",
    buyerFlow: "Place bid → wait for end time → winner pays within 48 h",
    requiredFields: "Reserve price · starting bid · end date/time",
    idealUseCase: "Rare or graded items where demand sets the price",
  },
  {
    type: "Pre-order",
    pricing: "Fixed price; deposit collected at checkout",
    buyerFlow: "Pay deposit → wait for supplier arrival → pay balance",
    requiredFields: "Expected delivery date · deposit % · supplier status",
    idealUseCase: "Upcoming releases or items not yet in hand",
  },
] as const;

function ListingTypesTable() {
  const HEADERS = ["", "Standard Product", "Auction", "Pre-order"];
  const ROWS = [
    { label: "Pricing model", keys: ["pricing"] },
    { label: "Buyer flow", keys: ["buyerFlow"] },
    { label: "Required fields", keys: ["requiredFields"] },
    { label: "Ideal use case", keys: ["idealUseCase"] },
  ] as const;

  return (
    <Div className="overflow-x-auto -mx-6">
      <Table className="min-w-full" size="sm">
        <Thead>
          <Tr className="border-b border-[var(--appkit-color-border)]">
            {HEADERS.map((h) => (
              <Th
                key={h}
                className="px-6 py-3 text-left font-semibold text-[var(--appkit-color-text)]"
              >
                {h}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody className="divide-y divide-[var(--appkit-color-border)]">
          {ROWS.map(({ label, keys }) => (
            <Tr key={label}>
              <Td className="px-6 py-3 font-medium text-[var(--appkit-color-text-muted)] whitespace-nowrap">
                {label}
              </Td>
              {LISTING_TYPES.map((t) => (
                <Td key={t.type} className="px-6 py-3 text-[var(--appkit-color-text)] align-top">
                  {t[keys[0]]}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Div>
  );
}

// -- Section 2: Standard product walkthrough -----------------------------------

const STANDARD_STEPS = [
  {
    step: "General",
    items: [
      "Title — describe the item clearly (brand, character, set, grade if PSA/BGS).",
      "Condition — use grades 1–10: 1 = completely damaged, 5 = heavily played, 7 = lightly played, 9 = near mint, 10 = gem mint. Always be honest.",
      "Brand & Category — required for search and filtering.",
      "youtubeId — paste just the video ID (e.g. dQw4w9WgXcQ) to embed an unboxing or showcase video on the product page.",
    ],
  },
  {
    step: "Media",
    items: [
      "Upload at least 1 image. Recommended: 5–8 images showing front, back, corners, and any damage.",
      "Drag to reorder — the first image is the card thumbnail.",
      "Images are watermarked automatically; do not add your own watermarks.",
    ],
  },
  {
    step: "Pricing",
    items: [
      "Price — enter in Indian Rupees (₹). Stored in paise internally.",
      "isOnSale + salePrice — enable the sale badge and show a strikethrough price on the listing.",
      "customFields — add any extra key/value pairs buyers find useful (e.g. PSA cert number, card number, print run).",
    ],
  },
  {
    step: "Shipping",
    items: [
      "Select the shipping provider(s) you support for this item.",
      "Estimated dispatch time — how many business days before you hand to courier.",
    ],
  },
  {
    step: "Visibility",
    items: [
      "Status: DRAFT saves without publishing. PUBLISHED makes it live in search.",
      "isPromoted — shows the item in promoted sections (homepage deals carousel). Admin-controlled for most stores.",
      "isFeatured — adds a featured badge and priority placement. Admin-controlled.",
      "customSections — rich text content blocks rendered below the product description.",
    ],
  },
];

function StandardWalkthrough() {
  return (
    <Stack gap="5">
      {STANDARD_STEPS.map(({ step, items }) => (
        <Div key={step}>
          <Text className="mb-2 text-[var(--appkit-color-text)]" weight="semibold">{step}</Text>
          <Ul className="space-y-1.5" indent="lg">
            {items.map((item) => (
              <Li key={item} className="list-disc text-sm text-[var(--appkit-color-text-muted)] leading-relaxed">
                {item}
              </Li>
            ))}
          </Ul>
        </Div>
      ))}
    </Stack>
  );
}

// -- Section 3: Auction walkthrough --------------------------------------------

function AuctionWalkthrough() {
  return (
    <Stack className="text-sm text-[var(--appkit-color-text-muted)]" gap="md">
      <Div>
        <Text className={SUBHEADING}>Reserve price vs starting bid</Text>
        <Text className="leading-relaxed">
          The <Span weight="bold">starting bid</Span> is the minimum first bid a buyer can place.
          The <Span weight="bold">reserve price</Span> is the minimum price you are willing to accept —
          if bidding does not reach the reserve, you are not obligated to sell. The reserve is hidden from buyers.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Bid increment</Text>
        <Div className="overflow-x-auto">
          <Table className="min-w-[320px]" size="sm">
            <Thead>
              <Tr className="border-b border-[var(--appkit-color-border)]">
                <Th className="pr-4 text-left font-semibold text-[var(--appkit-color-text)]" padding="xs-tall">Current high bid</Th>
                <Th className="text-left font-semibold text-[var(--appkit-color-text)]" padding="xs-tall">Minimum increment</Th>
              </Tr>
            </Thead>
            <Tbody className="divide-y divide-[var(--appkit-color-border)]">
              {[
                ["₹0 – ₹499", "₹10"],
                ["₹500 – ₹1,999", "₹25"],
                ["₹2,000 – ₹9,999", "₹100"],
                ["₹10,000 – ₹49,999", "₹500"],
                ["₹50,000+", "₹1,000"],
              ].map(([range, inc]) => (
                <Tr key={range}>
                  <Td className="pr-4" padding="xs-tall">{range}</Td>
                  <Td padding="xs-tall">{inc}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Div>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Auction end</Text>
        <Ul spacing="tight" indent="lg">
          <Li className={LIST_DISC}>Winner receives an email and has 48 hours to complete payment.</Li>
          <Li className={LIST_DISC}>If payment is not completed within 48 hours, the order is auto-cancelled.</Li>
          <Li className={LIST_DISC}>The next-highest bidder may be offered the item (if enabled in your auction settings).</Li>
        </Ul>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Editing a live auction</Text>
        <Text className="leading-relaxed">
          Once a bid has been placed, you cannot change the reserve price or starting bid.
          You can edit the title, description, and images at any time.
        </Text>
      </Div>
    </Stack>
  );
}

// -- Section 4: Pre-order walkthrough ------------------------------------------

function PreorderWalkthrough() {
  return (
    <Stack className="text-sm text-[var(--appkit-color-text-muted)]" gap="md">
      <Div>
        <Text className={SUBHEADING}>Deposit mechanic</Text>
        <Text className="leading-relaxed">
          Set a <Span weight="bold">deposit percentage</Span> (e.g. 20%). Buyers pay the deposit at checkout.
          The balance is collected when the item arrives and you mark the pre-order ready. Buyers see both amounts clearly on the checkout page.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Expected delivery date</Text>
        <Text className="leading-relaxed">
          Set a realistic estimate. Buyers rely on this to decide whether to pre-order.
          You can update the date later, but repeated delays hurt your store rating.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>"Confirmed supplier" requirement</Text>
        <Text className="leading-relaxed">
          Only list pre-orders for items you have confirmed supply for — e.g. you have placed a purchase order with a distributor
          or manufacturer. Speculative pre-orders without supplier confirmation violate platform rules and may result in store suspension.
        </Text>
      </Div>
      <Div>
        <Text className={SUBHEADING}>Cancellation rules</Text>
        <Text className="leading-relaxed">
          Buyers can cancel a pre-order within 24 hours of placing it. After 24 hours, cancellation requires seller approval.
          If you cannot fulfill the pre-order, initiate cancellation promptly — the deposit is refunded automatically.
        </Text>
      </Div>
    </Stack>
  );
}

// -- Section 5: Product status lifecycle ---------------------------------------

const STATUS_LIFECYCLE = `
DRAFT ──────────────────────────────────► PUBLISHED
  │                                           │
  │    (seller publishes)        (seller archives / auto-archive)
  │                                           │
  └──────────────────────────────────────► ARCHIVED

PUBLISHED ──► (buyer places bid / buys) ──► SOLD (auction only)
`;

const STATUS_NOTES = [
  { status: "DRAFT", note: "Visible only to you. Does not appear in search or browse." },
  { status: "PUBLISHED", note: "Live in search, browse, and featured sections if promoted." },
  { status: "ARCHIVED", note: "Hidden from all public views. Can be re-published later." },
  { status: "SOLD", note: "Auction only — marked when the winning bid is confirmed paid." },
];

function StatusLifecycle() {
  return (
    <Stack gap="md">
      <Div className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-subtle,var(--appkit-color-border))/20] font-mono text-xs text-[var(--appkit-color-text-muted)] overflow-x-auto whitespace-pre" rounded="lg" padding="md">
        {STATUS_LIFECYCLE}
      </Div>
      <Stack gap="sm">
        {STATUS_NOTES.map(({ status, note }) => (
          <Div key={status} className="flex gap-3 text-sm">
            <Text className="shrink-0 font-mono text-[var(--appkit-color-text)] w-24" weight="semibold">{status}</Text>
            <Text className="text-[var(--appkit-color-text-muted)]">{note}</Text>
          </Div>
        ))}
      </Stack>
      <Text className="text-[var(--appkit-color-text-muted)]" size="sm">
        Live auctions with at least one bid cannot be taken to ARCHIVED until the auction ends.
      </Text>
    </Stack>
  );
}

// -- Section 6: Media guide ----------------------------------------------------

const MEDIA_TIPS = [
  { label: "Image ratio", detail: "1:1 (square) for card thumbnails; 4:3 works well for product detail gallery." },
  { label: "Minimum size", detail: "800 × 800 px recommended. Below 400 × 400 px will look blurry on Retina screens." },
  { label: "Max file size", detail: "50 MB per image. Prefer JPG for photos; PNG for packaging or cards with text." },
  { label: "Watermark", detail: "LetItRip adds a watermark automatically. Do not add your own — double watermarks look unprofessional." },
  { label: "Order", detail: "Drag images to reorder after upload. The first image is the card thumbnail used in search results." },
  { label: "Video", detail: "Add a YouTube video ID to embed an unboxing or showcase. Not a replacement for photos." },
];

function MediaGuide() {
  return (
    <Stack gap="3">
      {MEDIA_TIPS.map(({ label, detail }) => (
        <Div key={label} className="flex gap-3 text-sm">
          <Text className="shrink-0 w-28 text-[var(--appkit-color-text)]" weight="semibold">{label}</Text>
          <Text className="text-[var(--appkit-color-text-muted)] leading-relaxed">{detail}</Text>
        </Div>
      ))}
    </Stack>
  );
}

// -- Section 7: Common mistakes ------------------------------------------------

const MISTAKES = [
  "Listing a pre-order without a confirmed supplier. If supply falls through, you will face cancellations, refunds, and a rating hit.",
  "Leaving condition blank or writing 'good condition' without a numeric grade. Buyers cannot compare listings fairly.",
  "Uploading blurry or overexposed photos. Listings with poor images receive fewer bids and lower conversion.",
  "Not setting isAuction: false on standard products. If a product is not an auction, it must have listingType: 'standard' — mixed signals confuse buyers.",
  "Setting an unrealistic deposit percentage. A 5% deposit gives buyers little skin in the game; 20–30% is standard for collectibles.",
  "Forgetting to configure shipping before publishing. Orders without a shipping method cannot be fulfilled.",
];

function CommonMistakes() {
  return (
    <Alert variant="warning" title="Common mistakes to avoid">
      <Ul className="mt-2" spacing="comfortable" indent="md">
        {MISTAKES.map((m) => (
          <Li key={m} className="list-disc text-sm leading-relaxed">
            {m}
          </Li>
        ))}
      </Ul>
    </Alert>
  );
}

// -- Main view -----------------------------------------------------------------

export type StoreListingsGuideViewProps = Record<string, never>;

export function StoreListingsGuideView(_props: StoreListingsGuideViewProps) {
  return (
    <Stack gap="lg" padding="b-2xl">
      {/* Back nav */}
      <a
        href={String(ROUTES.STORE.GUIDE)}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--appkit-color-text-muted)] hover:text-[var(--appkit-color-text)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Seller Guide
      </a>

      {/* Page title */}
      <Div>
        <Heading level={1} className="text-[var(--appkit-color-text)]" size="2xl" weight="bold">
          Listings Guide
        </Heading>
        <Text className="mt-1 text-[var(--appkit-color-text-muted)]" size="sm">
          Products, auctions, and pre-orders — create and manage your listings.
        </Text>
      </Div>

      {/* Sections */}
      <GuideSection title="1. Three listing types">
        <ListingTypesTable />
      </GuideSection>

      <GuideSection title="2. Standard product walkthrough">
        <StandardWalkthrough />
      </GuideSection>

      <GuideSection title="3. Auction walkthrough">
        <AuctionWalkthrough />
      </GuideSection>

      <GuideSection title="4. Pre-order walkthrough">
        <PreorderWalkthrough />
      </GuideSection>

      <GuideSection title="5. Product status lifecycle">
        <StatusLifecycle />
      </GuideSection>

      <GuideSection title="6. Media guide">
        <MediaGuide />
      </GuideSection>

      <GuideSection title="7. Common mistakes">
        <CommonMistakes />
      </GuideSection>
    </Stack>
  );
}
