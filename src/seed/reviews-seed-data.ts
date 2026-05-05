/**
 * Reviews Seed Data — Pokémon Base Set 151 Theme
 *
 * 22 reviews written by Pokémon trainers (buyers) for Base Set TCG singles,
 * sealed products, and accessories sold by Misty, Lt. Surge, and Blaine.
 *
 * Seller IDs:
 *   Misty  → user-misty-water-gym-misty   / store-mistys-water-cards
 *   Surge  → user-lt-surge-electric-surge / store-surges-electric-emporium
 *   Blaine → user-blaine-fire-gym-blaine  / store-blaines-fire-shoppe
 *
 * Buyer IDs:
 *   ash      → user-ash-ketchum-pallet-ash
 *   gary     → user-gary-oak-pallet-gary
 *   brock    → user-brock-pewter-brock
 *   oak      → user-prof-oak-pallet-oak
 *   sabrina  → user-sabrina-saffron-sabrina
 *   erika    → user-erika-celadon-erika
 */

import type { ReviewDocument } from "../features/reviews/schemas";

const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

// Card image helper (mirrors pokemon-products-seed-data.ts)
const cardImg = (num: number) =>
  `https://images.pokemontcg.io/base1/${num}_hires.png`;

export const reviewsSeedData: Partial<ReviewDocument>[] = [
  // ══════════════════════════════════════════════════════════════
  // APPROVED — FEATURED (highest helpfulCount)
  // ══════════════════════════════════════════════════════════════

  // 1. Ash reviews the 1st-Ed Charizard auction win
  {
    id: "review-charizard-base1-4-ash-20260310",
    productId: "product-charizard-base1-4-holo-rare-fire-blaine-1",
    productTitle: "Charizard — Base Set #4 Holo Rare (Near Mint)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-ash-ketchum-buyer",
    userName: "Ash Ketchum",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    rating: 5,
    title: "The crown jewel of my collection — absolutely perfect!",
    comment:
      "I've been searching for a Near Mint Charizard for years and Blaine's Fire Shoppe delivered beyond my expectations. " +
      "The card arrived in a rigid top-loader inside a bubble mailer with tracking — zero movement during transit. " +
      "Centering is near-perfect, holo surface is pristine with that iconic shimmer, and corners are sharp. " +
      "Blaine even included a thank-you note handwritten on a Pokémon postcard. " +
      "This is THE card that started it all and I finally have one worthy of my collection. Five stars without hesitation!",
    images: [cardImg(4)],
    status: "approved",
    helpfulCount: 87,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(52),
    updatedAt: daysAgo(52),
    approvedAt: daysAgo(52),
  },

  // 2. Professor Oak reviews Mewtwo Holo — surge
  {
    id: "review-mewtwo-base1-10-oak-20260312",
    productId: "product-mewtwo-base1-10-holo-rare-psychic-surge-1",
    productTitle: "Mewtwo — Base Set #10 Holo Rare (Near Mint)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png",
    rating: 5,
    title: "Scientifically the finest Mewtwo specimen I've catalogued",
    comment:
      "As a Pokémon researcher I have handled hundreds of Base Set cards. This Mewtwo Holo Rare from Surge's Emporium is " +
      "among the cleanest copies I have ever examined. Holo pattern is full and rich with no scratches, corners are NM+, " +
      "and the card was shipped in a penny sleeve, top-loader, and team bag — triple protection. " +
      "Surge responded to my pre-purchase grading questions within the hour. " +
      "For Psychic-type collectors: this is the one to own. The Genetic Pokémon belongs in every serious Pokédex binder.",
    images: [cardImg(10)],
    status: "approved",
    helpfulCount: 63,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(48),
    updatedAt: daysAgo(48),
    approvedAt: daysAgo(48),
  },

  // 3. Gary Oak reviews Blastoise
  {
    id: "review-blastoise-base1-2-gary-20260315",
    productId: "product-blastoise-base1-2-holo-rare-water-misty-1",
    productTitle: "Blastoise — Base Set #2 Holo Rare (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-gary-oak-buyer",
    userName: "Gary Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png",
    rating: 5,
    title: "Misty knows her Water cards — flawless Blastoise",
    comment:
      "Look, I don't give five stars easily, but Misty's Water Cards has earned it. " +
      "The Blastoise is everything described — near-mint centering, brilliant holo shimmer, and not a single whitened corner. " +
      "It shipped tracked in 24 hours and arrived two days later perfectly protected. " +
      "My collection is already better than Ash's and this card proves it. " +
      "Ordering the Gyarados next.",
    images: [cardImg(2)],
    status: "approved",
    helpfulCount: 54,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(44),
    updatedAt: daysAgo(44),
    approvedAt: daysAgo(44),
  },

  // 4. Sabrina reviews the sealed booster pack (Blaine)
  {
    id: "review-sealed-booster-sabrina-20260318",
    productId: "product-base-set-booster-pack-sealed-blaine-1",
    productTitle: "Pokémon Base Set Booster Pack (Sealed, Random Art)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png",
    rating: 5,
    title: "Authentic vintage sealed pack — psychically verified genuine!",
    comment:
      "I can sense deception in sellers a mile away, and Blaine's aura is completely honest. " +
      "The sealed booster pack arrived in immaculate condition — factory seal intact, pack fresh and firm, " +
      "no signs of weighing or tampering. Blaine wrapped it in bubble wrap inside a rigid card box — " +
      "the pack couldn't shift even a millimetre. " +
      "I'm keeping it sealed as a long-term investment. Vintage sealed WOTC product at this quality is increasingly rare. " +
      "Highly recommend for serious collectors. Will be ordering more.",
    images: [],
    status: "approved",
    helpfulCount: 41,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(40),
    approvedAt: daysAgo(40),
  },

  // 5. Ash reviews Pikachu common (Surge)
  {
    id: "review-pikachu-base1-58-ash-20260320",
    productId: "product-pikachu-base1-58-common-electric-surge-1",
    productTitle: "Pikachu — Base Set #58 Common (Near Mint)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-ash-ketchum-buyer",
    userName: "Ash Ketchum",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    rating: 5,
    title: "My best friend in card form — yellow cheeks and all!",
    comment:
      "Obviously I had to own the Base Set Pikachu. The yellow-cheeks variant is the correct one — " +
      "Surge knows this and stocks only the best copy available. " +
      "Near Mint condition, sharp corners, vivid yellow, and that iconic expression. " +
      "Shipped in a penny sleeve inside a top-loader. Fast delivery. " +
      "Pikachu, I choose you — and I choose Surge's Electric Emporium!",
    images: [cardImg(58)],
    video: {
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnailUrl: cardImg(58),
      duration: 18,
    },
    status: "approved",
    helpfulCount: 38,
    reportCount: 0,
    verified: true,
    featured: true,
    createdAt: daysAgo(37),
    updatedAt: daysAgo(37),
    approvedAt: daysAgo(37),
  },

  // ══════════════════════════════════════════════════════════════
  // APPROVED — NON-FEATURED
  // ══════════════════════════════════════════════════════════════

  // 6. Brock reviews Zapdos (Surge)
  {
    id: "review-zapdos-base1-16-brock-20260322",
    productId: "product-zapdos-base1-16-holo-rare-electric-surge-1",
    productTitle: "Zapdos — Base Set #16 Holo Rare (Near Mint)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-brock-pewter-buyer",
    userName: "Brock",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png",
    rating: 4,
    title: "Rock-solid purchase — legendary bird delivered safely",
    comment:
      "I'm a Rock-type guy at heart but every collector needs the legendary birds. " +
      "Zapdos arrived in excellent NM condition — great centering, clean holo, minimal border wear. " +
      "Surge shipped quickly with tracking. The only reason for 4 stars is I'd have liked a slightly heavier " +
      "top-loader for a card at this price point, but honestly it arrived perfectly fine. " +
      "Would buy from Surge's Emporium again — competitive prices and honest descriptions.",
    images: [],
    status: "approved",
    helpfulCount: 22,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(35),
    approvedAt: daysAgo(35),
  },

  // 7. Erika reviews Venusaur (Blaine — LP)
  {
    id: "review-venusaur-base1-15-erika-20260324",
    productId: "product-venusaur-base1-15-holo-rare-grass-blaine-1",
    productTitle: "Venusaur — Base Set #15 Holo Rare (Lightly Played)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-erika-celadon-erika",
    userName: "Erika",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/45.png",
    rating: 4,
    title: "Grass-type glory — condition exactly as described",
    comment:
      "As a Grass-type Gym Leader, a Venusaur Holo is essential for my collection. " +
      "The card is Lightly Played as listed — minor corner wear, but the holo face is absolutely gorgeous with no scratches. " +
      "Blaine's description was accurate and honest, which I appreciate deeply. " +
      "Shipped well protected. A lovely card at a fair price for LP condition. " +
      "I'd give five stars if this were NM, but the LP grade is reflected in the price and the condition matches perfectly.",
    images: [cardImg(15)],
    status: "approved",
    helpfulCount: 19,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(32),
    updatedAt: daysAgo(32),
    approvedAt: daysAgo(32),
  },

  // 8. Gary reviews Professor Oak Trainer (Surge)
  {
    id: "review-professor-oak-trainer-gary-20260325",
    productId: "product-professor-oak-base1-88-uncommon-trainer-surge-1",
    productTitle: "Professor Oak — Base Set #88 Trainer (Near Mint)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-gary-oak-buyer",
    userName: "Gary Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png",
    rating: 5,
    title: "Draw 7 — the greatest trainer card, sold by a great seller",
    comment:
      "The irony of Gary Oak buying a Professor Oak card is not lost on me. " +
      "But sentiment aside, this NM copy from Surge is excellent — crisp edges, vibrant artwork, and " +
      "not a single bend or crease. For competitive players and collectors alike, Professor Oak is non-negotiable. " +
      "Surge had the lowest price I found for a properly graded NM copy. Shipped fast, tracked. " +
      "Staple card in every era — pick one up while they're available.",
    images: [],
    status: "approved",
    helpfulCount: 17,
    reportCount: 0,
    verified: false,
    featured: false,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    approvedAt: daysAgo(30),
  },

  // 9. Sabrina reviews Haunter Non-Holo (Surge)
  {
    id: "review-haunter-base1-24-sabrina-20260327",
    productId: "product-haunter-base1-24-non-holo-rare-psychic-surge-1",
    productTitle: "Haunter — Base Set #24 Non-Holo Rare (Near Mint)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png",
    rating: 5,
    title: "Psychic perfection — Haunter's mischievous grin in NM condition",
    comment:
      "I adore Haunter. That tongue-out artwork from Ken Sugimori is timeless. " +
      "Surge's copy arrived in genuine Near Mint — the card feels fresh, no whitening on corners, " +
      "and the classic Lick attack text is perfectly legible with no print defects. " +
      "Penny sleeved and shipped in a tracked bubble mailer. Fast shipping from Vermilion City. " +
      "A must-have Psychic-type for any serious Base Set collection.",
    images: [],
    status: "approved",
    helpfulCount: 15,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(28),
    approvedAt: daysAgo(28),
  },

  // 10. Oak reviews Water Energy lot (Misty)
  {
    id: "review-water-energy-lot-oak-20260328",
    productId: "product-water-energy-base1-99-common-energy-misty-lot",
    productTitle: "Water Energy — Base Set #99 x10 Lot (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png",
    rating: 5,
    title: "Perfect lot for research-grade deck documentation",
    comment:
      "I ordered three sets of 10 for my Blastoise research deck. Every single card from Misty arrived in " +
      "Near Mint condition — consistent print quality, clean artwork, and no duplicates with bent corners. " +
      "They were shipped in a team bag inside a bubble mailer — the correct way to ship bulk energy lots. " +
      "At this price per card the value is outstanding. Misty clearly understands both Water-type Pokémon and proper card care.",
    images: [],
    status: "approved",
    helpfulCount: 14,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(26),
    updatedAt: daysAgo(26),
    approvedAt: daysAgo(26),
  },

  // 11. Brock reviews Charizard 9-Pocket Binder (Misty)
  {
    id: "review-charizard-binder-brock-20260329",
    productId: "product-pokemon-9-pocket-binder-misty-1",
    productTitle: "Pokémon 9-Pocket Binder (360 cards, Charizard Cover)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-brock-pewter-buyer",
    userName: "Brock",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png",
    rating: 5,
    title: "Rock-solid binder — Charizard on the cover, perfection inside",
    comment:
      "Finally a binder worthy of my Base Set collection. 360-card capacity means my entire set fits comfortably " +
      "with room for extras. The side-loading pockets are excellent — cards slide in easily and stay secure. " +
      "The lay-flat design means I can view two pages simultaneously without straining the spine. " +
      "And the Charizard cover art? Chef's kiss. Shipped in a proper box so the binder arrived undamaged. " +
      "Misty ships card accessories as well as she ships Water singles. Highly recommended.",
    images: [],
    status: "approved",
    helpfulCount: 12,
    reportCount: 0,
    verified: false,
    featured: false,
    createdAt: daysAgo(24),
    updatedAt: daysAgo(24),
    approvedAt: daysAgo(24),
  },

  // 12. Erika reviews Fire Energy lot (Blaine)
  {
    id: "review-fire-energy-lot-erika-20260330",
    productId: "product-fire-energy-base1-100-common-energy-blaine-lot",
    productTitle: "Fire Energy — Base Set #100 x10 Lot (Near Mint)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-erika-celadon-erika",
    userName: "Erika",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/45.png",
    rating: 4,
    title: "Good value fire energy lot — perfect for trading away",
    comment:
      "I bought these to trade with Blaine's buyers at local meetups — everyone needs Fire Energy for Charizard decks. " +
      "Cards are Near Mint as described, arrived in a team bag, no bent corners. " +
      "Took 3 days to arrive from Cinnabar Island which is fair given the distance. " +
      "One star off only because the bubble mailer had slight external scuffing though the cards inside were fine. " +
      "Blaine's descriptions are honest and the price is right for bulk lots.",
    images: [],
    status: "approved",
    helpfulCount: 10,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(22),
    updatedAt: daysAgo(22),
    approvedAt: daysAgo(22),
  },

  // 13. Gary reviews Chansey Holo (Misty)
  {
    id: "review-chansey-base1-3-gary-20260401",
    productId: "product-chansey-base1-3-holo-rare-colorless-misty-1",
    productTitle: "Chansey — Base Set #3 Holo Rare (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-gary-oak-buyer",
    userName: "Gary Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png",
    rating: 4,
    title: "120 HP tank card — great condition, great price",
    comment:
      "Chansey is the tankiest card in Base Set and this NM copy does it justice. " +
      "Holo shimmer is vivid, centering is slightly left-heavy but well within NM range, " +
      "corners are sharp. Misty ships Water Gym quality even for Colorless cards — " +
      "tracked, top-loaded, fast. I'd prefer 5★ centering at this price but it's a solid purchase. " +
      "Recommended for completionists and healing-deck enthusiasts.",
    images: [],
    status: "approved",
    helpfulCount: 9,
    reportCount: 0,
    verified: false,
    featured: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(20),
    approvedAt: daysAgo(20),
  },

  // 14. Ash reviews Pikachu sleeves (Blaine)
  {
    id: "review-pikachu-sleeves-ash-20260402",
    productId: "product-pokemon-card-sleeves-standard-blaine-1",
    productTitle: "Pokémon-Art Card Sleeves (100-pack, Pikachu)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-ash-ketchum-buyer",
    userName: "Ash Ketchum",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    rating: 5,
    title: "Pikachu sleeves for my Pikachu card — perfect symmetry!",
    comment:
      "I sleeve all my cards in Pikachu sleeves. Obviously. These Ultra PRO standard-size sleeves fit " +
      "Base Set cards perfectly — snug, not tight, easy to insert and remove. " +
      "100 sleeves in the pack, all came intact with no tears or pre-bent edges. " +
      "Archival quality means I can trust them for long-term storage of my NM cards. " +
      "Blaine had the best price I found for genuine Ultra PRO. Quick shipping. 10/10.",
    images: [],
    status: "approved",
    helpfulCount: 7,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(18),
    updatedAt: daysAgo(18),
    approvedAt: daysAgo(18),
  },

  // 15. Brock reviews Magneton Holo LP (Surge)
  {
    id: "review-magneton-base1-9-brock-20260403",
    productId: "product-magneton-base1-9-holo-rare-electric-surge-1",
    productTitle: "Magneton — Base Set #9 Holo Rare (Lightly Played)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-brock-pewter-buyer",
    userName: "Brock",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png",
    rating: 3,
    title: "Holo is clean but corners are more worn than I expected",
    comment:
      "I was hoping for a Lightly Played card closer to NM range. The holo face is genuinely clean — " +
      "no scratches and a nice pattern — but the corner whitening is more pronounced than the photos suggested, " +
      "putting this closer to Moderately Played in my assessment. " +
      "Surge's shipping was excellent and response time was fast. " +
      "The price reflects LP so it's fair, but I'd recommend asking for additional photos before ordering a Lightly Played holo at this price. " +
      "Not a bad purchase — just calibrate expectations on the LP condition grading.",
    images: [cardImg(9)],
    status: "approved",
    helpfulCount: 8,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(16),
    updatedAt: daysAgo(16),
    approvedAt: daysAgo(16),
  },

  // 16. Erika reviews Clefairy uncommon (Misty)
  {
    id: "review-clefairy-base1-35-erika-20260405",
    productId: "product-clefairy-base1-35-uncommon-colorless-misty-1",
    productTitle: "Clefairy — Base Set #35 Uncommon (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-erika-celadon-erika",
    userName: "Erika",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/45.png",
    rating: 5,
    title: "Metronome magic in Near Mint — cute card, great seller",
    comment:
      "Clefairy's Metronome is one of the most charming moves in the entire Base Set. " +
      "Misty's copy is excellent — Near Mint with tight corners and clean text. " +
      "At this price for an uncommon, the quality is impressive. Shipped in a penny sleeve. " +
      "Delivery was fast. Misty's attention to card condition even on lower-value uncommons says a lot " +
      "about her shop's standards. Will buy my remaining Celadon Pokédex cards here.",
    images: [],
    status: "approved",
    helpfulCount: 5,
    reportCount: 0,
    verified: false,
    featured: false,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
    approvedAt: daysAgo(14),
  },

  // 17. Oak reviews Gyarados Holo (Misty)
  {
    id: "review-gyarados-base1-6-oak-20260407",
    productId: "product-gyarados-base1-6-holo-rare-water-misty-1",
    productTitle: "Gyarados — Base Set #6 Holo Rare (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-prof-oak-pallet-oak",
    userName: "Professor Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/143.png",
    rating: 5,
    title: "A fearsome sea-serpent in pristine scholarly condition",
    comment:
      "The Gyarados Holo Rare is a fascinating specimen — a Dragon-type Pokémon on a Water energy card, " +
      "reflecting the original design era before Dragon became its own type. " +
      "Misty's copy is genuinely Near Mint: deep holo shimmer, tight centering, not a blemish on it. " +
      "She shipped it tracked with a rigid top-loader and it arrived within two days. " +
      "I've now ordered Blastoise, Gyarados, Lapras, and Starmie from Misty — she is my go-to Water specialist.",
    images: [],
    status: "approved",
    helpfulCount: 11,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
    approvedAt: daysAgo(12),
  },

  // 18. Sabrina reviews Zap! Theme Deck (Surge)
  {
    id: "review-zap-theme-deck-sabrina-20260408",
    productId: "product-zap-theme-deck-sealed-surge-1",
    productTitle: "Pokémon Base Set 'Zap!' Theme Deck (Sealed)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-sabrina-saffron-sabrina",
    userName: "Sabrina",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png",
    rating: 4,
    title: "Genuine sealed WOTC deck — Electric chaos in a box",
    comment:
      "I purchased this as a sealed collectible for display. The factory seal is original and uncompromised — " +
      "I psychically verified no one has opened it. Surge packaged it excellently: rigid box, bubble wrap, " +
      "outer box for shipping. Arrived in perfect shape. " +
      "Four stars because the outer box had minor corner denting from transit, but the sealed deck inside is flawless. " +
      "For sealed vintage WOTC product this is excellent value. Surge is a trustworthy source.",
    images: [],
    status: "approved",
    helpfulCount: 6,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
    approvedAt: daysAgo(10),
  },

  // 19. Gary reviews Growlithe uncommon (Blaine)
  {
    id: "review-growlithe-base1-40-gary-20260409",
    productId: "product-growlithe-base1-40-uncommon-fire-blaine-1",
    productTitle: "Growlithe — Base Set #40 Uncommon (Near Mint)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-gary-oak-buyer",
    userName: "Gary Oak",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/132.png",
    rating: 4,
    title: "Cheap filler done right — NM condition, fast PWE delivery",
    comment:
      "I ordered 5 Growlithe for a casual Fire deck. All 5 arrived NM — crisp, clean, and no damage. " +
      "Blaine ships uncommons via PWE which is fine for low-value cards; I'd prefer tracking for higher-stakes cards " +
      "but for ₹699 uncommons the PWE is completely appropriate. " +
      "Good honest seller with accurate condition descriptions. Quick to answer questions. " +
      "Solid choice for deck-playable Fire-type singles.",
    images: [],
    status: "approved",
    helpfulCount: 4,
    reportCount: 0,
    verified: true,
    featured: false,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
    approvedAt: daysAgo(8),
  },

  // ══════════════════════════════════════════════════════════════
  // PENDING (awaiting moderation)
  // ══════════════════════════════════════════════════════════════

  // 20. Ash — pending review of Lightning Energy lot (Surge)
  {
    id: "review-lightning-energy-ash-20260428",
    productId: "product-lightning-energy-base1-101-common-energy-surge-lot",
    productTitle: "Lightning Energy — Base Set #101 x10 Lot (Near Mint)",
    sellerId: "user-lt-surge-electric-surge",
    userId: "user-ash-ketchum-buyer",
    userName: "Ash Ketchum",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    rating: 5,
    title: "Shocked by the quality — Surge delivers again!",
    comment:
      "Ordered two lots of 10 Lightning Energy for my Pikachu-themed deck build. All 20 cards arrived NM — " +
      "perfect for powering up Thunderbolt. Surge shipped them in a team bag in a bubble mailer. " +
      "Honestly these are the nicest Base Set commons I've received. " +
      "Fast delivery, great condition, fair price. Pika pika approved!",
    images: [],
    status: "pending",
    helpfulCount: 0,
    reportCount: 0,
    verified: true,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },

  // 21. Brock — pending review of Beedrill non-holo (Blaine)
  {
    id: "review-beedrill-base1-17-brock-20260429",
    productId: "product-beedrill-base1-17-non-holo-rare-grass-blaine-1",
    productTitle: "Beedrill — Base Set #17 Non-Holo Rare (Near Mint)",
    sellerId: "user-blaine-fire-gym-blaine",
    userId: "user-brock-pewter-buyer",
    userName: "Brock",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/74.png",
    rating: 3,
    title: "NM as listed, but Beedrill deserves a Grass-type seller",
    comment:
      "The card itself is fine — Near Mint, clean print, arrived safely in a penny sleeve. " +
      "My slight hesitation is philosophical: Beedrill is a Grass-type and Blaine runs a Fire-type shop. " +
      "Nothing wrong with the sale, just a curious choice. If you need a NM Beedrill quickly, " +
      "Blaine has it and ships fast. Three stars because the card is technically correct but I'm still thinking about it.",
    images: [],
    status: "pending",
    helpfulCount: 0,
    reportCount: 0,
    verified: false,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },

  // 22. Erika — pending review of Energy Retrieval trainer (Misty)
  {
    id: "review-energy-retrieval-erika-20260430",
    productId: "product-energy-retrieval-base1-91-common-trainer-misty-1",
    productTitle: "Energy Retrieval — Base Set #91 Trainer (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-erika-celadon-erika",
    userName: "Erika",
    userAvatar:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/45.png",
    rating: 5,
    title: "Deck staple in mint condition — Misty's Water selection impresses",
    comment:
      "I needed four Energy Retrieval for my Venusaur-Vileplume combo deck and Misty had them all in NM. " +
      "Cards are crisp and clean, no sleeve marks. Shipped together in a PWE which is totally fine for ₹599 cards. " +
      "Misty stocks trainer cards that synergise with her Water lineup — smart curation. " +
      "Will be ordering more trainer staples from here.",
    images: [],
    status: "pending",
    helpfulCount: 0,
    reportCount: 0,
    verified: true,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },

  // ══════════════════════════════════════════════════════════════
  // REJECTED (spam / inappropriate)
  // ══════════════════════════════════════════════════════════════

  // 23. Fake review — spam link on Dugtrio (Misty)
  {
    id: "review-dugtrio-base1-19-spam-20260415",
    productId: "product-dugtrio-base1-19-non-holo-rare-fighting-misty-1",
    productTitle: "Dugtrio — Base Set #19 Non-Holo Rare (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-unverified-new-user",
    userName: "New Trainer",
    userAvatar: undefined,
    rating: 1,
    title: "Fake card!! Buy real cards at cheapcardz.biz",
    comment:
      "This card is counterfeit!!! I can prove it. Visit cheapcardz.biz for AUTHENTIC Base Set cards at 90% off. " +
      "Don't trust this seller — click my link for the real deal. Promo code PIKA50 saves 50%!!!",
    images: [],
    status: "rejected",
    moderatorId: "user-moderator-mod-user",
    moderatorNote: "Spam comment with external promotional link and promo code",
    rejectionReason: "Contains spam links and promotional content",
    helpfulCount: 0,
    reportCount: 5,
    verified: false,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(14),
    rejectedAt: daysAgo(14),
  },

  // 24. Hostile/off-topic review on Blastoise (Misty)
  {
    id: "review-blastoise-base1-2-hostile-20260418",
    productId: "product-blastoise-base1-2-holo-rare-water-misty-1",
    productTitle: "Blastoise — Base Set #2 Holo Rare (Near Mint)",
    sellerId: "user-misty-water-gym-misty",
    userId: "user-unverified-new-user",
    userName: "New Trainer",
    userAvatar: undefined,
    rating: 2,
    title: "Water types are WEAK — why does anyone collect these",
    comment:
      "Fire types beat Water types. Charizard destroys Blastoise. " +
      "This shop is a waste of time. Misty is the worst Gym Leader. " +
      "Nobody should buy Water cards when Fire exists. Grow up collectors.",
    images: [],
    status: "rejected",
    moderatorId: "user-moderator-mod-user",
    moderatorNote: "Hostile, off-topic, and does not review the product",
    rejectionReason: "Abusive and off-topic content unrelated to the product",
    helpfulCount: 0,
    reportCount: 4,
    verified: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(11),
    rejectedAt: daysAgo(11),
  },
];
