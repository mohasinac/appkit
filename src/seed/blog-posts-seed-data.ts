/**
 * Blog Posts Seed Data — LetItRip Collectibles Platform
 * 8 posts covering Pokémon TCG, Hot Wheels, Beyblade X, Yu-Gi-Oh!, Gundam,
 * Funko Pop, Tomica, and authentication. blog- prefix, id === slug.
 */

import type { BlogPostDocument } from "../features/blog/schemas";
import { BLOG_POST_FIELDS } from "../features/blog/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const blogPostsSeedData: Partial<BlogPostDocument>[] = [
  // ── 1. Grading Guide (featured) ──────────────────────────────────────────
  {
    id: "blog-how-to-grade-pokemon-cards-psa-bgs-guide",
    slug: "blog-how-to-grade-pokemon-cards-psa-bgs-guide",
    title: "How to Grade Your Pokémon Cards — PSA vs. BGS Complete Guide",
    excerpt:
      "Sending a card to PSA or BGS can turn a raw Near Mint copy into a certified slab worth 3–10× more. Here is everything you need to know before your first submission.",
    content: `<h2>Why Grade?</h2>
<p>A PSA 10 Gem Mint 1st Edition Charizard can fetch ₹80 lakh at auction while a raw NM copy of the same card trades around ₹1.2 lakh. Grading is authentication, preservation, and valuation in one step.</p>
<h2>PSA vs. BGS — Which to Choose?</h2>
<p><strong>PSA (Professional Sports Authenticator)</strong> is the gold standard for vintage Pokémon. PSA 10s command the highest premiums on the secondary market. PSA grades on a 1–10 scale with a single composite grade. Turnaround: 45–90 days for economy tier.</p>
<p><strong>BGS (Beckett Grading Services)</strong> gives four sub-grades: Centering, Corners, Edges, and Surface. A BGS 9.5 Pristine or 10 Black Label is considered superior to a PSA 10 by many collectors. BGS grades are easier to dispute visually since sub-grades are listed.</p>
<h2>How to Prepare Your Cards</h2>
<ol>
<li>Handle only by edges — never touch the face or back.</li>
<li>Inspect under bright LED light at 45° angle for print lines, scratches, and whitening on corners.</li>
<li>Sleeve immediately in a penny sleeve, then a perfect-fit sleeve, then a toploader.</li>
<li>Pack cards in card saver I holders for submission (PSA requires these).</li>
</ol>
<h2>Grading Tiers and Costs</h2>
<p>PSA Economy (₹4,500/card, 45 days), PSA Regular (₹8,200/card, 20 days), BGS Regular (₹5,000/card, 20 days). Always insure high-value submissions. Cards valued over ₹50,000 should go Regular tier for faster return and better customer service if lost.</p>
<h2>What Grade Can I Expect?</h2>
<p>Modern cards printed after 2016 (Sun & Moon onwards) grade well — print quality improved significantly. Base Set and Jungle cards have machine crimps on edges that commonly result in PSA 8 or 9. A PSA 9 vintage card is excellent; a PSA 10 vintage is exceptional and rare.</p>
<h2>Submitting from India</h2>
<p>Use PSA's authorised Indian submitter or a collector group submission. Declare value accurately on customs forms. Expect 2–4 weeks additional transit time on top of grading turnaround. Returns are insured by the grader up to declared value.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["grading", "psa", "bgs", "pokemon-cards", "how-to"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(62),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 8,
    views: 5420,
    metaTitle: "How to Grade Pokémon Cards — PSA vs BGS Guide | LetItRip",
    metaDescription:
      "Complete guide to grading Pokémon cards with PSA and BGS — costs, preparation, what grade to expect, and how to submit from India.",
    createdAt: daysAgo(65),
    updatedAt: daysAgo(62),
  },

  // ── 2. Top 10 Hot Wheels Chase Cars ─────────────────────────────────────
  {
    id: "blog-top-10-hot-wheels-chase-cars-2025",
    slug: "blog-top-10-hot-wheels-chase-cars-2025",
    title: "Top 10 Hot Wheels Chase Cars of 2025 (Super Treasure Hunts)",
    excerpt:
      "Super Treasure Hunts are the holy grail of Hot Wheels collecting. Here are the 10 most sought-after STHs of 2025 and what they're trading for in India.",
    content: `<h2>What is a Super Treasure Hunt?</h2>
<p>Mattel seeds roughly 1 in every 10,000 Hot Wheels cards with a Super Treasure Hunt (STH) — identified by Spectraflame metallic paint, Real Rider rubber tyres, and a gold $$TH$$ logo on the blister. In India, a standard mainline car costs ₹100–130; an STH of the same casting can trade for ₹800–5,000 depending on the casting.</p>
<h2>2025's Most Valuable STHs</h2>
<ol>
<li><strong>Custom '69 Camaro STH</strong> — Spectraflame red, Real Riders, ₹3,200–4,800</li>
<li><strong>Bone Shaker STH</strong> — Spectraflame purple, ₹2,800–4,200</li>
<li><strong>Dodge Challenger Demon STH</strong> — Spectraflame orange, ₹2,200–3,500</li>
<li><strong>Twin Mill STH</strong> — Spectraflame blue, ₹2,000–3,200</li>
<li><strong>Corvette C8 STH</strong> — Spectraflame green, ₹1,800–2,800</li>
<li><strong>Ford GT Heritage STH</strong> — Spectraflame white, ₹1,600–2,500</li>
<li><strong>Nissan Skyline GT-R STH</strong> — Spectraflame silver, ₹1,400–2,200</li>
<li><strong>Hot Wheels Racing Circuit STH</strong> — Spectraflame yellow, ₹1,200–2,000</li>
<li><strong>Datsun 240Z STH</strong> — Spectraflame teal, ₹1,100–1,800</li>
<li><strong>McLaren Senna STH</strong> — Spectraflame copper, ₹1,000–1,600</li>
</ol>
<h2>How to Hunt for STHs in India</h2>
<p>Check the bottom of each card for the $$TH$$ symbol before purchasing. Most Indian retailers receive mixed cases — visit stores on restock day (usually Tuesday or Wednesday). Many collectors source directly from Japan via proxy services for Japanese-exclusive castings.</p>
<h2>Protecting Your STHs</h2>
<p>Store carded STHs in Premium Card Protectors (UV resistant, 6mm thick). Never remove from blister — a carded STH is worth 2–5× a loose one. Stack horizontally with acid-free foam separators.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["hot-wheels", "super-treasure-hunt", "sth", "diecast", "collecting"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(47),
    authorId: "user-vikram-mehta",
    authorName: "Vikram Mehta",
    readTimeMinutes: 6,
    views: 3180,
    metaTitle: "Top 10 Hot Wheels Super Treasure Hunts 2025 | LetItRip",
    metaDescription:
      "The 10 most valuable Hot Wheels Super Treasure Hunts of 2025 — Spectraflame paint, Real Riders, and prices in India.",
    createdAt: daysAgo(50),
    updatedAt: daysAgo(47),
  },

  // ── 3. Beyblade X Beginner's Guide ───────────────────────────────────────
  {
    id: "blog-beyblade-x-beginners-guide-2026",
    slug: "blog-beyblade-x-beginners-guide-2026",
    title: "Ultimate Beyblade X Beginner's Guide — Parts, Combos & Tournaments",
    excerpt:
      "Beyblade X launched in 2023 and has taken India by storm. Here is everything you need to know: the new XStadium, gear system, best starter combos, and how to enter your first tournament.",
    content: `<h2>What is Beyblade X?</h2>
<p>Beyblade X (BX) is the fourth generation of the Beyblade franchise from Takara Tomy. The signature feature is the <strong>Xtreme Dash</strong> — a gear inside the blade that creates a sudden burst of speed when the bit clicks into a groove on the XStadium wall. Battles are faster, more explosive, and more skill-dependent than Burst.</p>
<h2>Understanding BX Parts</h2>
<ul>
<li><strong>Blade</strong> — the main top. Determines attack pattern and weight distribution.</li>
<li><strong>Ratchet</strong> — connects blade to bit. Numbers (3-60, 4-60, 5-60) indicate teeth count and height in mm.</li>
<li><strong>Bit</strong> — the tip that touches the stadium floor. FP (Flat Point) for attack, GP (Gear Point) for Xtreme Dash activation, HN (High Needle) for stamina.</li>
</ul>
<h2>Best Starter Combos in 2026</h2>
<p><strong>Attack</strong>: Dran Sword 4-60F (BX-01) — aggressive launch, targets the stadium groove repeatedly.<br>
<strong>Stamina</strong>: Wizard Arrow 4-80B — wide blade, low tip maintains long spin.<br>
<strong>Balance</strong>: Knight Shield 3-80N — defensive blade with good burst resistance.</p>
<h2>How to Enter an Indian Tournament</h2>
<p>Official Beyblade X tournaments are organised by Takara Tomy's Indian distributor through LetItRip and local hobby shops. Tournaments use the Standard Stadium format — 3-minute battle, best of 3. Register through the Events section on LetItRip. Bring your official BX tops — bootlegs are disqualified on inspection.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["beyblade-x", "beyblade", "beginner-guide", "takara-tomy", "bx"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(38),
    authorId: "user-rohit-joshi",
    authorName: "Rohit Joshi",
    readTimeMinutes: 7,
    views: 4210,
    metaTitle: "Beyblade X Beginner's Guide 2026 — Parts, Combos & Tournaments | LetItRip",
    metaDescription:
      "Complete beginner's guide to Beyblade X — XStadium, blade parts, Xtreme Dash, best starter combos, and how to enter Indian tournaments.",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(38),
  },

  // ── 4. Yu-Gi-Oh! Deck Building 101 ──────────────────────────────────────
  {
    id: "blog-yugioh-deck-building-101-beginners",
    slug: "blog-yugioh-deck-building-101-beginners",
    title: "Yu-Gi-Oh! Deck Building 101 — From Core Rules to Competitive Play",
    excerpt:
      "Building your first Yu-Gi-Oh! deck can be overwhelming. Here's a structured guide from choosing an archetype to making your first tournament-legal 40-card deck.",
    content: `<h2>The Golden Rule: 40 Cards</h2>
<p>Every competitive Yu-Gi-Oh! deck runs exactly 40 cards. More cards means lower consistency — you draw key pieces less often. Exceptions exist (60-card Pile formats) but start at 40.</p>
<h2>Deck Structure</h2>
<ul>
<li><strong>Main Deck</strong>: 40–60 cards (start at 40)</li>
<li><strong>Extra Deck</strong>: 0–15 Fusion/Synchro/XYZ/Link monsters</li>
<li><strong>Side Deck</strong>: 0–15 cards (for post-game 2 adjustments in tournament play)</li>
</ul>
<h2>Choosing Your First Archetype</h2>
<p><strong>Blue-Eyes White Dragon</strong>: Classic, powerful, tons of support. Relatively affordable.<br>
<strong>Dark Magician</strong>: Spell-heavy, good for learning card interactions.<br>
<strong>Sky Striker</strong>: Modern, Spell-based, single monster strategy. Teaches resource management.<br>
<strong>Branded Despia</strong>: 2024's most popular. High ceiling, deep combo potential.</p>
<h2>Card Rarity and Budget</h2>
<p>Structure Decks (₹799–999) are the best starting point — 3 copies of key cards for a single archetype. One structure deck often includes most of the main engine. Buy 3 copies of the same structure deck for a complete playset of all common cards.</p>
<h2>Building a Competitive Hand Trap Package</h2>
<p>Every competitive deck runs 6–9 hand traps. Ash Blossom & Joyous Spring (₹800–1,200), Nibiru the Primal Being (₹500–800), and Effect Veiler (₹200–400) are the three must-haves regardless of archetype.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["yugioh", "deck-building", "tcg", "konami", "trading-cards"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(30),
    authorId: "user-nisha-reddy",
    authorName: "Nisha Reddy",
    readTimeMinutes: 6,
    views: 2870,
    metaTitle: "Yu-Gi-Oh! Deck Building 101 for Beginners | LetItRip",
    metaDescription:
      "Learn how to build your first Yu-Gi-Oh! deck from scratch — 40-card rule, archetypes, budget tips, and hand trap essentials.",
    createdAt: daysAgo(32),
    updatedAt: daysAgo(30),
  },

  // ── 5. Gundam MG vs RG Guide ─────────────────────────────────────────────
  {
    id: "blog-gundam-mg-vs-rg-which-grade-to-start",
    slug: "blog-gundam-mg-vs-rg-which-grade-to-start",
    title: "Gundam MG vs RG — Which Grade Should You Start With?",
    excerpt:
      "Master Grade or Real Grade? Both look stunning on a shelf, but they build completely differently. Here's how to choose based on your skill level, budget, and how much time you want to invest.",
    content: `<h2>Understanding Gunpla Grades</h2>
<p>Bandai's Gundam plastic model kits (Gunpla) come in grades: HG (High Grade, 1/144 scale), RG (Real Grade, 1/144 scale), MG (Master Grade, 1/100 scale), and PG (Perfect Grade, 1/60 scale). The grade indicates detail level, inner frame complexity, and build difficulty.</p>
<h2>Real Grade (RG) — 1/144 Scale</h2>
<p>RG kits pack MG-level detail into a small 1/144 frame. They feature an inner skeletal frame that pre-assembles before adding armour. The result is stunning — but the tiny parts are unforgiving. A misaligned snap can crack a piece that is 3mm wide. RG is recommended for builders who have completed 5+ HG kits and want to push skill limits. Price: ₹1,800–3,500.</p>
<h2>Master Grade (MG) — 1/100 Scale</h2>
<p>MG kits are larger, with parts that are easier to handle. The inner frame is built section-by-section (leg frame, arm frame, torso). MGs show off cockpit detail, hand articulation, and engineering that RGs can't match at their scale. MG is recommended for builders who have completed 2–3 HGs and want a flagship piece. Price: ₹2,800–6,500.</p>
<h2>Which to Buy First?</h2>
<p>If you're a beginner: start with HG RX-78-2 (₹800). If you've built a few HGs and want more detail at low cost: RG Unicorn Gundam (₹2,200). If you want a display piece and don't mind spending more time: MG Wing Zero EW (₹4,500). Both RG and MG benefit enormously from panel lining, top-coat spray, and decals — budget ₹500–800 for finishing supplies.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1595241422400-04a3e1e2e0d5?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["gundam", "gunpla", "mg", "rg", "bandai", "model-kits"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(22),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 7,
    views: 1950,
    metaTitle: "Gundam MG vs RG — Which Grade to Start With? | LetItRip",
    metaDescription:
      "Choosing between Gundam Master Grade and Real Grade kits — difficulty, scale, price, and which to buy as your first or second Gunpla build.",
    createdAt: daysAgo(24),
    updatedAt: daysAgo(22),
  },

  // ── 6. How to Spot Fake Pokémon Cards ────────────────────────────────────
  {
    id: "blog-how-to-spot-fake-pokemon-cards-authentication",
    slug: "blog-how-to-spot-fake-pokemon-cards-authentication",
    title: "How to Spot Fake Pokémon Cards — 7 Authentication Tests",
    excerpt:
      "Counterfeit Pokémon cards have become increasingly convincing. Here are 7 tests you can do at home to verify a card is authentic before spending thousands of rupees.",
    content: `<h2>Why Fakes Are a Problem Now</h2>
<p>Chinese counterfeit Pokémon cards have improved dramatically since 2022. Basic fakes are easy to spot, but high-quality "proxies" can fool casual collectors. A fake PSA slab was reported in 2024. Always buy from verified sellers like those on LetItRip with review histories.</p>
<h2>Test 1: The Light Test</h2>
<p>Hold the card up to a bright light. Real Pokémon cards have a black core layer between the front and back. This shows as an unbroken dark line around all edges. Fakes often show a solid colour or uneven core.</p>
<h2>Test 2: The Rip Test (last resort)</h2>
<p>If you're willing to destroy a cheap suspected fake, rip it. Real cards tear to reveal a black core layer. Never do this on a card you want to keep — it's destructive.</p>
<h2>Test 3: Print Dot Pattern</h2>
<p>Under 60× jeweller's loupe, real cards show a regular CMYK dot-rosette pattern. Fakes often show a blurry smear, irregular dots, or an inkjet pattern of random dots.</p>
<h2>Test 4: Colour and Saturation</h2>
<p>Real Pokémon cards have specific Pantone-matched colours. Fakes are often washed out (desaturated) or too vivid. Compare the yellow Pokémon card border to a known-authentic card of the same era.</p>
<h2>Test 5: Font and Text</h2>
<p>Gill Sans is the Pokémon TCG font. Fakes often use a visually similar but incorrect font — inspect the numbers on HP and attack damage. Real cards have crisp, sharp edges on all text.</p>
<h2>Test 6: Card Feel (Flex Test)</h2>
<p>Real Pokémon cards have a specific stiffness — they flex slightly and snap back. Fakes are often too stiff (printed on thicker card stock) or too flexible. Develop a feel by handling known-authentic cards first.</p>
<h2>Test 7: UV Light Test</h2>
<p>Under 365nm UV light, real Pokémon cards show the holographic pattern glowing distinctly. Fakes often show a uniform glow or wrong colour fluorescence. A UV torch costs ₹200–400 and is worth having in every collector's kit.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.TIPS,
    tags: ["pokemon-cards", "authentication", "fake-cards", "collecting-tips"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(15),
    authorId: "user-aryan-kapoor",
    authorName: "Aryan Kapoor",
    readTimeMinutes: 7,
    views: 3640,
    metaTitle: "How to Spot Fake Pokémon Cards — 7 Authentication Tests | LetItRip",
    metaDescription:
      "7 at-home tests to authenticate Pokémon cards: light test, print dots, font check, UV test, and more. Protect yourself from counterfeits.",
    createdAt: daysAgo(17),
    updatedAt: daysAgo(15),
  },

  // ── 7. Funko Pop Storage & Display Tips ──────────────────────────────────
  {
    id: "blog-funko-pop-storage-display-tips",
    slug: "blog-funko-pop-storage-display-tips",
    title: "Funko Pop Storage & Display Tips — Keep Your Collection Box-Fresh",
    excerpt:
      "A Mint-in-Box Funko Pop can be worth 5–20× a loose one. Here's how to store, display, and protect your collection from UV, dust, moisture, and box damage.",
    content: `<h2>Why Condition Matters for Value</h2>
<p>Funko Pop resell value is almost entirely driven by box condition. A Mint-in-Box (MIB) exclusive can fetch ₹2,000–15,000; the same Pop with a creased window or torn flap drops to ₹400–800. Protect the box from day one.</p>
<h2>Pop Protectors</h2>
<p>Hard plastic Pop Protectors (₹80–120 each) are essential for any Pop worth over ₹500. They prevent box dents, moisture contact, and UV yellowing. Stack-safe protectors allow vertical stacking without pressure on the top Pop's box. Buy in packs of 25–50 to reduce per-unit cost.</p>
<h2>Display Shelving</h2>
<p>IKEA KALLAX cubes (each cube fits 6–9 standard Pops) are the community standard. For premium display, acrylic risers (₹150–400) create a stadium effect. Keep shelves away from south-facing windows — UV light yellows clear window boxes within 12 months.</p>
<h2>Temperature and Humidity</h2>
<p>Store at 18–25°C and 40–50% relative humidity. Above 60% humidity, cardboard softens and moulds. Below 30%, card stock becomes brittle. A ₹500 hygrometer inside your display cabinet ensures you know the conditions.</p>
<h2>Moving and Shipping Pops</h2>
<p>Double-box every Pop for shipping — outer box 5–7cm larger than inner box, filled with bubble wrap. Newspaper is not sufficient padding. Mark "FRAGILE — COLLECTIBLE" on all sides. A ₹150 insurance add-on covers replacement if carrier damages the item.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1618842676088-c4d48a6a7571?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.TIPS,
    tags: ["funko-pop", "display", "storage", "collecting-tips", "protection"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(9),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 5,
    views: 1230,
    metaTitle: "Funko Pop Storage & Display Tips — Keep Boxes Mint | LetItRip",
    metaDescription:
      "How to store and display Funko Pops: Pop Protectors, KALLAX shelving, UV protection, humidity control, and safe shipping tips.",
    createdAt: daysAgo(11),
    updatedAt: daysAgo(9),
  },

  // ── 8. Tomica Limited Vintage Collector's Guide ───────────────────────────
  {
    id: "blog-tomica-limited-vintage-collectors-guide",
    slug: "blog-tomica-limited-vintage-collectors-guide",
    title: "Tomica Limited Vintage — The Complete Collector's Guide for India",
    excerpt:
      "Tomica Limited Vintage (TLV) models are some of the finest 1:64 diecast cars ever made — painted in period-correct colours, on die-cast metal bodies with opening doors and accurate interior details.",
    content: `<h2>What is Tomica Limited Vintage?</h2>
<p>Tomica Limited Vintage is a premium Takara Tomy sub-brand producing highly detailed 1:64 scale Japanese classic cars from the 1960s–1980s. Unlike standard Tomica (₹300–500), TLV models retail at ₹1,800–4,000 and include rubber tyres, opening parts, and period livery options like police cars and taxis.</p>
<h2>TLV vs TLV-N (Neo)</h2>
<p>The original TLV line covers pre-1975 Japanese cars. TLV-N (Neo) extends to 1980s and some 1990s models. TLV-N models often have more opening parts and softer plastics. Both share the same 1:64 scale and are cross-compatible for display.</p>
<h2>Most Sought-After TLV Models in India</h2>
<ul>
<li><strong>TLV Datsun Bluebird 1600SSS (1969)</strong> — rally heritage livery, ₹3,500–5,000</li>
<li><strong>TLV-N Toyota Corolla Levin AE86 Sprinter</strong> — Initial D connection, ₹2,800–4,500</li>
<li><strong>TLV Nissan Skyline GT-R KPGC10</strong> — Hakosuka, ₹4,000–7,000</li>
<li><strong>TLV Honda N360 (1967)</strong> — kei car classic, ₹2,200–3,800</li>
</ul>
<h2>Where to Buy in India</h2>
<p>TLV models are not available at regular toy retailers. Source from importers, dedicated collector shops, and LetItRip's Diecast Depot store. New releases ship from Japan 2–3 months after the Japanese release date. Pre-orders sell out fast — register your interest on the LetItRip pre-order section.</p>
<h2>Storage and Display</h2>
<p>TLV models come in individual plastic display cases inside a cardboard outer box. Keep in original cases — the plastic yellows if left in direct sunlight. IKEA DETOLF glass cabinet with LED lighting is the community favourite for premium display.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1563642421748-5047b6585a4a?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["tomica", "tomica-limited-vintage", "tlv", "diecast", "japanese-cars"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(4),
    authorId: "user-vikram-mehta",
    authorName: "Vikram Mehta",
    readTimeMinutes: 6,
    views: 890,
    metaTitle: "Tomica Limited Vintage Collector's Guide for India | LetItRip",
    metaDescription:
      "Complete guide to collecting Tomica Limited Vintage — TLV vs TLV-N, top models, where to buy in India, and display tips.",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(4),
  },

  // ── 9. Pokémon TCG SV Era Set Review ─────────────────────────────────────
  {
    id: "blog-pokemon-scarlet-violet-era-set-review",
    slug: "blog-pokemon-scarlet-violet-era-set-review",
    title: "Pokémon TCG Scarlet & Violet Era — Best Sets to Invest In",
    excerpt:
      "The SV block has produced some of the most printed Pokémon sets ever — but a few releases stand out as long-term investment plays. Here is our 18-month outlook.",
    content: `<h2>SV Era — Context</h2>
<p>Scarlet & Violet kicked off in March 2023 with a base set that printed at unprecedented volumes. The era has seen 9 main sets so far, plus special expansions and Pokémon Center exclusives.</p>
<h2>Sets Worth Holding Sealed</h2>
<p><strong>Paldea Evolved</strong> — Iono Special Illustration Rare drove secondary prices on character art chases. Booster boxes still trade near MSRP. Long-term sealed potential: moderate.</p>
<p><strong>151</strong> — The nostalgia-driven Kanto reprint set is the strongest SV-era performer. Booster boxes have appreciated 40% since release. Hold sealed.</p>
<p><strong>Shrouded Fable</strong> — Pecharunt mini-set with strong art rares. Limited print compared to mainline sets. Speculative hold.</p>
<h2>Cards to Watch in Singles</h2>
<ol>
<li>Iono SIR (Paldea Evolved) — character art chase, female trainer demand.</li>
<li>Charizard ex Obsidian Flames Hyper Rare — flagship card of the era.</li>
<li>Mew ex 151 — nostalgia chase, low alt-art print run.</li>
<li>Pikachu ex Surging Sparks — Special Illustration Rare with strong eye-appeal.</li>
</ol>
<p>Buy what you like, hold long-term, and never YOLO an entire investment thesis on one set.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["pokemon", "tcg", "investment", "sv-era", "set-review"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(50),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 6,
    views: 3210,
    metaTitle: "Pokémon SV Era Set Review — Best Sets to Invest | LetItRip",
    metaDescription:
      "Detailed review of Scarlet & Violet Pokémon TCG sets — which to hold sealed, which singles to chase, and 18-month outlook.",
    createdAt: daysAgo(52),
    updatedAt: daysAgo(50),
  },

  // ── 10. Hot Wheels Treasure Hunt Pulls Strategy ──────────────────────────
  {
    id: "blog-hot-wheels-treasure-hunt-pulls-strategy",
    slug: "blog-hot-wheels-treasure-hunt-pulls-strategy",
    title: "Hot Wheels Treasure Hunt Pulls — Maximising Your Hunt",
    excerpt:
      "Treasure Hunts and Super Treasure Hunts are the holy grail for HW collectors. Here is how to actually find them at retail in India.",
    content: `<h2>TH vs STH</h2>
<p>Treasure Hunts have a flame logo on the card and standard wheel-and-tyre combo. Super Treasure Hunts have Real Riders rubber tyres, Spectraflame paint, and a TH logo hidden inside the artwork. STH cards trade 5–20× retail; TH cards 2–4×.</p>
<h2>Case-Hit Ratios</h2>
<p>An A/B/C/D case mix has roughly 1 STH per 72 cars and 1 TH per 72 cars. That means a single case yields one of each. Knowing the case codes printed on the cardback (J24, K24, L24, etc.) is what separates hunters from random shoppers.</p>
<h2>Where to Hunt in India</h2>
<ol>
<li><strong>Hamleys, Reliance Smart, and Hypercity</strong> — restock Wednesdays in metro cities.</li>
<li><strong>Mall toy stores</strong> — Crossword, Funskool boutiques — restock weekly.</li>
<li><strong>Toy section in Big Bazaar / Star Bazaar</strong> — sometimes carries STH overlooked.</li>
<li><strong>Online: Flipkart, Amazon</strong> — pricing inflated; better for verified STH.</li>
</ol>
<h2>Identifying STH at a Glance</h2>
<p>Flip the car and look at the wheels. Real Riders (rubber, separate wheel + tyre piece) = STH. Standard 5-spoke or HW basic wheels = regular release. The Spectraflame paint flashes blue/green/purple under store fluorescent light. Practice in front of a mirror with a known STH so your eye gets calibrated.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["hot-wheels", "treasure-hunt", "super-th", "hunting", "diecast"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(45),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 5,
    views: 2890,
    metaTitle: "Hot Wheels Treasure Hunt Hunting Strategy India | LetItRip",
    metaDescription:
      "How to find Hot Wheels Treasure Hunts and Super Treasure Hunts at retail in India — case-hit ratios, restock days, and identification tips.",
    createdAt: daysAgo(47),
    updatedAt: daysAgo(45),
  },

  // ── 11. Selling Tips for First-Time Sellers ──────────────────────────────
  {
    id: "blog-first-time-seller-tips-photography-shipping",
    slug: "blog-first-time-seller-tips-photography-shipping",
    title: "First-Time Seller's Guide — Photography, Pricing, and Shipping",
    excerpt:
      "About to list your first collectibles on LetItRip? This guide covers the three biggest mistakes new sellers make and how to avoid them.",
    content: `<h2>Photography</h2>
<p>Bad photos lose 70% of potential buyers in the first three seconds. Use natural light from a north-facing window. Shoot the front, back, and any defects honestly. Show the slab cert number for graded cards. Six photos minimum per listing.</p>
<h2>Pricing</h2>
<p>Check completed sales (not active listings) on three or more platforms for comps. Underprice slightly for first sales to build reviews — a 4.9-star seller commands a 10–15% premium across the board.</p>
<h2>Shipping</h2>
<p>Use rigid mailers for cards. Foam-lined boxes for figures and diecast. Always include tracking. India Post Speed Post is reliable for under ₹5,000 items; Blue Dart or DTDC Plus for higher value. Insure anything over ₹3,000.</p>
<h2>Common Mistakes</h2>
<ol>
<li>Generic stock photos instead of actual item — buyers will dispute.</li>
<li>No defect disclosure — leads to refunds and bad reviews.</li>
<li>Ignoring offers and messages — kills repeat business.</li>
<li>Soft-packing fragile items — broken in transit means losing both shipping and item cost.</li>
</ol>
<p>Start small, build a track record, then scale your store inventory.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["selling", "seller-tips", "photography", "shipping", "pricing"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(38),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 4,
    views: 1640,
    metaTitle: "First-Time Seller Guide — Photos, Pricing, Shipping | LetItRip",
    metaDescription:
      "Three biggest mistakes new collectibles sellers make and how to avoid them. Photography, pricing, and shipping basics.",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(38),
  },

  // ── 12. Anime Figure Bootleg Detection ───────────────────────────────────
  {
    id: "blog-anime-figure-bootleg-detection-guide",
    slug: "blog-anime-figure-bootleg-detection-guide",
    title: "How to Spot a Bootleg Anime Figure",
    excerpt:
      "The Chinese bootleg figure market is sophisticated enough that even seasoned collectors get fooled. Here are the tells that separate authentic from KO.",
    content: `<h2>Box Tells</h2>
<p>Authentic Good Smile, Bandai, and Alter boxes have crisp four-colour printing with consistent registration. Bootleg boxes often show slight misalignment on dark colours, lower-resolution character art, and Japanese text that's clearly photocopied.</p>
<h2>Sculpt Tells</h2>
<p>Compare the production figure against the official prototype photos. Eye paint is the #1 bootleg giveaway — bootlegs have crooked, asymmetric, or smudged eyes. Hair flow lines that should be sharp will be soft or blobby on a bootleg.</p>
<h2>Paint Tells</h2>
<p>Look at gradient skin tones. Authentic figures use 3–4 layer airbrushed paint. Bootlegs are usually a single flat tone or have visible brush strokes. Hair highlights look painted-on, not airbrushed.</p>
<h2>Base + Accessories</h2>
<p>Authentic bases are heavy plastic with smooth molding. Bootleg bases warp and have visible mold-line seams. Accessories like swords or magic effects come in separate compartments in authentic packaging; bootlegs often dump them all together.</p>
<h2>Where to Buy Safely</h2>
<p>AmiAmi, HobbyLink Japan, BBTS, and Solaris Japan are authorised. On LetItRip we verify every figure seller's box photos and run cross-checks against official prototype images before approval. Avoid any "deal too good to be true" — bootleg pricing is usually 30–50% below MSRP.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["anime-figures", "bootleg-detection", "authentication", "buying-guide"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(32),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 6,
    views: 2450,
    metaTitle: "How to Spot a Bootleg Anime Figure | LetItRip",
    metaDescription:
      "Detailed guide to spotting bootleg anime figures — box, sculpt, paint, and base tells. Stay safe buying figures online.",
    createdAt: daysAgo(34),
    updatedAt: daysAgo(32),
  },

  // ── 13. Gunpla Build Tips for Beginners ──────────────────────────────────
  {
    id: "blog-gunpla-beginner-build-tips-essential-tools",
    slug: "blog-gunpla-beginner-build-tips-essential-tools",
    title: "Gunpla for Beginners — Essential Tools and First Build Tips",
    excerpt:
      "Starting your first Gunpla can be intimidating with 200+ parts. Here is exactly what tools you need and which kits to start with.",
    content: `<h2>Tools You Actually Need</h2>
<ol>
<li><strong>God Hand SPN-120 nippers</strong> (₹3,500) — single-edge cutters for clean cuts. Worth every rupee.</li>
<li><strong>Hobby knife with replacement blades</strong> — for cleaning nub marks.</li>
<li><strong>Sanding sticks 400/600/800 grit</strong> — smooth nub remnants.</li>
<li><strong>Gundam markers</strong> — panel lining without ink bleed.</li>
<li><strong>Top coat spray</strong> — matte or gloss finish protects paint and decals.</li>
</ol>
<h2>Kits to Start With</h2>
<p><strong>HG RX-78-2 Revive</strong> (₹2,500) — modern engineering, snap-fit, no glue. 90 minutes to build. Perfect first kit.</p>
<p><strong>HG Barbatos</strong> (₹2,800) — Iron-Blooded Orphans series, popular silhouette, articulated frame.</p>
<p><strong>RG Zaku II</strong> (₹4,200) — Real Grade engineering with internal frame and runners. Step up from HG.</p>
<h2>Build Process</h2>
<p>Read the instruction book front-to-back before cutting any plastic. Cut twice — first cut leaves a nub on the part, second cut trims close, then sand smooth. Test-fit major sections before final assembly. Panel-line in stages so the ink doesn't dry on your hands.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["gunpla", "gundam", "model-kits", "beginner", "tools"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(28),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 5,
    views: 1980,
    metaTitle: "Gunpla for Beginners — Tools and First Build | LetItRip",
    metaDescription:
      "Essential tools for your first Gunpla build, recommended starter kits, and a step-by-step process. Beginner-friendly guide.",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(28),
  },

  // ── 14. Yu-Gi-Oh! Investment Cards ───────────────────────────────────────
  {
    id: "blog-yugioh-investment-cards-2026",
    slug: "blog-yugioh-investment-cards-2026",
    title: "Yu-Gi-Oh! Investment Cards to Watch in 2026",
    excerpt:
      "Yu-Gi-Oh! singles market has matured into a serious investment space. Five cards we expect to outperform over the next 12 months.",
    content: `<h2>Why Yu-Gi-Oh! Now</h2>
<p>The 25th Anniversary Quarter Century Secret Rares have shifted price floors permanently higher. PSA-graded vintage 1st Edition LOB has appreciated 280% over five years. The market is real.</p>
<h2>Cards to Watch</h2>
<ol>
<li><strong>LOB-001 Blue-Eyes White Dragon 1st Edition PSA 9</strong> — flagship vintage card; appreciation track record is the strongest in the game.</li>
<li><strong>LOB-000 Exodia the Forbidden One 1st Edition</strong> — pop-culture iconic, low PSA 9+ population.</li>
<li><strong>Magician of Black Chaos LC01 25th Quarter Century</strong> — Yugi's anime ace, sub-200 PSA 10 globally.</li>
<li><strong>Dark Magician Girl 1st Edition Magician's Force</strong> — strong female-character demand.</li>
<li><strong>Tournament Black-Eyes prize cards</strong> — limited distribution, ultra-low supply.</li>
</ol>
<p>Always buy graded slabs from PSA/BGS — Yu-Gi-Oh! has a higher bootleg/reprint rate than Pokémon.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["yugioh", "investment", "vintage", "psa", "1st-edition"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(22),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 4,
    views: 1320,
    metaTitle: "Yu-Gi-Oh! Investment Cards 2026 | LetItRip",
    metaDescription:
      "Five Yu-Gi-Oh! cards expected to outperform in 2026 — vintage LOB classics, 25th anniversary Quarter Century, tournament prize cards.",
    createdAt: daysAgo(24),
    updatedAt: daysAgo(22),
  },

  // ── 15. Funko Pop Vaulting Strategy ──────────────────────────────────────
  {
    id: "blog-funko-pop-vaulting-strategy-collectors",
    slug: "blog-funko-pop-vaulting-strategy-collectors",
    title: "Understanding Funko Pop Vaulting — Buy or Wait?",
    excerpt:
      "Funko 'vaults' over 100 pops per year — making yesterday's $10 figure tomorrow's $80 chase. Should you stockpile or play the secondary market?",
    content: `<h2>What Vaulting Means</h2>
<p>When Funko vaults a Pop, they stop production permanently. Existing units become the only supply. Demand-driven appreciation follows for 12–36 months until the market saturates with secondary listings.</p>
<h2>Top Recent Vaultings</h2>
<ol>
<li>Stan Lee Glow Chase (vaulted 2023) — now ₹8,000 from ₹1,200 MSRP.</li>
<li>Marvel Mech Strike Iron Man Translucent — vaulted 2024, tripled secondary.</li>
<li>Demon Slayer Nezuko in Box (vaulted 2024) — anime category continues to outperform.</li>
</ol>
<h2>How to Play It</h2>
<p><strong>Stockpile strategy:</strong> Buy 2–3 of any pop you genuinely like at MSRP. One for display, one sealed, one to sell when vaulted. Works long-term; ties up capital.</p>
<p><strong>Secondary-market strategy:</strong> Wait 18–24 months after a vault is announced, then buy mint-in-box from established sellers. Pricing usually peaks around 24–30 months then plateaus.</p>
<h2>Pop Protectors</h2>
<p>Use UV-rated rigid acrylic protectors (₹250 each) — sun-faded box artwork can lose 50% of value. Storage in original outer cardboard helps.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["funko-pop", "vaulting", "investment", "secondary-market", "stan-lee"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(18),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 4,
    views: 970,
    metaTitle: "Funko Pop Vaulting Strategy — Buy or Wait | LetItRip",
    metaDescription:
      "How Funko vaulting drives secondary-market appreciation. Stockpile vs wait-and-buy strategies and recent vaulted hits.",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(18),
  },

  // ── 16. Beyblade X Tournament Format ─────────────────────────────────────
  {
    id: "blog-beyblade-x-tournament-format-guide",
    slug: "blog-beyblade-x-tournament-format-guide",
    title: "Beyblade X Tournament Format — Sanctioned Rules Explained",
    excerpt:
      "Beyblade X tournaments use a different ruleset from Burst. Here is everything you need to know before entering your first sanctioned event.",
    content: `<h2>Match Format</h2>
<p>Best of 5 rounds. Each round awards 1 point for ring-out/burst, 2 points for extreme-finish (X-finish). First to 5 wins.</p>
<h2>Deck Building</h2>
<p>Each player brings a 3-Bey deck. Players choose 1 Bey before each round; opponent must choose simultaneously and reveal at the same time. No mid-match swaps.</p>
<h2>Banned Parts</h2>
<p>As of January 2026, Hells Hammer / Hells Reaper are banned in sanctioned play due to consistency exploits. Always check the WBO/Takara-Tomy official banned-parts list before competition.</p>
<h2>Match Etiquette</h2>
<p>Bow at start and end. Shake hands. No tampering with launchers or Beys during opponent's setup. Judges may inspect any Bey at any time.</p>
<h2>India Tournament Calendar</h2>
<p>Mumbai Open (Q1), Bangalore Beyblade League (Q2), Delhi WBO Regional (Q3), Hyderabad Championship (Q4). Prize support varies by region; usually merchandise + cash for top 4.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.NEWS,
    tags: ["beyblade-x", "tournament", "rules", "competitive", "wbo"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(14),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 3,
    views: 760,
    metaTitle: "Beyblade X Tournament Format — Sanctioned Rules | LetItRip",
    metaDescription:
      "Complete Beyblade X tournament format guide — match rules, deck building, banned parts, and India calendar.",
    createdAt: daysAgo(16),
    updatedAt: daysAgo(14),
  },

  // ── 17. Hot Wheels RLC Membership Worth It? ──────────────────────────────
  {
    id: "blog-hot-wheels-rlc-membership-worth-it-2026",
    slug: "blog-hot-wheels-rlc-membership-worth-it-2026",
    title: "Is Hot Wheels Red Line Club Membership Worth It in 2026?",
    excerpt:
      "RLC membership costs $19.99/year and grants access to exclusive Spectraflame releases. Here is whether it actually pays off for an Indian collector.",
    content: `<h2>What RLC Includes</h2>
<p>Annual membership grants: limited-edition exclusive Hot Wheels release (Real Riders, Spectraflame paint, individually numbered), 4–6 RLC-only catalogue car releases, access to RLC convention pre-orders, and discount on Mattel Creations drops.</p>
<h2>The Math for India</h2>
<p>Membership: $19.99 (~₹1,700). Exclusive arrives via FedEx (~₹1,200 international shipping). Total landed cost: ~₹2,900. Secondary-market value of past 5 years' RLC exclusives: ₹3,500–₹6,000 each. Net positive even if you flip immediately.</p>
<h2>Risks</h2>
<p>Membership opens January 1, sells out within 4 hours. If you miss the window, no resale of memberships allowed. Some years' exclusives are duds — 2022 Datsun 510 underperformed. Quality control: 5% of exclusives ship damaged.</p>
<h2>Should You Join?</h2>
<p>Yes, if: you collect Spectraflame, you can be online 1 January 9 AM IST, and you have a reliable US shipping forwarder. No, if: you only collect mainline, you can't justify ₹3,000 entry, or you don't want to track membership renewal dates.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["hot-wheels", "rlc", "membership", "spectraflame", "exclusive"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(10),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 4,
    views: 510,
    metaTitle: "Hot Wheels RLC Membership Worth It 2026 | LetItRip",
    metaDescription:
      "Detailed cost-benefit analysis of Hot Wheels Red Line Club membership for Indian collectors in 2026.",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(10),
  },

  // ── 18. Display & Storage for High-Value Collectibles ────────────────────
  {
    id: "blog-displaying-high-value-collectibles-tips",
    slug: "blog-displaying-high-value-collectibles-tips",
    title: "Displaying High-Value Collectibles — UV, Humidity, and Theft-Proofing",
    excerpt:
      "Investing in collectibles is one thing — protecting them is another. Three environmental threats and how to mitigate each.",
    content: `<h2>UV Damage</h2>
<p>Direct sunlight fades any printed cardboard, foil, or coloured plastic within months. Use UV-filtered acrylic display cases (₹2,000–₹8,000 depending on size). Keep display rooms east-facing or interior; avoid south-facing rooms in tropical India.</p>
<h2>Humidity</h2>
<p>India's monsoon humidity (60–85% RH) is a card collector's worst enemy. Cards warp, slab labels mildew, autograph signatures fade. Use silica gel packs in sealed display containers. Maintain 35–45% RH with a small dehumidifier in dedicated rooms (₹6,000–₹15,000).</p>
<h2>Theft-Proofing</h2>
<p>Don't post specific high-value items on public social media. If displaying at events, photograph items beforehand for insurance documentation. Home safe with bolt-down mount for ₹50k+ items; bank locker for ₹2L+ items. Renter's/homeowner's insurance with collectibles rider costs ~₹2,000/year and covers up to ₹5L in covered items.</p>
<h2>Cleaning</h2>
<p>Microfibre cloth only for figures. For cards in slabs, soft brush + can of compressed air. Never use solvents or sprays on direct paint. Dust acrylic cases monthly to prevent buildup that scratches when wiped.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["display", "storage", "uv-protection", "humidity", "insurance"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(5),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 5,
    views: 380,
    metaTitle: "Displaying High-Value Collectibles | LetItRip",
    metaDescription:
      "Protect your collectibles from UV, humidity, and theft. Display case, dehumidifier, and insurance recommendations for India.",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },

  // ── 19. Pre-Order Anatomy: Pokémon Sets ──────────────────────────────────
  {
    id: "blog-pre-order-anatomy-pokemon-tcg-sets",
    slug: "blog-pre-order-anatomy-pokemon-tcg-sets",
    title: "Pre-Order Anatomy — How Pokémon TCG Sets Get to India",
    excerpt:
      "Why do Pokémon pre-orders take 45–90 days from announcement to your hands? The supply chain explained.",
    content: `<h2>Announcement → Production</h2>
<p>Pokémon Company International announces a set 6 months before street date. Production at Toppan/DNP Japan begins 3 months out. Print quantities are decided based on distributor pre-orders.</p>
<h2>Distribution → India</h2>
<p>Sets ship via sea freight from Japan/USA to Mumbai/Chennai ports — typically 4–6 weeks. Customs clearance adds 1–2 weeks. Distributors then ship to retailers across India.</p>
<h2>Why Pre-Orders Make Sense</h2>
<p>Allocation. Premium sets (Crown Zenith, 151, Hidden Fates) are produced in capped quantities. Distributors fulfil pre-orders first; remaining stock is unpredictable. Pre-ordering at LetItRip locks your unit and your price (no street-price markup).</p>
<h2>What Goes Wrong</h2>
<p>Production delays (Charizard ex shortage 2023 added 6 weeks). Customs hold-ups during Diwali season. Currency fluctuation (USD spike means seller may revise price). All these are reasons we offer cancellable pre-orders with full deposit refund.</p>
<h2>Tips</h2>
<p>Pre-order from sellers with multi-year track record. Check fulfilment ETAs against announced street date — if a seller promises faster than the official street date, be suspicious. Pay deposits via Razorpay/UPI only; never advance the full amount.</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: ["pre-orders", "pokemon", "supply-chain", "distribution", "buying-guide"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(3),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 4,
    views: 220,
    metaTitle: "Pokémon TCG Pre-Order Anatomy — Supply Chain | LetItRip",
    metaDescription:
      "Why Pokémon TCG pre-orders take 45–90 days and how the supply chain works. Pre-ordering tips for Indian collectors.",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },

  // ── 20. LetItRip Marketplace Year in Review ──────────────────────────────
  {
    id: "blog-letitrip-year-in-review-2026",
    slug: "blog-letitrip-year-in-review-2026",
    title: "LetItRip Year in Review — Highlights from 2026 So Far",
    excerpt:
      "Our collectibles community has grown to 15,000+ active buyers and 50+ verified sellers. Here is what stood out in the first half of 2026.",
    content: `<h2>Community Growth</h2>
<p>Active monthly users: 15,200 (up from 4,800 in 2025). Verified sellers: 52. Average listings per day: 340.</p>
<h2>Most-Searched Categories</h2>
<ol>
<li>Pokémon TCG singles (32% of searches)</li>
<li>Hot Wheels mainline + STH (18%)</li>
<li>Anime figures — S.H.Figuarts + Nendoroids (14%)</li>
<li>Beyblade X (9%)</li>
<li>Gunpla HG/RG (8%)</li>
</ol>
<h2>Auction Highlights</h2>
<p>Biggest auction sale: 1st Edition Base Set Charizard PSA 9 — ₹2,99,999. Most bids: Hot Wheels Spectraflame Pink Camaro Redline — 14 bids.</p>
<h2>Coming Soon</h2>
<p>Bundle listings (Q3), Prize Draw system (Q4), Live Streaming for sellers (early 2027). Stay tuned to our blog for the roadmap.</p>
<h2>Thank You</h2>
<p>To every seller, buyer, and lurker — thank you for trusting LetItRip with your collectibles journey. Keep ripping!</p>`,
    coverImage:
      "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&h=630&fit=crop",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.NEWS,
    tags: ["letitrip", "year-in-review", "community", "marketplace", "stats"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(1),
    authorId: "user-admin-letitrip",
    authorName: "LetItRip Admin",
    readTimeMinutes: 3,
    views: 1820,
    metaTitle: "LetItRip Year in Review 2026 | LetItRip",
    metaDescription:
      "Highlights from the first half of 2026 on LetItRip — community stats, top categories, auction records, and coming features.",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
];
