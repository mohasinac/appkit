/**
 * Reviews Seed Data — LetiTrip Collectibles Platform
 * 15 reviews distributed across the 5 stores from P15.
 * Uses buyer IDs from P15 and product IDs from P16/P17/P18.
 * review- prefix, system-generated IDs (not slug-based per slug prefix table).
 */

import type { ReviewDocument } from "../features/reviews/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const reviewsSeedData: Partial<ReviewDocument>[] = [
  // ── store-pokemon-palace (4 reviews) ─────────────────────────────────────

  {
    id: "review-pokemon-151-box-rahul-001",
    productId: "product-pokemon-151-booster-box",
    productTitle: "Pokémon 151 Booster Box (Sealed)",
    sellerId: "user-aryan-kapoor",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    rating: 5,
    title: "Absolutely pristine sealed box — perfect packaging",
    comment:
      "Aryan packed this box like it was going to the moon. Double-boxed, foam corners, bubble wrap around the individual booster packs inside. The Pokémon 151 box arrived 100% sealed with no dents. Pulled a Mew ex SAR on my first pack — couldn't be happier. Will buy every new set from Pokémon Palace.",
    status: "approved",
    helpfulCount: 14,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(55),
    updatedAt: daysAgo(54),
    approvedAt: daysAgo(54),
  },

  {
    id: "review-base-set-sealed-arjun-002",
    productId: "product-pokemon-base-set-booster-sealed",
    productTitle: "Pokémon Base Set Shadowless Booster Box (Sealed)",
    sellerId: "user-aryan-kapoor",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    rating: 5,
    title: "Genuine shadowless box, exactly as described",
    comment:
      "This was a huge purchase for me — ₹89,999 is not nothing. I did video unboxing of the packaging for insurance purposes. The box is clearly genuine shadowless era (1999 print run visible on bottom), factory seal intact, no re-wrapping. Aryan provided provenance documentation (original purchase receipt from a US collector) without me even asking. Impeccable seller.",
    status: "approved",
    helpfulCount: 32,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(42),
    updatedAt: daysAgo(41),
    approvedAt: daysAgo(41),
  },

  {
    id: "review-pokemon-etb-priya-003",
    productId: "product-pokemon-sv-etb",
    productTitle: "Pokémon Scarlet & Violet Paldean Fates Elite Trainer Box",
    sellerId: "user-aryan-kapoor",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    rating: 4,
    title: "Great ETB, arrived safely — shipping was a bit slow",
    comment:
      "The ETB was in perfect condition and sealed correctly. I pulled a Shiny Charizard ex which made my week! Shipping took 6 days which is on the longer end, but the packaging was excellent — my only minor complaint. Pokémon Palace is definitely a go-to store.",
    status: "approved",
    helpfulCount: 8,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(27),
    approvedAt: daysAgo(27),
  },

  {
    id: "review-pikachu-plush-meera-004",
    productId: "product-pokemon-pikachu-plush-8",
    productTitle: "Pokémon Pikachu 8-inch Sitting Plush (Official Pokémon Center)",
    sellerId: "user-aryan-kapoor",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    rating: 5,
    title: "Adorable and authentic — tags intact, came with certificate",
    comment:
      "Bought this as a birthday gift for my niece. The plush has the Pokémon Center tag and feels premium — not the cheap knock-offs you see online. Aryan included a small thank-you note which was a lovely touch. Niece went crazy for it. Ordering the Gengar plush next.",
    status: "approved",
    helpfulCount: 5,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(17),
    approvedAt: daysAgo(17),
  },

  // ── store-cardgame-hub (3 reviews) ────────────────────────────────────────

  {
    id: "review-yugioh-25th-tin-rahul-005",
    productId: "product-yugioh-25th-tin",
    productTitle: "Yu-Gi-Oh! 25th Anniversary Tin: Dueling Heroes",
    sellerId: "user-nisha-reddy",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    rating: 5,
    title: "Nisha is the best YGO seller in India, period",
    comment:
      "I've ordered from three different YGO sellers on LetiTrip and CardGame Hub is on another level. The 25th Anniversary Tin arrived with each mega pack in its own sleeve inside the tin. Nisha also included a handwritten note about recommended first packs to open — genuine community knowledge. Will only order YGO from here going forward.",
    status: "approved",
    helpfulCount: 22,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(38),
    updatedAt: daysAgo(37),
    approvedAt: daysAgo(37),
  },

  {
    id: "review-yugioh-albaz-arjun-006",
    productId: "product-yugioh-structure-albaz",
    productTitle: "Yu-Gi-Oh! Structure Deck: Albaz Strike",
    sellerId: "user-nisha-reddy",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    rating: 4,
    title: "Solid structure deck, good beginner product",
    comment:
      "Bought 3 copies to complete a playset as Nisha recommended. Cards came in the original sealed structure deck packaging with no damage. Shipping was 4 days which is perfectly fine for a standard order. Would rate 5 stars if shipping was 2 days but that's a minor point.",
    status: "approved",
    helpfulCount: 6,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(22),
    updatedAt: daysAgo(21),
    approvedAt: daysAgo(21),
  },

  {
    id: "review-charizard-auction-priya-007",
    productId: "auction-pokemon-charizard-base1-psa9",
    productTitle: "Pokémon 1st Edition Charizard PSA 9 (AUCTION)",
    sellerId: "user-nisha-reddy",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    rating: 3,
    title: "Card is beautiful but auction process was stressful",
    comment:
      "The card itself is perfect — genuine PSA 9, certificate verified on PSA website. Shipping was excellent (insured, signature required). My 3-star is about the bidding experience: I was outbid in the last 60 seconds three times before winning, which was nerve-wracking. That's a platform issue, not the seller's fault. Card arrived safely and I'm thrilled to own it.",
    status: "approved",
    helpfulCount: 4,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(11),
    approvedAt: daysAgo(11),
  },

  // ── store-diecast-depot (3 reviews) ───────────────────────────────────────

  {
    id: "review-redline-camaro-meera-008",
    productId: "product-hot-wheels-redline-1969-camaro",
    productTitle: "Hot Wheels Redline 1969 Camaro SS — Custom Paint (Bluebird)",
    sellerId: "user-vikram-mehta",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    rating: 5,
    title: "A true Redline beauty — mint condition, authentic",
    comment:
      "This was my first vintage Hot Wheels purchase and Vikram made it a great experience. The Redline arrived in a proper acrylic display case (not just a ziplock — a real display case!) with a card describing the car's production year and rarity. Vikram's description was honest — the car has minor paint wear on the roof which he mentioned in the listing. Very happy.",
    status: "approved",
    helpfulCount: 11,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(48),
    updatedAt: daysAgo(47),
    approvedAt: daysAgo(47),
  },

  {
    id: "review-tomica-datsun-rahul-009",
    productId: "product-tomica-limited-datsun",
    productTitle: "Tomica Limited Vintage Datsun Bluebird 1600SSS (1969)",
    sellerId: "user-vikram-mehta",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    rating: 5,
    title: "TLV quality is unreal — every detail perfect",
    comment:
      "I've been collecting Hot Wheels for years but Tomica Limited Vintage is something else entirely. The Datsun Bluebird has rubber tyres, a working bonnet, and tampo print so fine I need a magnifying glass to appreciate it. Vikram sourced this from his Japan trip — you can tell it's fresh stock. Arrived in the original TLV outer box in immaculate condition.",
    status: "approved",
    helpfulCount: 19,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(34),
    approvedAt: daysAgo(34),
  },

  {
    id: "review-hw-rlc-boneshaker-arjun-010",
    productId: "product-hot-wheels-rlc-bone-shaker",
    productTitle: "Hot Wheels RLC Bone Shaker Special Edition",
    sellerId: "user-vikram-mehta",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    rating: 4,
    title: "Rare RLC exclusive, good price, slightly late dispatch",
    comment:
      "The RLC Bone Shaker is exactly as described — sealed in the original RLC mailer with the membership card insert. My only feedback: dispatch was on day 3 (not day 2 as listed in store policy). Vikram apologised proactively and offered a discount on my next order, which I appreciate. Car itself is perfect.",
    status: "approved",
    helpfulCount: 7,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(19),
    approvedAt: daysAgo(19),
  },

  // ── store-beyblade-arena (3 reviews) ─────────────────────────────────────

  {
    id: "review-bx01-dran-sword-priya-011",
    productId: "product-beyblade-x-bx01-dran-sword",
    productTitle: "Beyblade X BX-01 Dran Sword 4-60F Starter Set",
    sellerId: "user-rohit-joshi",
    userId: "user-priya-patel",
    userName: "Priya Patel",
    rating: 5,
    title: "My son's first BX top — perfect gift, fast delivery",
    comment:
      "Ordered for my 8-year-old who is obsessed with Beyblade X. Rohit shipped the same day I placed the order (I ordered at 10am, it was dispatched by 4pm). Arrived in 3 days. The BX-01 starter set comes with the top, rip cord launcher, and a stadium guide — everything a beginner needs. My son has launched it 200 times and it's still perfect.",
    status: "approved",
    helpfulCount: 28,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(50),
    updatedAt: daysAgo(49),
    approvedAt: daysAgo(49),
  },

  {
    id: "review-b200-valkyrie-meera-012",
    productId: "product-beyblade-burst-b200-valkyrie",
    productTitle: "Beyblade Burst B-200 Brave Valkyrie Evolution",
    sellerId: "user-rohit-joshi",
    userId: "user-meera-nair",
    userName: "Meera Nair",
    rating: 5,
    title: "Authentic Takara Tomy import, not the bootleg version",
    comment:
      "There are SO many bootleg Beyblades on other platforms. Rohit sells only genuine Takara Tomy product — you can tell by the QR code on the Beyblade passport card (scans correctly on the Beyblade app). Brave Valkyrie arrived fresh from its Japan import, unopened. The weight difference from bootlegs is immediately obvious.",
    status: "approved",
    helpfulCount: 15,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(32),
    updatedAt: daysAgo(31),
    approvedAt: daysAgo(31),
  },

  {
    id: "review-preorder-beyblade-bx10-rahul-013",
    productId: "preorder-beyblade-x-bx10-booster",
    productTitle: "Beyblade X BX-10 Booster Set Pre-Order",
    sellerId: "user-rohit-joshi",
    userId: "user-rahul-sharma",
    userName: "Rahul Sharma",
    rating: 4,
    title: "Pre-order arrived on time — worth the wait",
    comment:
      "Rohit's pre-order process was smooth. I paid the 30% deposit, received confirmation, and the balance was charged exactly when he said it would be (2 days before dispatch). Item arrived 42 days after ordering — right in the promised window. No complaints. Will pre-order the BX-12 when Rohit lists it.",
    status: "approved",
    helpfulCount: 9,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(9),
    approvedAt: daysAgo(9),
  },

  // ── store-letitrip-official (2 reviews) ───────────────────────────────────

  {
    id: "review-shf-goku-arjun-014",
    productId: "product-shf-goku-ultra-instinct",
    productTitle: "S.H.Figuarts Goku Ultra Instinct -Sign- (Dragon Ball Super)",
    sellerId: "user-admin-letitrip",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    rating: 5,
    title: "Official LetItRip store delivers — SHF in perfect condition",
    comment:
      "This is my 4th S.H.Figuarts from LetItRip Official and they're consistently excellent. The Goku UI comes with 5 face plates, effect parts, and all the swap hands. Every accessory was accounted for (I always check). LetItRip Official is the most reliable store on the platform — their QC before dispatch is clearly thorough.",
    status: "approved",
    helpfulCount: 17,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(26),
    updatedAt: daysAgo(25),
    approvedAt: daysAgo(25),
  },

  {
    id: "review-gundam-rx78-mg-arjun-015",
    productId: "product-gundam-rx78-mg",
    productTitle: "MG 1/100 RX-78-2 Gundam Ver. 3.0",
    sellerId: "user-admin-letitrip",
    userId: "user-arjun-singh",
    userName: "Arjun Singh",
    rating: 2,
    title: "Kit was missing the beam rifle assembly — resolved via support",
    comment:
      "The box arrived safely but when I inventoried the sprues, the G runner (beam rifle parts) was missing — looks like a factory packing error. I opened a dispute on LetiTrip and LetItRip Official resolved it within 48 hours by shipping the missing runner separately at no cost. They clearly take after-sales seriously. Updating from 1 star to 2 stars because the issue was resolved, but losing a star for the missing part.",
    status: "approved",
    helpfulCount: 6,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(12),
    approvedAt: daysAgo(12),
  },
];
