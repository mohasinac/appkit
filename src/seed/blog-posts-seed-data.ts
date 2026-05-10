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
];
