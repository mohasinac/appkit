/*
 * WHY: Authored six-part procedures for the design-ux/homepage-carousels page.
 * WHAT: 26 case(s), keyed by full checklist id.
 *
 * Written by hand, case by case, against the label each one states. There is no
 * generator: the authoring scripts were deleted once it was clear they were
 * scaffolding around work that is simply writing.
 *
 * 🛑 THE HOMEPAGE COMPOSES ~26 INDEPENDENTLY-FETCHED SECTIONS, each inside its
 * own boundary that renders NOTHING on failure and reports server-side. That is
 * deliberate — a visitor should see a homepage missing one row, not an apology —
 * but it means a broken section is silent. Several cases here therefore ask what
 * is ABSENT, which is the only way a swallowed section becomes visible.
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
  "checklist-design-ux-homepage-carousels-carousel-loops": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Watch the hero carousel through a full cycle without touching it, counting the slides.",
      "Keep watching past the last slide.",
      "Note whether it returns to the first slide or stops.",
      "Watch one more full cycle to check the count is the same.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "The hero advances on its own and wraps from the last slide back to the first. At most five slides are active at once, so a cycle that never repeats a slide has more active than the cap allows.",
    expectedUiState:
      "Slides advance automatically and the carousel returns to the first slide after the last. The same number of slides appears in both cycles, and that number is at most five.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-carousel-no-flicker": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide and watch the hero as it first appears.",
      "Watch each transition between slides for a flash of background or a jump in height.",
      "Hard-reload with Ctrl+Shift+R and watch the first paint again.",
      "Do that three more times, watching each time.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "Slides cross-fade or slide without an intermediate empty frame, and the carousel holds one height throughout so the page below never shifts. A flash on first paint is usually the first slide's image arriving after its container.",
    expectedUiState:
      "No flash of empty background between slides and none on any of the four loads. The content below the hero does not move vertically as slides change.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-hero-carousel-video-plays": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Wait for the slide whose background is a video.",
      "Watch whether the video plays and whether it loops.",
      "Look for any error text or a black rectangle where the video should be.",
      "Resize to 390 pixels and watch the same slide again.",
    ],
    inputs: { viewportWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "A video background renders through a real video element and must therefore point at a directly playable file — the image proxy that watermarks still images rejects video outright, so a video URL routed through it never plays. The poster image is a still and does go through the proxy.",
    expectedUiState:
      "The video plays and loops at both widths, with the dim overlay and slide copy readable over it. A black rectangle, a broken-media icon or an unsupported-format message are all the same failure.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-carousel-pause-on-interaction": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide and let the hero advance once on its own.",
      "Hover the pointer over the hero and hold it there for 15 seconds.",
      "Note whether the slides keep advancing.",
      "Move the pointer away and watch whether autoplay resumes.",
      "Click a slide's own control and check the carousel does not advance out from under the click.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "Autoplay pauses while the visitor is interacting and resumes afterwards. A carousel that advances mid-click moves the target the user was aiming at, which is how a hero sends someone to the wrong page.",
    expectedUiState:
      "Slides stop advancing while hovered and resume shortly after the pointer leaves. Clicking a slide control does not coincide with an advance.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-carousel-arrows-work": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Click the hero's next control and note which slide appears.",
      "Click it repeatedly through a full cycle back to the starting slide.",
      "Click the previous control and check it goes back one.",
      "Use any slide indicators to jump directly to a slide.",
    ],
    inputs: { viewportWidth: 1280 },
    expectedBehaviour:
      "Manual controls move exactly one slide per press and wrap in both directions. Indicators jump directly and reflect the current slide.",
    expectedUiState:
      "Next advances one slide, previous goes back one, and both wrap. The active indicator tracks the visible slide, including after an automatic advance.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-hero-banner-loops": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels and find any banner strip distinct from the hero carousel.",
      "Watch it through a full cycle and note the item count.",
      "Watch past the last item to see whether it wraps.",
      "Resize to 390 pixels and watch it again.",
    ],
    inputs: { viewportWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "A banner strip wraps like the hero does and keeps its cycle at both widths. A strip that wraps on desktop and stops on mobile has been re-measured on resize but not re-armed.",
    expectedUiState:
      "The strip cycles and wraps at both widths, with the same items in the same order.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-sections-showcase-render": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Find each product-showcase section and read its heading.",
      "Check each has cards beneath it with titles, images and prices.",
      "Write down any showcase heading whose rail is empty.",
      "Click one card and confirm it opens that listing.",
    ],
    expectedBehaviour:
      "A showcase section renders its own query's results. Because each section fails silently to nothing, an empty rail under a heading is the visible half of a section whose fetch returned nothing — the heading rendering at all means the section itself did not throw.",
    expectedUiState:
      "Every showcase heading has populated cards beneath it, each with a real title, a rendered image and a price. A heading with an empty rail is the finding, named specifically.",
    expectedData: { emptyShowcaseRails: 0 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-homepage-carousels-sections-promo-render": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Find each promotional section and read its heading, copy and action buttons.",
      "Check each button's label is not truncated and that it leads somewhere.",
      "Click one and read where it lands.",
      "Switch to dark mode and read the same sections.",
    ],
    expectedBehaviour:
      "Promo sections render their configured copy and actions, and their buttons resolve. Buttons on a coloured band need the solid pairing rather than a theme-relative surface, which is a light background in every light theme.",
    expectedUiState:
      "Each promo section shows its copy and buttons with readable labels in both themes, and every button lands on a real page. An empty promo band, or a button whose label is invisible in one theme, are both failures.",
    endResult: "Read-only; return the site to light mode afterwards.",
  },
  "checklist-design-ux-homepage-carousels-sections-live-reserve-render": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Find the live auctions section and read every card.",
      "Check each card's countdown and note whether any reads as already ended.",
      "Find the pre-order or reserve section and read its cards.",
      "Check whether any is sold out.",
    ],
    expectedBehaviour:
      "Both strips filter by availability before rendering. The auctions strip is the one worth checking hardest: sorted by end date ASCENDING with no lower bound, it front-loads the OLDEST end dates, so a 'Live Auctions' rail leads with the longest-dead lots in the catalogue — and an ended auction renders as a perfectly ordinary card with nothing to flag it.",
    expectedUiState:
      "Every card in the live auctions strip has a future end date and a running countdown. No card reads 'Ended'. The reserve strip holds no sold-out pre-orders.",
    expectedData: { endedAuctionsInLiveStrip: 0 },
    endResult:
      "Read-only; nothing persists. Read every card's countdown rather than the first — the dead ones sort to the front, but a partially-fixed filter can leave them anywhere.",
  },
  "checklist-design-ux-homepage-carousels-sections-social-proof-render": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Find the social-proof section — reviews, ratings or testimonials.",
      "Read each entry for its text, its rating and its attribution.",
      "Check whether any attribution shows a full real name.",
      "Check whether any review image renders as a broken tile.",
    ],
    expectedBehaviour:
      "Reviewer identities are masked on the way out of the server. Review images are stored as plain URL strings — a renderer that expects objects and reads a nested property off each string gets undefined for every one and falls back to a placeholder, which is what makes every review photo on a page vanish at once.",
    expectedUiState:
      "Entries show their text and rating with masked attributions rather than full names. Any review photos render rather than showing placeholder icons.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-homepage-carousels-sections-social-feed-hidden": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Scroll the whole page looking for an embedded social feed.",
      "Open the browser's View Source and search for instagram, twitter, x.com and facebook embed markers.",
      "Open DevTools' Network tab, reload, and look for requests to any social host.",
    ],
    expectedBehaviour:
      "A social feed section stays hidden until it is configured. An unconfigured embed either renders an empty framed box or loads a third-party script for every visitor and shows nothing — both are worse than the section being absent.",
    expectedUiState:
      "No social feed section is rendered, no empty framed box sits where one would be, and no request goes to a social host.",
    expectedData: { socialHostRequests: 0 },
    endResult:
      "Read-only; nothing persists. If a feed IS configured on this environment, record that rather than failing the case.",
  },
  "checklist-design-ux-homepage-carousels-hero-welcome-logo-sized-padded": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Look at the welcome hero's brand mark and wordmark.",
      "Check the space around them against the surrounding copy.",
      "Resize to 390 pixels and look again.",
      "Switch to dark mode and look at both widths again.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "The logo takes its size from a named size rather than hand-written height classes, so it scales across breakpoints without each call site restating the ladder. Its gradient stops come from theme colours, so it restyles with the theme instead of needing a second asset.",
    expectedUiState:
      "The mark and wordmark are proportionate with even padding at both widths, and both are legible in both themes. A logo that is enormous on mobile or crushed against its neighbours is the failure.",
    endResult: "Read-only; return to light mode and restore the width.",
  },
  "checklist-design-ux-homepage-carousels-welcome-hero-no-gap": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Look at the join between the header and the welcome hero.",
      "Look at the join between the hero and the section below it.",
      "Resize to 390 pixels and look at both joins again.",
      "Scroll down and back up and look once more.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "The hero meets the header and the following section without a stray band of page background. Such a gap usually comes from a section applying its own top margin on top of the shell's spacing.",
    expectedUiState:
      "No unexplained horizontal band above or below the hero at either width. The hero's background meets the header cleanly.",
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-promo-banner-overlay": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide and find a promo banner with copy over an image.",
      "Read every word of its heading, body and button labels.",
      "Resize to 390 pixels and read them again.",
      "Switch to dark mode and read them at both widths.",
      "Note any word that is hard to read against the image behind it.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "A dim overlay sits between the image and the copy so text stays readable whatever the image is. Without it, legibility depends on which photo an admin uploaded — which means it will fail eventually and not during testing.",
    expectedUiState:
      "All banner copy is readable at both widths in both themes, with a visible dim layer between image and text. Copy fighting a busy photograph is the failure even if it is just about readable today.",
    endResult: "Read-only; return to light mode and restore the width.",
  },
  "checklist-design-ux-homepage-carousels-hero-slides-have-copy": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window at 1280 pixels wide.",
      "Watch the hero through a full cycle, reading each slide's heading, body and button.",
      "Write down any slide that is image-only with no copy.",
      "Click each slide's button and read where it lands.",
      "Resize to 390 pixels and check the copy is still readable and not clipped.",
    ],
    inputs: { desktopWidth: 1280, mobileWidth: 390 },
    expectedBehaviour:
      "Every active slide carries copy and a destination. An image-only slide is a large piece of screen that says nothing and goes nowhere, which is worse than one fewer slide.",
    expectedUiState:
      "Each slide has a heading, some body copy and a working button. Nothing is clipped at 390 pixels. A slide whose button leads nowhere is the failure.",
    expectedData: { slidesWithoutCopy: 0 },
    endResult: "Read-only; restore the window width afterwards.",
  },
  "checklist-design-ux-homepage-carousels-homepage-single-h1": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Open the browser's View Source and search for every h1 tag.",
      "Count them.",
      "Read the text of each one found.",
      "Repeat on /products and on a product detail page.",
    ],
    expectedBehaviour:
      "One top-level heading per page. Several compete for what the page is about, which weakens the signal a crawler reads and makes the document outline meaningless to a screen reader.",
    expectedUiState:
      "Exactly one h1 in the homepage source, describing the site. The same holds on /products and on a product page, where the h1 is the product's own title.",
    expectedData: { h1Count: 1 },
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-homepage-carousels-homepage-section-order": {
    roles: ["admin", "guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and write down every section heading in the order it appears.",
      "Sign in as admin@letitrip.in / TempPass123! and open the homepage sections editor.",
      "Write down the configured order.",
      "Compare the two lists.",
      "Move one section up in the editor and save.",
      "Reload the public homepage and check that section has moved, then put it back.",
    ],
    expectedBehaviour:
      "The rendered order follows the configured order, and a change takes effect on the public page. An order held in the renderer rather than read from configuration makes the admin control decorative.",
    expectedUiState:
      "The two lists match. After the move, the public page reflects the new position. A saved change with no visible effect is the failure.",
    endResult:
      "The section is back in its original position by the final step.",
  },
  "checklist-design-ux-homepage-carousels-homepage-no-franchise-specific-strips": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Read every section heading down the page.",
      "Write down any heading naming a specific franchise or brand rather than a category or a state.",
      "Check whether any such strip is empty.",
    ],
    expectedBehaviour:
      "Homepage strips are configured, not hard-coded to a franchise. A strip named for one brand is a strip that empties the day that brand's stock runs out — and an empty strip under a heading is exactly what a silent section failure looks like, so the two become indistinguishable.",
    expectedUiState:
      "Section headings describe categories, states or configured collections rather than naming a single franchise. No strip is empty.",
    endResult: "Read-only; nothing persists.",
  },
  "checklist-design-ux-homepage-carousels-section-config-actually-renders": {
    roles: ["admin", "guest"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the homepage sections editor.",
      "Open one section's configuration and write down every field it offers.",
      "Change a visible field — a heading or an item limit — and save.",
      "Open / in a private window and read that section.",
      "Check whether the change is reflected.",
      "Repeat for a second section of a different type, then restore both.",
    ],
    expectedBehaviour:
      "Every field a section's configuration offers reaches the renderer. A field that is editable and saved but never read is invisible from both ends — the admin sees it save and the page never changes.",
    expectedUiState:
      "Both changed fields are reflected on the public homepage after saving. A field that saves without changing anything is the finding, named by section and field.",
    endResult:
      "Both sections are restored to their original configuration by the final step.",
  },
  "checklist-design-ux-homepage-carousels-section-save-preserves-other-fields": {
    roles: ["admin"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the homepage sections editor.",
      "Open one section and write down the value of EVERY field it holds.",
      "Change exactly one field and save.",
      "RELOAD the editor and read every field again.",
      "Compare against what was written down.",
      "Restore the changed field and save.",
    ],
    expectedBehaviour:
      "Saving one field leaves the rest untouched. A form that submits its whole object from partly-populated state overwrites every field it did not load — and the save returns a perfectly normal success, so only a reload shows it.",
    expectedUiState:
      "After the reload only the changed field differs. Every other field holds its original value. A field silently reset to its default is the failure, and it is invisible without the reload.",
    endResult:
      "The section is back to its original configuration by the final step.",
  },
  "checklist-design-ux-homepage-carousels-carousel-toggles-take-effect": {
    roles: ["admin", "guest"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the carousel or homepage section settings.",
      "Note which carousel-related toggles are offered and their current states.",
      "Turn one off and save.",
      "Open / in a private window and check whether that behaviour has stopped.",
      "Turn it back on, save, and check the behaviour returns.",
    ],
    expectedBehaviour:
      "Each toggle reaches the rendered carousel. A toggle that saves without changing behaviour is decorative, and the admin has no way to tell — the setting reads as applied.",
    expectedUiState:
      "Turning the toggle off visibly stops the behaviour on the public homepage, and turning it on restores it. No effect in either direction is the failure.",
    endResult:
      "Every toggle is back in its original state by the final step.",
  },
  "checklist-design-ux-homepage-carousels-banner-buttons-from-config": {
    roles: ["admin", "guest"],
    startPage: "/admin",
    steps: [
      "Sign in as admin@letitrip.in / TempPass123! and open the homepage section holding a banner with buttons.",
      "Change a button's label to 'QA Banner buttons-from-config' and its destination to /about, then save.",
      "Open / in a private window and find that banner.",
      "Read the button's label and click it.",
      "Read where it lands.",
      "Restore the original label and destination.",
    ],
    inputs: { buttonLabel: "QA Banner buttons-from-config", destination: "/about" },
    expectedBehaviour:
      "Banner buttons are rendered from configuration rather than hard-coded, so both label and destination follow what the admin set.",
    expectedUiState:
      "The public banner shows the typed label and clicking it lands on /about. A button still showing its old label, or still going to its old destination, is the failure — and a label that updates while the destination does not is the more likely half.",
    endResult:
      "The button is restored to its original label and destination by the final step.",
  },
  "checklist-design-ux-homepage-carousels-trust-and-security-from-config": {
    roles: ["admin", "guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and find the trust or security section, reading every item in it.",
      "Sign in as admin@letitrip.in / TempPass123! and open that section's configuration.",
      "Compare the configured items against what the public page showed.",
      "Change one item's text and save.",
      "Reload the public homepage and read that item.",
      "Restore the original text.",
    ],
    expectedBehaviour:
      "The trust section's items come from configuration rather than being hard-coded copy. Hard-coded trust claims cannot be corrected without a deploy, which matters more here than in most sections.",
    expectedUiState:
      "The configured items match what the public page renders, and the edited item's new text appears after saving. An unchanged public page means the section ignores its configuration.",
    endResult: "The item is restored by the final step.",
  },
  "checklist-design-ux-homepage-carousels-homepage-newsletter-enter-key": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and find the newsletter signup on the homepage.",
      "Click into its email field and press Enter with the field empty.",
      "Read what happens.",
      "Type not-an-email and press Enter.",
      "Read where any error appears.",
      "Type qa-newsletter-1@mailnull.com and press Enter without clicking the button.",
    ],
    inputs: { invalidEmail: "not-an-email", validEmail: "qa-newsletter-1@mailnull.com" },
    expectedBehaviour:
      "Enter submits the form, exactly as the button does. A field that ignores Enter loses every visitor who types an address and presses return — which is most of them.",
    expectedUiState:
      "The empty and malformed submissions produce an inline error on the field. The valid one produces a confirmation. Enter behaves identically to clicking the button, and the page does not reload.",
    endResult:
      "A newsletter subscription exists for that address. The address is numbered so a second run can increment it rather than colliding.",
  },
  "checklist-design-ux-homepage-carousels-footer-newsletter-inline-error": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window and scroll to the footer's newsletter signup.",
      "Submit it with the field empty and read where any message appears.",
      "Type not-an-email and submit, then read where the message appears.",
      "Check whether the error is attached to the field or shown as a floating toast.",
      "Type qa-newsletter-2@mailnull.com and submit.",
    ],
    inputs: { invalidEmail: "not-an-email", validEmail: "qa-newsletter-2@mailnull.com" },
    expectedBehaviour:
      "The footer form reports its errors inline on the field, like every other form in the app. A toast for a field-level problem forces the user to look away from the field they need to fix, and disappears before they have.",
    expectedUiState:
      "Both invalid submissions put an error under the email field, not in a toast. The valid one confirms. The behaviour matches the homepage newsletter form.",
    endResult:
      "A subscription exists for that address. Note any difference from the homepage form — two newsletter forms behaving differently is itself the finding.",
  },
  "checklist-design-ux-homepage-carousels-homepage-faq-structured-data": {
    roles: ["guest"],
    startPage: "/",
    steps: [
      "Open / in a private window with no session.",
      "Find the FAQ section on the page and read its questions.",
      "Open the browser's View Source and search for application/ld+json.",
      "Read the structured data block and find the FAQ entries.",
      "Compare the questions in the markup against the ones rendered.",
    ],
    expectedBehaviour:
      "The FAQ section emits matching structured data, so the questions a crawler reads are the questions on the page. Markup describing questions that are not rendered is a mismatch a search engine will eventually penalise.",
    expectedUiState:
      "A structured-data block is present and its FAQ entries match the rendered questions and answers one for one. Markup with no visible section, or a section with no markup, are both failures.",
    endResult: "Read-only; nothing persists.",
  },
};
