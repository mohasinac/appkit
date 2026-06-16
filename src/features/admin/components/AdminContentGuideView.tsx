import React from "react";
import { FileText, Calendar, BookOpen, Layout, Grid, Megaphone, Mail } from "lucide-react";
import { Alert, Code, Div, Heading, Li, Row, Section, Span, Stack, Text, Ul } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminContentGuideView() {
  return (
    <Stack className="max-w-3xl mx-auto" padding="b-2xl" gap="xl">
      <Section>
        <Row className="mb-2" align="center" gap="3">
          <Row className="flex-shrink-0 w-10 h-10" align="center" justify="center" rounded="xl" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <FileText className="w-5 h-5 text-white" />
          </Row>
          <Text className="text-[var(--appkit-color-text-muted)] tracking-widest" size="sm" weight="semibold" transform="uppercase">Admin Guide</Text>
        </Row>
        <Heading level={1} className="md:text-3xl text-[var(--appkit-color-text)] mb-2" size="2xl" weight="bold">Content &amp; Marketing</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Blog posts, events, FAQs, carousel, homepage sections, ads, and newsletter on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: FileText, title: "Blog Posts",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Statuses</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">draft</Code> (not public), <Code size="xs" padding="xs" rounded="default" surface="subtle">published</Code> (live, indexed).</Li>
              <Li><Span weight="bold">readTimeMinutes</Span>: Auto-calculated from content word count (200 wpm). Override manually if the post has heavy media.</Li>
              <Li><Span weight="bold">youtubeId</Span>: Optional embedded YouTube video. Use only the video ID (e.g. <Code size="xs" padding="xs" rounded="default" surface="subtle">dQw4w9WgXcQ</Code>), not the full URL.</Li>
              <Li><Span weight="bold">Media in body</Span>: All images in rich text must use the <Code size="xs" padding="xs" rounded="default" surface="subtle">/api/media/</Code> proxy URL, not raw Firebase Storage links.</Li>
              <Li><Span weight="bold">isFeatured</Span>: Sets the post as featured in the blog listing. Different from the homepage featured section — that is driven by a separate <Code size="xs" padding="xs" rounded="default" surface="subtle">homepageSections</Code> config.</Li>
            </Ul>
          ),
        },
        {
          Icon: Calendar, title: "Events",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Event types</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">sale</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">offer</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">poll</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">survey</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">feedback</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">raffle</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">spin_wheel</Code>.</Li>
              <Li><Span weight="bold">Status</Span>: Computed from <Code size="xs" padding="xs" rounded="default" surface="subtle">startsAt</Code>/<Code size="xs" padding="xs" rounded="default" surface="subtle">endsAt</Code> (upcoming → active → ended). Do not set a status field manually — it will be overwritten.</Li>
              <Li><Span weight="bold">stats.totalEntries vs approvedEntries</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">totalEntries</Code> = all submitted (including waitlisted); <Code size="xs" padding="xs" rounded="default" surface="subtle">approvedEntries</Code> = CONFIRMED only.</Li>
              <Li><Span weight="bold">Cancelling an entry</Span>: Set status to CANCELLED in the entry doc. Do not delete entries — audit trail is needed for raffle fairness.</Li>
            </Ul>
          ),
        },
        {
          Icon: BookOpen, title: "FAQs",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">Categories</Span> and where they appear: Shipping (help + footer), Returns (help), Payments (help), Auctions (help), Pre-orders (help). Set <Code size="xs" padding="xs" rounded="default" surface="subtle">showOnHomepage: true</Code> for up to 5 FAQs shown on the public home page.</Li>
              <Li><Span weight="bold">searchTokens[]</Span>: Must be manually filled — drives the FAQ search feature. Include synonyms, misspellings, and related keywords.</Li>
              <Li><Span weight="bold">priority + order</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">priority</Code> sorts FAQs within their category; <Code size="xs" padding="xs" rounded="default" surface="subtle">order</Code> is the global absolute position. <Code size="xs" padding="xs" rounded="default" surface="subtle">isPinned: true</Code> floats the FAQ above non-pinned items in its category.</Li>
            </Ul>
          ),
        },
        {
          Icon: Layout, title: "Carousel Slides",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">MAX_ACTIVE_SLIDES = 5</Span>: You cannot activate a 6th slide. Deactivate an existing slide first.</Li>
              <Li><Span weight="bold">background.type</Span>: <Code size="xs" padding="xs" rounded="default" surface="subtle">image</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">video</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">color</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">gradient</Code>. Do not have 2 active video slides simultaneously — auto-playing two videos degrades mobile performance.</Li>
              <Li><Span weight="bold">Reordering</Span>: Drag slides in AdminCarouselView to reorder. The <Code size="xs" padding="xs" rounded="default" surface="subtle">order</Code> field is updated automatically.</Li>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">cards[]</Code>: Each slide contains an array of content cards displayed as an overlay. Max 3 cards per slide recommended for readability.</Li>
            </Ul>
          ),
        },
        {
          Icon: Grid, title: "Homepage Sections",
          content: (
            <Ul className={GC.listMuted}>
              <Li><Span weight="bold">21 section types</Span>: product-grid, brand-grid, category-grid, event-highlight, blog-preview, etc. The full list and config shapes are in <Code size="xs" padding="xs" rounded="default" surface="subtle">appkit/src/features/homepage/schemas/firestore.ts</Code>.</Li>
              <Li><Span weight="bold">order</Span>: Controls render sequence on the public homepage. Lower numbers appear higher on the page.</Li>
              <Li><Span weight="bold">enabled: false</Span>: Hides the section without deleting it — useful for temporary removal.</Li>
              <Li><Span weight="bold">Never edit Firestore directly</Span>: Always use AdminSectionsView. The config shapes are validated on write — direct Firestore edits can produce invalid shapes that crash the home page render.</Li>
            </Ul>
          ),
        },
        {
          Icon: Megaphone, title: "Ads",
          content: (
            <Ul className={GC.listMuted}>
              <Li>Ad slot keys correspond to specific locations on the page (e.g. <Code size="xs" padding="xs" rounded="default" surface="subtle">homepage-banner-top</Code>, <Code size="xs" padding="xs" rounded="default" surface="subtle">sidebar-right</Code>).</Li>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">isActive</Code> controls immediate visibility. <Code size="xs" padding="xs" rounded="default" surface="subtle">startDate</Code>/<Code size="xs" padding="xs" rounded="default" surface="subtle">endDate</Code> schedule automatic activation/deactivation.</Li>
              <Li><Code size="xs" padding="xs" rounded="default" surface="subtle">impressions</Code> and <Code size="xs" padding="xs" rounded="default" surface="subtle">clicks</Code> are read-only counters — incremented by the ad-serving system. Do not edit manually.</Li>
            </Ul>
          ),
        },
        {
          Icon: Mail, title: "Newsletter",
          content: (
            <>
              <Text className="text-[var(--appkit-color-text-muted)] mb-3" size="sm">Subscribers are stored in the <Code size="xs" padding="xs" rounded="default" surface="subtle">newsletter</Code> collection. The admin panel supports subscriber export and campaign send.</Text>
              <Alert variant="warning">
                Legal obligation: every email sent must include a working unsubscribe link. Under the Indian IT Act and CAN-SPAM, unsubscribe requests must be honoured within 10 business days. Never send to unsubscribed addresses. All newsletter exports are de-identified by default.
              </Alert>
            </>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden" rounded="2xl">
          <Row className="px-6 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20" padding="y-md" align="center" gap="3">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} size="base" weight="semibold">{title}</Heading>
          </Row>
          <Div className="py-5" padding="x-lg">{content}</Div>
        </Section>
      ))}
    </Stack>
  );
}
