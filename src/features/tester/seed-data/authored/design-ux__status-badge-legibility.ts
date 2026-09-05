/*
 * WHY: Authored six-part procedures for the design-ux/status-badge-legibility page.
 * WHAT: 13 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 TWO PAIRINGS, NEVER MIXED. An inline chip is a status TINT with matching
 * status ink; a badge overlaying a photo is a status SOLID with on-solid ink.
 * Both halves of each pair invert together. A literal white ink against either
 * background is invisible in exactly one theme, which is why every case here is
 * read in both — and why several of them name the dark theme specifically.
 *
 * A third failure mode is worse than a wrong pairing: a class the build never
 * generates. Tailwind drops an unknown utility silently, so the element renders
 * with no background at all and looks like a styling choice.
 *
 * @tag domain:tester
 * @tag layer:seed
 * @tag pattern:none
 * @tag access:server-only
 * @tag consumers:seed-data/authored/index.ts
 * @tag sideEffects:none
 */

import type { AuthoredCase } from "./_types";

export const authored: Record<string, AuthoredCase> = {
  "checklist-design-ux-status-badge-legibility-listing-type-tags-readable-light": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window in LIGHT mode.",
      "Find a card of each listing type and read its badge: Auction, Pre-Order, Prize Draw, Classified, Digital Code, Live Item, Art Print, Sticker Sheet.",
      "Read each badge's text against its own background.",
      "Write down any badge whose text cannot be read.",
    ],
    expectedBehaviour:
      "Each type badge pairs a background and an ink that belong together. A tint paired with a literal white ink is white on near-white in a light theme — and the same badge is perfectly readable in dark, which is why a light-mode pass is its own case.",
    expectedUiState:
      "All eight badges are readable in light mode. The specific failure is a badge whose text is invisible against a pale fill while the badge shape is clearly there.",
    expectedData: { unreadableBadgesLight: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-status-badge-legibility-listing-type-tags-readable-dark": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and switch to DARK mode.",
      "Find a card of each listing type and read its badge.",
      "Compare each against how it read in light mode.",
      "Write down any badge readable in one theme and not the other.",
    ],
    expectedBehaviour:
      "The same eight badges hold in dark mode, because both halves of the pairing invert. A badge that is fine in one theme and unreadable in the other is the signature of a pairing where only one half is a token.",
    expectedUiState:
      "All eight badges are readable in dark mode. A badge that passed the light-mode case and fails here is the finding, and it is the same bug from the other side.",
    expectedData: { unreadableBadgesDark: 0 },
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-live-item-tag-has-background": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window and find a Live Item card.",
      "Look at its badge and check whether it has a filled background at all.",
      "Compare it against the Auction and Pre-Order badges beside it.",
      "Switch to dark mode and look again.",
      "Open /live/live-tester-sandbox-1 signed in as tester@letitrip.in / TempPass123! and look at the badge there.",
    ],
    expectedBehaviour:
      "The Live Item badge names a colour the build can actually generate. Its background once used a flat alias that has no tint variant and is absent from the app's own palette entirely, so the class compiled to nothing and the badge rendered with no fill — which reads as a deliberate outline style rather than a dropped class.",
    expectedUiState:
      "The Live Item badge has a visible filled background in both themes, like every other type badge. A badge that is text-only while its neighbours are filled is the failure.",
    expectedData: { hasBackground: true },
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-promo-badges-readable": {
    roles: ["guest"],
    startPage: "/products",
    steps: [
      "Open /products in a private window in light mode.",
      "Find cards showing NEW, SALE and LIMITED badges and read each.",
      "Note whether these badges sit over the card's photo or beside its title.",
      "Switch to dark mode and read them again.",
    ],
    expectedBehaviour:
      "These badges overlay a photograph, so they take the solid pairing rather than the tint one — a pale tint over an arbitrary product image is unreadable regardless of theme. A past sweep converted solid fills to tints and left the white ink behind, which broke these three specifically.",
    expectedUiState:
      "NEW, SALE and LIMITED are readable over their photos in both themes, with a solid enough fill to separate them from the image behind. A pale badge floating over a light product photo is the failure.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-soft-ban-lift-notification-has-a-body": {
    roles: ["admin", "buyer"],
    startPage: "/admin/users",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/users, find karthik.new@gmail.com, and apply a soft ban with a reason.",
      "Lift the ban again.",
      "Sign out and sign in as karthik.new@gmail.com / TempPass123!.",
      "Open /user/notifications and read the ban-lift notification's title AND its body.",
    ],
    inputs: { targetUser: "karthik.new@gmail.com" },
    expectedBehaviour:
      "The ban-lift notification carries a body, not only a title. Every notification type renders from a per-type template; a type with no template falls back to something generic, which shows as an empty body or a repeat of the title.",
    expectedUiState:
      "The notification has a readable title and a distinct body explaining that access is restored. An empty body, or a body that simply restates the title, means this type has no template.",
    endResult:
      "The account is unbanned. Confirm karthik.new@gmail.com can sign in normally afterwards — it is used by other cases.",
  },
  "checklist-design-ux-status-badge-legibility-review-feedback-notification-delivers": {
    roles: ["buyer", "seller"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123!.",
      "Open a product this account has bought and leave a review.",
      "Sign out and sign in as tyson@beybladearena.in / TempPass123!, the store owner.",
      "Open /store and check for a notification about the new review.",
      "Read its title, its body and where its link goes.",
      "Click the link.",
    ],
    expectedBehaviour:
      "The seller is notified when a review lands, with a body and a destination. Reviews have no per-record page in any role, so the link correctly resolves to the reviews LIST — fabricating a per-review URL would 404, which is worse than a list.",
    expectedUiState:
      "A notification exists for the store owner with a readable title and body. Its link opens the reviews list rather than a 404. No notification at all means the hook did not fire.",
    endResult:
      "Delete the review afterwards so review counts on that product stay as seeded.",
  },
  "checklist-design-ux-status-badge-legibility-analytics-tags-absent-until-configured": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Open the browser's View Source and search for gtag, googletagmanager, fbq and connect.facebook.net.",
      "Open DevTools' Network tab, reload, and look for any request to a Google or Facebook analytics host.",
      "Note whether any such tag is present.",
    ],
    expectedBehaviour:
      "Analytics tags are injected only when their ids are configured. Those ids live in a settings group that is separate from the encrypted credentials — and that group was written by the admin form while being undeclared on the settings type, which is precisely how a field escapes every type-driven review.",
    expectedUiState:
      "With no analytics ids configured, no tag script is present in the source and no request is made to an analytics host. A tag firing with an empty or placeholder id is the failure — it loads the third-party script for every visitor and sends nothing useful.",
    expectedData: { analyticsRequests: 0 },
    endResult:
      "Read-only; nothing persists. If ids ARE configured on this environment, note that instead of failing the case.",
  },
  "checklist-design-ux-status-badge-legibility-notification-count-bubbles-readable": {
    roles: ["buyer"],
    startPage: "/user",
    steps: [
      "Sign in as rehan.sheikh@gmail.com / TempPass123! with at least one unread notification.",
      "Open /user and read the number inside the header bell's count bubble.",
      "Read the same bubble in the sidebar if one appears there.",
      "Switch to dark mode and read both again.",
      "Resize to 390 pixels wide and read them again.",
    ],
    inputs: { mobileWidth: 390 },
    expectedBehaviour:
      "A count bubble overlays other chrome, so it takes the solid pairing. These bubbles were among the surfaces a past sweep converted to a tint while leaving the white ink, which makes the number invisible while the bubble itself is clearly there.",
    expectedUiState:
      "The number is legible in both themes and at both widths. A visible coloured dot with no readable number in it is the failure.",
    endResult: "Read-only; return the site to light mode and restore the width.",
  },
  "checklist-design-ux-status-badge-legibility-admin-status-chips-colored": {
    roles: ["admin"],
    startPage: "/admin/orders",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123!.",
      "Open /admin/orders and read every status chip in the list.",
      "Check that different statuses use different colours and that each chip's text is readable.",
      "Open /admin/stores and read its status chips.",
      "Open /admin/payouts and read its status chips.",
      "Switch to dark mode and read all three again.",
    ],
    expectedBehaviour:
      "Status chips are inline, so they take the tint pairing with matching ink. Distinct statuses must be distinguishable by colour — a table where every chip is the same grey is a table where status has to be read word by word.",
    expectedUiState:
      "Each status renders in its own colour and every chip's text is readable, on all three pages and in both themes. Chips that are all one colour, or whose text is invisible, are both failures.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-faq-helpful-buttons-readable": {
    roles: ["guest"],
    startPage: "/faqs",
    steps: [
      "Open /faqs in a private window in light mode and expand a question.",
      "Find the helpful / not-helpful controls and read their labels.",
      "Hover each and read it while hovering.",
      "Click one and read its label in the selected state.",
      "Switch to dark mode and repeat all four readings.",
    ],
    expectedBehaviour:
      "These controls have three states — resting, hover and selected — and each needs its own readable pairing in both themes. They were among the surfaces broken by a tint-with-white-ink conversion, and the selected state is the one most easily missed.",
    expectedUiState:
      "Labels are readable in all three states, in both themes. The most likely failure is the selected state, since it is the only one requiring a click to see at all.",
    endResult:
      "Read-only apart from the vote; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-detail-page-tags-readable": {
    roles: ["guest"],
    startPage: "/auctions/auction-beyblade-x-shark-edge",
    steps: [
      "Open /auctions/auction-beyblade-x-shark-edge in a private window in light mode.",
      "Read every tag and badge on the page — listing type, condition, stock, any promo tag.",
      "Open /pre-orders/preorder-beyblade-x-bx-08-wave and read its badges, including the production status.",
      "Open /prize-draws/prizedraw-beyblade-mystery-box and read its badges.",
      "Switch to dark mode and read all three pages again.",
    ],
    expectedBehaviour:
      "Detail-page badges follow the same two pairings as card badges. They are worth checking separately because a detail page renders badges the grid never shows — production status, reserve state, code-pool state — and those are the ones a card-only sweep misses.",
    expectedUiState:
      "Every badge on all three pages is readable in both themes. Detail-only badges such as 'In Production' are included in the reading.",
    expectedData: { unreadableBadges: 0 },
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-whatsapp-community-member-pill": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window in light mode and scroll to the WhatsApp community card.",
      "Read the member-count pill on it.",
      "Look at the pill's background against the card's own branded background.",
      "Switch to dark mode and read the pill again.",
    ],
    expectedBehaviour:
      "A pill sitting on a branded backdrop needs the translucent-white surface, not the page surface. The page surface is a LIGHT background in every light theme, so pairing it with inverse ink is white-on-white — the same defect as the badge cases, expressed through primitive props rather than utility classes.",
    expectedUiState:
      "The member-count pill is readable against the branded card in both themes. A pill whose number is invisible while the pill shape is visible is the failure.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-status-badge-legibility-image-lightbox-close-hover": {
    roles: ["guest"],
    startPage: "/products/product-beyblade-burst-valkyrie",
    steps: [
      "Open /products/product-beyblade-burst-valkyrie in a private window.",
      "Click the main image to open the lightbox.",
      "Find the close control and read it at rest.",
      "Hover it and read it while hovering.",
      "Hover each of the other toolbar controls — zoom, rotate, expand — and read each.",
      "Switch to dark mode and repeat.",
    ],
    expectedBehaviour:
      "The lightbox toolbar sits on a fixed dark scrim, which is one of the few places a fixed light hover fill is correct — expressed as white with an alpha rather than as a named palette tint. A named tint is the same near-white in both themes and swallows the icon on hover.",
    expectedUiState:
      "The close control and every toolbar control stay visible while hovered, in both themes. An icon that disappears under its own hover fill is the failure, and it only shows with the pointer actually over it.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
};
