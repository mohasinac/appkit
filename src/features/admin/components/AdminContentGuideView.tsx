import React from "react";
import { FileText, Calendar, BookOpen, Layout, Grid, Megaphone, Mail } from "lucide-react";
import { Div, Heading, Span, Text, Section, Alert } from "../../../ui";
import { GC } from "../../_guide-cls";

export function AdminContentGuideView() {
  return (
    <Div className="space-y-8 pb-10 max-w-3xl mx-auto">
      <Section>
        <Div className="flex items-center gap-3 mb-2">
          <Div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--appkit-color-primary-700) 0%,var(--appkit-color-cobalt) 100%)" }}>
            <FileText className="w-5 h-5 text-white" />
          </Div>
          <Text className="text-sm font-semibold text-[var(--appkit-color-text-muted)] uppercase tracking-widest">Admin Guide</Text>
        </Div>
        <Heading level={1} className="text-2xl md:text-3xl font-bold text-[var(--appkit-color-text)] mb-2">Content &amp; Marketing</Heading>
        <Text className="text-[var(--appkit-color-text-muted)]">Blog posts, events, FAQs, carousel, homepage sections, ads, and newsletter on LetItRip.</Text>
      </Section>

      {[
        {
          Icon: FileText, title: "Blog Posts",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Statuses</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">draft</code> (not public), <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">published</code> (live, indexed).</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">readTimeMinutes</Span>: Auto-calculated from content word count (200 wpm). Override manually if the post has heavy media.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">youtubeId</Span>: Optional embedded YouTube video. Use only the video ID (e.g. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">dQw4w9WgXcQ</code>), not the full URL.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Media in body</Span>: All images in rich text must use the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">/api/media/</code> proxy URL, not raw Firebase Storage links.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">isFeatured</Span>: Sets the post as featured in the blog listing. Different from the homepage featured section — that is driven by a separate <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">homepageSections</code> config.</li>
            </ul>
          ),
        },
        {
          Icon: Calendar, title: "Events",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Event types</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">sale</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">offer</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">poll</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">survey</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">feedback</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">raffle</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">spin_wheel</code>.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Status</Span>: Computed from <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">startsAt</code>/<code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">endsAt</code> (upcoming → active → ended). Do not set a status field manually — it will be overwritten.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">stats.totalEntries vs approvedEntries</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">totalEntries</code> = all submitted (including waitlisted); <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">approvedEntries</code> = CONFIRMED only.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Cancelling an entry</Span>: Set status to CANCELLED in the entry doc. Do not delete entries — audit trail is needed for raffle fairness.</li>
            </ul>
          ),
        },
        {
          Icon: BookOpen, title: "FAQs",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Categories</Span> and where they appear: Shipping (help + footer), Returns (help), Payments (help), Auctions (help), Pre-orders (help). Set <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">showOnHomepage: true</code> for up to 5 FAQs shown on the public home page.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">searchTokens[]</Span>: Must be manually filled — drives the FAQ search feature. Include synonyms, misspellings, and related keywords.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">priority + order</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">priority</code> sorts FAQs within their category; <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">order</code> is the global absolute position. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isPinned: true</code> floats the FAQ above non-pinned items in its category.</li>
            </ul>
          ),
        },
        {
          Icon: Layout, title: "Carousel Slides",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">MAX_ACTIVE_SLIDES = 5</Span>: You cannot activate a 6th slide. Deactivate an existing slide first.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">background.type</Span>: <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">image</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">video</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">color</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">gradient</code>. Do not have 2 active video slides simultaneously — auto-playing two videos degrades mobile performance.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Reordering</Span>: Drag slides in AdminCarouselView to reorder. The <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">order</code> field is updated automatically.</li>
              <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">cards[]</code>: Each slide contains an array of content cards displayed as an overlay. Max 3 cards per slide recommended for readability.</li>
            </ul>
          ),
        },
        {
          Icon: Grid, title: "Homepage Sections",
          content: (
            <ul className={GC.listMuted}>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">21 section types</Span>: product-grid, brand-grid, category-grid, event-highlight, blog-preview, etc. The full list and config shapes are in <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">appkit/src/features/homepage/schemas/firestore.ts</code>.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">order</Span>: Controls render sequence on the public homepage. Lower numbers appear higher on the page.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">enabled: false</Span>: Hides the section without deleting it — useful for temporary removal.</li>
              <li><Span weight="bold" className="text-[var(--appkit-color-text)]">Never edit Firestore directly</Span>: Always use AdminSectionsView. The config shapes are validated on write — direct Firestore edits can produce invalid shapes that crash the home page render.</li>
            </ul>
          ),
        },
        {
          Icon: Megaphone, title: "Ads",
          content: (
            <ul className={GC.listMuted}>
              <li>Ad slot keys correspond to specific locations on the page (e.g. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">homepage-banner-top</code>, <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">sidebar-right</code>).</li>
              <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">isActive</code> controls immediate visibility. <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">startDate</code>/<code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">endDate</code> schedule automatic activation/deactivation.</li>
              <li><code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">impressions</code> and <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">clicks</code> are read-only counters — incremented by the ad-serving system. Do not edit manually.</li>
            </ul>
          ),
        },
        {
          Icon: Mail, title: "Newsletter",
          content: (
            <>
              <Text className="text-sm text-[var(--appkit-color-text-muted)] mb-3">Subscribers are stored in the <code className="text-xs bg-[var(--appkit-color-border)] px-1 rounded">newsletter</code> collection. The admin panel supports subscriber export and campaign send.</Text>
              <Alert variant="warning">
                Legal obligation: every email sent must include a working unsubscribe link. Under the Indian IT Act and CAN-SPAM, unsubscribe requests must be honoured within 10 business days. Never send to unsubscribed addresses. All newsletter exports are de-identified by default.
              </Alert>
            </>
          ),
        },
      ].map(({ Icon, title, content }) => (
        <Section key={title} className="rounded-2xl border border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface)] overflow-hidden">
          <Div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--appkit-color-border)] bg-[var(--appkit-color-surface-2,var(--appkit-color-border))]/20">
            <Icon className="w-5 h-5 text-[var(--appkit-color-primary)]" />
            <Heading level={2} className="text-base font-semibold text-[var(--appkit-color-text)]">{title}</Heading>
          </Div>
          <Div className="px-6 py-5">{content}</Div>
        </Section>
      ))}
    </Div>
  );
}
