/**
 * Blog Posts Seed Data — Anime / Otaku Marketplace
 * Sample blog posts across all categories for development and testing
 */

import type { BlogPostDocument } from "../features/blog/schemas";
import { BLOG_POST_FIELDS } from "../features/blog/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const blogPostsSeedData: Partial<BlogPostDocument>[] = [
  // -- Featured / Published ----------------------------------------------
  {
    id: "blog-top-10-rarest-anime-figures-2026-guides",
    title: "Top 10 Rarest Anime Figures You Can Actually Buy in 2026",
    slug: "top-10-rarest-anime-figures-2026",
    excerpt:
      "From limited-run Kotobukiya ARTFX statues to out-of-print Good Smile Company Nendoroids — we rank the 10 most coveted figures that still occasionally surface on the secondary market.",
    content: `<h2>1. Evangelion Unit-01 Ver. Ka — MegaHouse Master Grade</h2><p>Originally released in 2012 as a convention exclusive, this 1/60-scale articulated statue regularly commands ₹50,000+ at auction. Its translucent AT-Field base and hand-painted panel lines make it the crown jewel of any Eva collection.</p><h2>2. Good Smile Company — Rem Wedding Dress 1/7 Scale</h2><p>First sold exclusively at Wonder Festival 2019, Rem's wedding version shipped only to Japan-based buyers and sold out in minutes. Secondary market prices hover around ₹25,000–35,000 worldwide.</p><h2>3. Kotobukiya ARTFX J — Makima 1/7 (Chainsaw Man)</h2><p>Released in early 2025, this figure sold out globally in 48 hours. Sculpted by Takashi Tanaka, its flowing coat and hypnotic eye detail set a new bar for Chainsaw Man merchandise.</p><h2>4. Alter — Frieren 1/7 Scale (Beyond Journey's End)</h2><p>Alter's 2025 announcement caused the internet to collectively lose its mind. Pre-orders sold out in under two hours, and secondary listings are already appearing at 2× retail.</p><h2>5. Max Factory — Saber Alter Wedding Dress (Fate/Stay Night)</h2><p>A Wonder Festival exclusive from 2017, this 1/7-scale figure features hand-applied gold leaf details on the gown trim and is considered one of the finest Fate figures ever produced.</p><h2>6–10: The Rest of Our List</h2><p>Spots 6 through 10 include the Neon Genesis Evangelion Production Models by Gainax (hand-autographed by Anno), a sealed 1st-edition Pokémon Charizard PSA-10, the Spirited Away No-Face resin limited run, and more. <a href="/products">Browse our current listings</a> — some of these have just appeared on LetItRip.</p>`,
    coverImage: "https://picsum.photos/seed/anime-figures-top10/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: [
      "figures",
      "rare",
      "collectibles",
      "gunpla",
      "nendoroid",
      "scale-figures",
    ],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(58),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 8,
    views: 4723,
    metaTitle: "Top 10 Rarest Anime Figures to Buy in 2026 | LetItRip",
    metaDescription:
      "Discover the 10 rarest anime figures still available on the secondary market in 2026 — with prices, rarity scores, and buying tips.",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(58),
  },

  {
    id: "blog-how-to-start-your-gunpla-journey-tips",
    title: "How to Start Your Gunpla Journey: A Complete Beginner's Guide",
    slug: "how-to-start-gunpla-journey-beginners-guide",
    excerpt:
      "Overwhelmed by High Grade, Master Grade, and Perfect Grade? This guide walks you through every Gunpla grade, the tools you need, and how to pick your first kit without regret.",
    content: `<h2>What Is Gunpla?</h2><p>Gunpla (Gundam Plastic Models) are injection-moulded model kits produced by Bandai since 1980. They require no glue, snap together perfectly, and come in grades ranging from beginner-friendly to achingly complex.</p><h2>Understanding the Grades</h2><ul><li><strong>SD (Super Deformed)</strong> — Chibi-proportioned, ~50 pieces, great for kids and first-timers.</li><li><strong>HG (High Grade, 1/144)</strong> — The sweet spot for beginners. Affordable (₹800–₹2,500), articulated, and plentiful.</li><li><strong>RG (Real Grade, 1/144)</strong> — Advanced inner-frame detail in a small footprint. Not for absolute beginners.</li><li><strong>MG (Master Grade, 1/100)</strong> — Rich inner skeleton, panel lines, and accessories. 3–6 hours build time.</li><li><strong>PG (Perfect Grade, 1/60)</strong> — The mountain to climb. LED-lit options, 400+ pieces, 15–30 hours. Our Gundam Wing Zero Custom is an example.</li></ul><h2>Essential First-Time Tools</h2><p>You only need three things to start: a pair of Tamiya side-cutters (₹600), a hobby knife (₹300), and a grey panel-lining pen (₹350). Everything else is optional.</p><h2>Your First Kit Recommendation</h2><p>Start with an HG RX-78-2 or an HG Zaku II — both are ~₹900, have clean designs, and teach you the fundamentals without frustration.</p><h2>Where to Buy</h2><p>LetItRip lists both new and second-hand Gunpla, including rare PG builds like our <a href="/products">Wing Zero Custom</a>. Pre-orders are available for upcoming Bandai releases.</p>`,
    coverImage: "https://picsum.photos/seed/gunpla-beginner-guide/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.TIPS,
    tags: ["gunpla", "beginners", "model-kits", "bandai", "how-to", "guide"],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(50),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 10,
    views: 6891,
    metaTitle: "Complete Beginner's Guide to Gunpla 2026 | LetItRip",
    metaDescription:
      "New to Gunpla? Learn every grade from SD to Perfect Grade, the tools you need, and which kit to buy first.",
    createdAt: daysAgo(52),
    updatedAt: daysAgo(50),
  },

  {
    id: "blog-letitrip-launches-auction-feature-news",
    title: "LetItRip Launches Live Auction Feature for Rare Anime Collectibles",
    slug: "letitrip-launches-live-auction-feature-anime-collectibles",
    excerpt:
      "Today we're thrilled to announce our live auction platform — the best way to score rare figures, TCG cards, and production art at prices set by the community.",
    content: `<h2>Introducing Live Auctions</h2><p>LetItRip's auction feature lets verified sellers list rare anime collectibles — from out-of-print Nendoroids to original Studio Ghibli production cels — and buyers bid in real time. Every listing is authenticated by our team before going live.</p><h2>How It Works</h2><ol><li>Browse open auctions on the <a href="/auctions">Auctions page</a>.</li><li>Place a bid — you'll be instantly notified by push notification if outbid.</li><li>Win the auction and check out securely within 24 hours.</li><li>Receive a Certificate of Authenticity with every winning lot.</li></ol><h2>What Can Be Auctioned?</h2><p>Scale figures, Nendoroids, Funko Pop vaulted editions, Pokemon TCG graded cards, original anime production art, autographed merchandise, limited-run apparel, and complete manga sets.</p><h2>Seller Benefits</h2><p>Sellers get competitive, market-driven prices without constantly dropping their asking price. Payouts are processed within 3–5 business days after buyer confirmation. Our Auction Escrow service protects both parties throughout.</p>`,
    coverImage: "https://picsum.photos/seed/auction-launch-anime/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.NEWS,
    tags: ["auctions", "platform", "feature", "launch", "news", "collectibles"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(43),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 4,
    views: 3210,
    metaTitle: "LetItRip Launches Anime Collectible Auction Platform | News",
    metaDescription:
      "LetItRip announces its live auction feature for rare anime figures, TCG cards, and production art. Bid, win, and collect.",
    createdAt: daysAgo(44),
    updatedAt: daysAgo(43),
  },

  {
    id: "blog-buyer-seller-protection-policy-updates-updates",
    title: "Updated Buyer & Seller Protection Policies for Anime Merchandise",
    slug: "updated-buyer-seller-protection-policies-anime-2026",
    excerpt:
      "We've strengthened our protection policies for collectible merchandise — here's a clear breakdown of what changed for figures, TCG cards, artbooks, and cosplay.",
    content: `<h2>Key Changes Effective 1 February 2026</h2><p><strong>Buyers:</strong> The return window for sealed collectibles is extended from 7 to 14 days. For opened figures, the window remains 7 days — but now includes a condition-based partial refund option if items arrive damaged.</p><p><strong>Authentication Guarantee:</strong> All auction lots now ship with a QR-coded Certificate of Authenticity, verified against our seller registry. If an item is found to be inauthentic, you receive a full refund plus ₹500 store credit.</p><p><strong>Sellers:</strong> We've introduced a dispute resolution SLA; all buyer claims are reviewed within 48 hours. Sellers maintaining a dispute rate below 0.5% automatically earn a 'Verified Otaku Seller' badge.</p><h2>Graded Card Policy</h2><p>PSA/BGS-graded cards must ship in rigid mailers inside bubble wrap. Any damage in transit is covered by our ₹5,000 Shipping Protection policy at no extra cost.</p><h2>Why We Made These Changes</h2><p>Over 2,400 survey responses from our anime collector community guided these updates. Faster refunds and clearer authentication processes topped the wishlist — and we delivered.</p>`,
    coverImage: "https://picsum.photos/seed/policy-update-anime/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.UPDATES,
    tags: ["policy", "protection", "returns", "authentication", "collectibles"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(36),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 5,
    views: 1845,
    metaTitle: "Updated Collectibles Protection Policies Feb 2026 | LetItRip",
    metaDescription:
      "LetItRip updates buyer and seller protection policies for anime merchandise — authentication guarantees, extended returns, and a Verified Otaku Seller programme.",
    createdAt: daysAgo(38),
    updatedAt: daysAgo(36),
  },

  {
    id: "blog-figure-photography-tips-collection-tips",
    title: "Photography Tips for Showcasing Your Figure Collection Online",
    slug: "photography-tips-anime-figure-collection",
    excerpt:
      "Great photos move listings faster and command higher bids. Learn how to use natural light, dioramas, and your phone camera to make your figures look gallery-worthy.",
    content: `<h2>Tip 1 — Use a Lightbox or North-Facing Window</h2><p>Hard shadows kill figure photos. A ₹500 collapsible lightbox from Amazon, or a north-facing window at midday, gives you the soft, even light that makes paint apps and sculpt details pop without blown-out highlights.</p><h2>Tip 2 — Match the Base to the Series</h2><p>Place a Dragon Ball figure on a rocky terrain texture sheet, or put a Ghibli figure on green moss. Context shots like these dramatically increase click-through rates on listings.</p><h2>Tip 3 — Shoot at Eye Level or Below</h2><p>Shooting at the figure's eye level (or up at it slightly) creates a heroic, dimensional look. Shooting down makes figures look like cheap toys — avoid it.</p><h2>Tip 4 — Document Every Flaw Clearly</h2><p>Pre-owned collectibles must have honest photos of every scuff, paint chip, and joint wear. Buyers who receive items matching the photos leave 5-star reviews. Surprises create disputes.</p><h2>Tip 5 — Include Scale Reference</h2><p>Place a coin, a ruler, or a known-size item beside the figure. Buyers need to understand size relative to their display shelf before committing to a ₹15,000 bid.</p><h2>Tip 6 — Edit Minimally</h2><p>Adjust brightness and contrast only — never change colours. The buyer should receive exactly what they see in your listing photos.</p>`,
    coverImage: "https://picsum.photos/seed/figure-photography-tips/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.TIPS,
    tags: ["seller", "photography", "figures", "listing", "tips", "display"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(32),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 6,
    views: 2234,
    metaTitle: "Figure Photography Tips for Anime Sellers | LetItRip",
    metaDescription:
      "6 actionable tips for photographing anime figures and collectibles to create listings that sell faster and attract higher bids.",
    createdAt: daysAgo(34),
    updatedAt: daysAgo(32),
  },

  {
    id: "blog-community-spotlight-jan-2026-community",
    title: "Community Spotlight: January 2026 Top Collectors & Bidders",
    slug: "community-spotlight-january-2026-collectors",
    excerpt:
      "Meet the outstanding community members who made January 2026 a record month — from our top-rated sellers to the most passionate collectors and highest bidders.",
    content: `<h2>Top Sellers of January</h2><p><strong>FigureVault JP</strong> — 47 orders fulfilled at a 4.9-star average. Their Dragon Ball and Evangelion auction listings consistently sell above estimate, thanks to meticulous authentication and same-day shipping.</p><p><strong>AnimeCraft Apparel</strong> — Specialising in licensed cosplay, they earned the 'Verified Otaku Seller' badge in January with a zero-dispute month. Their Charizard PSA-9 lot received 28 bids before close.</p><p><strong>OtakuShelf Co</strong> — January's hidden gem. Their Spirited Away production cel auction attracted 19 unique bidders and set a new platform record for production art.</p><h2>Top Bidders</h2><p><strong>Raj Patel</strong> — 6 winning bids in January alone. Raj is building an extraordinary Gundam collection and his attention to build quality details in bid notes helps sellers trust him.</p><p><strong>Vikram Nair</strong> — Won the Charizard 1st-Edition PSA-9 lot in our inaugural TCG auction. His detailed review of the item helped 31 community members understand graded card authentication.</p><h2>Growing Community</h2><p>412 new collectors joined LetItRip in January — a 34% month-on-month increase. The anime collectibles niche is the fastest-growing category on the platform. Welcome to every new member!</p>`,
    coverImage:
      "https://picsum.photos/seed/community-spotlight-jan2026/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.COMMUNITY,
    tags: ["community", "spotlight", "collectors", "bidders", "january-2026"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(27),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 5,
    views: 987,
    metaTitle: "Community Spotlight January 2026 — Top Collectors | LetItRip",
    metaDescription:
      "Celebrating LetItRip's top sellers, bidders, and collectors from January 2026 and welcoming hundreds of new anime enthusiasts to the platform.",
    createdAt: daysAgo(29),
    updatedAt: daysAgo(27),
  },

  // -- Published — March Auction Spotlight ------------------------------
  {
    id: "blog-march-2026-auction-spotlight-news",
    title: "March Auction Spotlight: Rare Figures, TCG Cards & Production Art",
    slug: "march-2026-auction-spotlight-anime-collectibles",
    excerpt:
      "From a PSA-9 Charizard to a Good Smile Company Rem Wedding figure — March 2026 brings our biggest and most diverse anime auction lineup yet. Everything live right now.",
    content: `<h2>Why March 2026 Is Special</h2><p>March marks the most diverse auction month in LetItRip's history. We have 10 active auctions spanning scale figures, Gunpla, TCG, and original production art — with competitive opening bids and items that simply can't be found at retail.</p><h2>Scale Figures — One for Every Fan</h2><p><strong>Chainsaw Man Makima 1/7 — Kotobukiya ARTFX J</strong> — 3 active bids, closing March 10. This soldout figure retails for ₹18,000 online when you can find one.</p><p><strong>Jujutsu Kaisen Sukuna 1/6 — MegaHouse</strong> — closing March 12 with competitive bidding from Gunpla collectors eyeing their shelf space wisely.</p><p><strong>Fate/Stay Night Saber Alter Wedding 1/7</strong> — closing March 13. A Wonder Festival exclusive rarely seen outside Japan dealers.</p><p><strong>Re:Zero Rem Wedding 1/7 — Good Smile Company</strong> — closing March 15. GSC's best Rem figure, bar none.</p><h2>TCG & Trading Cards</h2><p><strong>Pokémon 1st Edition Base Set Charizard Holo — PSA 9</strong> — closing March 14. Already 2 active bids above ₹30,000. This is the holy grail of Pokémon TCG.</p><h2>Production Art & Artbooks</h2><p><strong>Spirited Away 2001 Original Production Cel</strong> — a Studio Ghibli hand-inked cel from the film's production, with gallery COA. Closing March 14.</p><p><strong>One Piece 25th Anniversary Artbook — Signed by Eiichiro Oda</strong> — 2 bids already, closing March 16. Authenticated by publisher Shueisha.</p><h2>Gunpla Corner</h2><p><strong>PG Wing Zero Custom — Full Build & Paint</strong> — FigureVault JP's custom-built Perfect Grade kit, closing March 15. A gallery-quality display piece.</p><h2>How to Bid</h2><p>Visit the <a href="/auctions">Auctions page</a>, sign in, and place your bid. You'll be notified instantly by app push notification if you're outbid.</p>`,
    coverImage: "https://picsum.photos/seed/march2026-auction-anime/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.NEWS,
    tags: [
      "auctions",
      "march-2026",
      "figures",
      "tcg",
      "production-art",
      "spotlight",
    ],
    isFeatured: true,
    status: BLOG_POST_FIELDS.STATUS_VALUES.PUBLISHED,
    publishedAt: daysAgo(8),
    authorId: "user-moderator-mod-user",
    authorName: "Riya Sharma",
    readTimeMinutes: 5,
    views: 2104,
    metaTitle:
      "March 2026 Auction Spotlight — Anime Figures & TCG Live Now | LetItRip",
    metaDescription:
      "Explore LetItRip's biggest anime auction month: rare figures, PSA-graded Pokémon cards, Ghibli production art, and more. Bid now.",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(8),
  },

  // -- Draft -------------------------------------------------------------
  {
    id: "blog-guide-authenticating-anime-merchandise-draft",
    title: "The Complete Guide to Authenticating Anime Merchandise",
    slug: "complete-guide-authenticating-anime-merchandise-2026",
    excerpt:
      "With bootleg figures and fake TCG cards flooding the secondary market, authentication is a must-have skill for any serious collector. This guide covers how to spot fakes for figures, Nendoroids, Gunpla, and graded cards.",
    content: `<h2>Why Authentication Matters</h2><p>The anime collectibles market loses an estimated ₹20 crore annually to counterfeit goods. Bootleg figures look convincing at thumbnail resolution — this guide gives you the tools to tell the difference before bidding.</p><h2>Scale Figures: What to Check</h2><ul><li><strong>Box Print Quality:</strong> Official releases have crisp, high-contrast printing. Bootlegs show banding, colour shift, and blurred kanji.</li><li><strong>Seam Lines:</strong> Authentic figures have nearly invisible seam lines. Bootlegs show gaps and misalignment of 1–3 mm.</li><li><strong>Paint Applications:</strong> Check the eyes under a macro lens — official eye decals are perfectly centered; bootlegs are usually off by 0.5–1 mm on at least one axis.</li><li><strong>Weight:</strong> Authentic figures use denser PVC. Bootlegs are noticeably lighter and feel hollow.</li></ul><h2>Nendoroid Specifics</h2><p>[Draft — Nendoroid section in progress]</p><h2>Graded TCG Cards</h2><p>PSA and BGS holders can be verified at psacard.com using the certification number on the label. Any holder not verifiable online is counterfeit.</p><h2>Gunpla: Official vs. Knockoff</h2><p>[Draft — Gunpla section in progress]</p>`,
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.GUIDES,
    tags: [
      "authentication",
      "figures",
      "tcg",
      "gunpla",
      "guide",
      "anti-counterfeit",
    ],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.DRAFT,
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 12,
    views: 0,
    createdAt: daysAgo(17),
    updatedAt: daysAgo(17),
  },

  // -- Archived ---------------------------------------------------------
  {
    id: "blog-anicon-2025-haul-recap-community-archived",
    title: "AniCon 2025 Haul Recap — Community Picks of the Year",
    slug: "anicon-2025-haul-recap-community",
    excerpt:
      "December's AniCon online event was our biggest ever — here's a look at the top picks, best-value lots, and the items the community loved most.",
    content: `<p>This post has been archived. For current deals and updates, visit our <a href="/blog">blog</a>.</p>`,
    coverImage: "https://picsum.photos/seed/anicon2025-recap/1200/630",
    category: BLOG_POST_FIELDS.CATEGORY_VALUES.COMMUNITY,
    tags: ["anicon", "december", "2025", "recap", "haul"],
    isFeatured: false,
    status: BLOG_POST_FIELDS.STATUS_VALUES.ARCHIVED,
    publishedAt: daysAgo(71),
    authorId: "user-admin-user-admin",
    authorName: "Admin User",
    readTimeMinutes: 3,
    views: 5602,
    createdAt: daysAgo(72),
    updatedAt: daysAgo(53),
  },
];
