/**
 * Pre-Orders Seed Data — Collectibles Edition
 * 5 pre-orders in all states: active×3, upcoming×1, soldOut×1.
 * Stored as ProductDocument with listingType: "pre-order".
 * id === slug convention enforced throughout.
 * Prices in INR paise (₹1 = 100 paise).
 */

import type { ProductDocument } from "../features/products/schemas";

const NOW = new Date();
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

const _rawProductsPreOrdersSeedData: Partial<ProductDocument>[] = [
  // ── 1. ACTIVE — Beyblade X BX-10 Booster (deposit 30%, shipping 45 days) ──
  {
    id: "preorder-beyblade-x-bx10-booster",
    slug: "preorder-beyblade-x-bx10-booster",
    title:
      "PRE-ORDER: Beyblade X BX-10 Dran Dagger Booster — Official Takara Tomy (Ships ~45 Days)",
    description:
      "Pre-order the BX-10 Dran Dagger Booster from the latest Beyblade X wave — authenticated Takara Tomy Japan stock. BX-10 Dran Dagger features the Dagger 3 blade with an aggressive attack profile and new DB driver for explosive Extreme Dash (X-Dash) manoeuvres. Deposit 30% (₹449.70) now and pay the remaining ₹1,049.30 on shipment confirmation. Estimated dispatch in 45 days from Japan warehouse — direct Takara Tomy import.",
    category: "category-beyblade-x",
    categoryName: "Beyblade X",
    brand: "Beyblade",
    brandSlug: "brand-beyblade",
    preOrderDeliveryDate: daysAhead(45),
    preOrderDepositPercent: 30,
    preOrderDepositAmount: 149900,
    preOrderMaxQuantity: 100,
    preOrderCurrentCount: 37,
    preOrderProductionStatus: "in_production",
    preOrderCancellable: true,
    price: 499900,
    currency: "INR",
    stockQuantity: 100,
    availableQuantity: 63,
    mainImage:
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1614108831137-558fffac9ead?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "Beyblade Arena",
    storeId: "store-beyblade-arena",
    featured: false,
    isPromoted: false,
    tags: [
      "beyblade-x",
      "bx-10",
      "dran-dagger",
      "pre-order",
      "takara-tomy",
      "booster",
    ],
    condition: "new",
    specifications: [
      { name: "Generation", value: "Beyblade X" },
      { name: "Product Code", value: "BX-10" },
      { name: "Top Name", value: "Dran Dagger" },
      { name: "Deposit Required", value: "30% (₹1,499)" },
      { name: "Estimated Shipping", value: "~45 days" },
      { name: "Manufacturer", value: "Takara Tomy Japan" },
    ],
    features: [
      "Beyblade X latest wave — BX-10 Dran Dagger",
      "30% deposit secures your unit",
      "Cancellable before shipping confirmation",
      "Authentic Takara Tomy Japan import",
      "37 units already pre-ordered — limited stock",
    ],
    shippingInfo:
      "Deposit paid now. Balance collected before shipping. Free standard shipping on pre-order delivery. 4–6 business days post-dispatch.",
    returnPolicy:
      "Pre-orders cancellable before shipment confirmation — full deposit refund. Once shipped, standard 7-day return policy applies.",
    allowOffers: false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
  },

  // ── 2. ACTIVE — Pokémon SV5 Shrouded Fable Booster Box (deposit 30%, 60 days) ─
  {
    id: "preorder-pokemon-sv5-booster-box",
    slug: "preorder-pokemon-sv5-booster-box",
    title:
      "PRE-ORDER: Pokémon TCG Scarlet & Violet — Shrouded Fable Booster Box (36 Packs, Ships ~60 Days)",
    description:
      "Pre-order the sealed Scarlet & Violet — Shrouded Fable Booster Box (36 packs) before the official India release. SV Shrouded Fable focuses on the mysterious Pecharunt and features returning Pokémon as shiny Illustration Rare special art cards. A pivotal investment set with high pull rates for gold and special illustration rares. Deposit 30% (₹2,999) now. Remaining ₹6,999 charged on shipment confirmation. Estimated 60-day window to official India release via authorised distributor.",
    category: "category-sealed-product",
    categoryName: "Sealed Product",
    brand: "The Pokémon Company",
    brandSlug: "brand-pokemon-company",
    preOrderDeliveryDate: daysAhead(60),
    preOrderDepositPercent: 30,
    preOrderDepositAmount: 299900,
    preOrderMaxQuantity: 50,
    preOrderCurrentCount: 22,
    preOrderProductionStatus: "in_production",
    preOrderCancellable: true,
    price: 999900,
    currency: "INR",
    stockQuantity: 50,
    availableQuantity: 28,
    mainImage:
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "Pokémon Palace",
    storeId: "store-pokemon-palace",
    featured: true,
    isPromoted: false,
    tags: [
      "pokemon",
      "sv5",
      "shrouded-fable",
      "booster-box",
      "sealed",
      "pre-order",
      "scarlet-violet",
    ],
    condition: "new",
    specifications: [
      { name: "Set", value: "Scarlet & Violet — Shrouded Fable" },
      { name: "Packs per Box", value: "36" },
      { name: "Deposit Required", value: "30% (₹2,999)" },
      { name: "Estimated Shipping", value: "~60 days" },
      { name: "Language", value: "English" },
      { name: "Source", value: "Authorised Indian distributor" },
    ],
    features: [
      "Sealed 36-pack booster box — factory sealed",
      "SV Shrouded Fable — Pecharunt and special art cards",
      "30% deposit locks your price",
      "Cancellable before shipping confirmation",
      "22 of 50 units already reserved",
    ],
    shippingInfo:
      "Deposit paid now. Balance on shipment confirmation. Double-boxed with foam — no corner damage.",
    returnPolicy:
      "Pre-orders cancellable before shipping — full deposit refund. Once dispatched, 7-day return on sealed (seal intact).",
    allowOffers: false,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(2),
  },

  // ── 3. ACTIVE — S.H.Figuarts Broly Super Hero (deposit 50%, 30 days) ───────
  {
    id: "preorder-shf-broly-super-hero",
    slug: "preorder-shf-broly-super-hero",
    title:
      "PRE-ORDER: Bandai S.H.Figuarts Broly (Dragon Ball Super: Super Hero Ver.) — Ships ~30 Days",
    description:
      "Pre-order the highly anticipated Bandai S.H.Figuarts Broly from Dragon Ball Super: Super Hero — Tamashii Web Exclusive. This figure captures Broly in his Super Hero movie design with an all-new sculpt: massive body with enhanced muscle detail, rage expression faceplate, green ki effect parts, and four pairs of interchangeable hands. Height approximately 18 cm. Estimated 30-day window to Japan warehouse shipment. 50% deposit required — Tamashii exclusives ship in limited quantities and sell out fast.",
    category: "category-poseable-figures",
    categoryName: "Poseable Action Figures",
    brand: "Bandai",
    brandSlug: "brand-bandai",
    preOrderDeliveryDate: daysAhead(30),
    preOrderDepositPercent: 50,
    preOrderDepositAmount: 349950,
    preOrderMaxQuantity: 30,
    preOrderCurrentCount: 18,
    preOrderProductionStatus: "ready_to_ship",
    preOrderCancellable: false,
    price: 699900,
    currency: "INR",
    stockQuantity: 30,
    availableQuantity: 12,
    mainImage:
      "https://images.unsplash.com/photo-1560762484-813fc97650a0?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1560762484-813fc97650a0?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "LetItRip Official",
    storeId: "store-letitrip-official",
    featured: false,
    isPromoted: true,
    tags: [
      "bandai",
      "sh-figuarts",
      "broly",
      "dragon-ball",
      "super-hero",
      "tamashii",
      "pre-order",
    ],
    condition: "new",
    specifications: [
      { name: "Character", value: "Broly" },
      { name: "Series", value: "Dragon Ball Super: Super Hero" },
      { name: "Height", value: "~18 cm", unit: "cm" },
      { name: "Deposit Required", value: "50% (₹3,499.50) — non-refundable" },
      { name: "Estimated Shipping", value: "~30 days" },
      { name: "Edition", value: "Tamashii Web Exclusive" },
    ],
    features: [
      "Ready to ship in ~30 days",
      "Tamashii Web Exclusive — very limited",
      "Rage expression faceplate + green ki effect parts",
      "50% deposit secures your unit",
      "Non-cancellable after deposit — ship window imminent",
    ],
    shippingInfo:
      "50% deposit now, balance before dispatch. Fast dispatch once stock arrives from Japan. 3–5 business days India delivery.",
    returnPolicy:
      "Non-cancellable after deposit (ship window imminent). 7-day return if product is defective on arrival.",
    allowOffers: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
  },

  // ── 4. UPCOMING — Gundam PG Unicorn Ver. 1.5 (opens for pre-order in 14 days) ─
  {
    id: "preorder-gundam-pg-unicorn-ver15",
    slug: "preorder-gundam-pg-unicorn-ver15",
    title:
      "UPCOMING PRE-ORDER: Bandai Gunpla PG 1/60 Unicorn Gundam Ver. 1.5 — Pre-Orders Open in ~14 Days",
    description:
      "Coming soon: the Bandai Perfect Grade 1/60 Unicorn Gundam Ver. 1.5 — a revised and enhanced version of the legendary PG Unicorn featuring improved transformation mechanism, updated LED unit compatibility, and revised psychoframe effect parts. The PG Unicorn is one of Bandai's greatest engineering achievements: transforms between Unicorn Mode (white armour closed) and Destroy Mode (psychoframe exposed) with 500+ parts. Est. delivery 120 days from pre-order open. Register your interest now to be notified when pre-orders open in approximately 14 days.",
    category: "category-gunpla",
    categoryName: "Gunpla",
    brand: "Bandai",
    brandSlug: "brand-bandai",
    preOrderDeliveryDate: daysAhead(134),
    preOrderDepositPercent: 30,
    preOrderDepositAmount: 449970,
    preOrderMaxQuantity: 20,
    preOrderCurrentCount: 0,
    preOrderProductionStatus: "upcoming",
    preOrderCancellable: true,
    price: 1499900,
    currency: "INR",
    stockQuantity: 20,
    availableQuantity: 20,
    mainImage:
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "LetItRip Official",
    storeId: "store-letitrip-official",
    featured: true,
    isPromoted: false,
    tags: [
      "gunpla",
      "perfect-grade",
      "unicorn-gundam",
      "pg",
      "bandai",
      "upcoming",
      "pre-order",
    ],
    condition: "new",
    specifications: [
      { name: "Grade", value: "Perfect Grade (PG)" },
      { name: "Scale", value: "1/60" },
      { name: "Version", value: "Ver. 1.5 — revised transformation" },
      { name: "Deposit Required", value: "30% (₹4,499.70) when opens" },
      { name: "Estimated Delivery", value: "~120 days from order open" },
      { name: "Pre-Orders Open", value: "~14 days from today" },
    ],
    features: [
      "PG Unicorn Ver. 1.5 — improved transformation mechanism",
      "500+ parts — Unicorn + Destroy mode transformation",
      "Updated LED unit compatibility (sold separately)",
      "Pre-orders not yet open — register interest",
      "Only 20 units allocated — extremely limited",
    ],
    shippingInfo:
      "Pre-orders not yet open. Deposit collected when pre-orders go live. Double-boxed with foam padding.",
    returnPolicy:
      "Cancellable at any time before shipment confirmation — full deposit refund.",
    allowOffers: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },

  // ── 6. ACTIVE — Pokémon Stellar Crown ETB (deposit 30%, 30 days) ────────────
  {
    id: "preorder-pokemon-stellar-crown-etb",
    slug: "preorder-pokemon-stellar-crown-etb",
    title:
      "PRE-ORDER: Pokémon TCG Scarlet & Violet — Stellar Crown Elite Trainer Box (Ships ~30 Days)",
    description:
      "Pre-order the Scarlet & Violet — Stellar Crown Elite Trainer Box before official India release. Stellar Crown introduces new Stellar Crown ex Pokémon and the Terastallization mechanic at the card level. Each ETB contains 9 booster packs, 65 card sleeves, 45 energy cards, and player accessories. Deposit 30% (₹1,349) now, balance of ₹3,149 charged on shipment confirmation. Estimated 30-day window — directly from authorised distributor.",
    category: "category-pokemon-tcg",
    categoryName: "Pokémon TCG",
    brand: "The Pokémon Company",
    brandSlug: "brand-pokemon-company",
    preOrderDeliveryDate: daysAhead(30),
    preOrderDepositPercent: 30,
    preOrderDepositAmount: 134970,
    preOrderMaxQuantity: 40,
    preOrderCurrentCount: 14,
    preOrderProductionStatus: "in_production",
    preOrderCancellable: true,
    price: 449900,
    currency: "INR",
    stockQuantity: 40,
    availableQuantity: 26,
    mainImage:
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "Pokémon Palace",
    storeId: "store-pokemon-palace",
    featured: false,
    isPromoted: false,
    tags: ["pokemon", "stellar-crown", "etb", "scarlet-violet", "pre-order", "sealed"],
    condition: "new",
    specifications: [
      { name: "Set", value: "Scarlet & Violet — Stellar Crown" },
      { name: "Contents", value: "9 packs, 65 sleeves, energy, accessories" },
      { name: "Deposit Required", value: "30% (₹1,349)" },
      { name: "Estimated Shipping", value: "~30 days" },
      { name: "Language", value: "English" },
    ],
    features: [
      "Stellar Crown — Terastallization mechanic",
      "30% deposit locks your price",
      "14 of 40 units already reserved",
      "Cancellable before shipping confirmation",
      "Authorised distributor — factory sealed",
    ],
    shippingInfo: "Deposit paid now. Balance on shipment confirmation. Double-boxed with foam.",
    returnPolicy: "Pre-orders cancellable before shipping — full deposit refund.",
    allowOffers: false,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  },

  // ── 7. ACTIVE — Beyblade X BX-20 Phoenix Wing (deposit 30%, 60 days) ───────
  {
    id: "preorder-beyblade-x-bx20-phoenix-wing",
    slug: "preorder-beyblade-x-bx20-phoenix-wing",
    title:
      "PRE-ORDER: Beyblade X BX-20 Phoenix Wing Starter Set — Official Takara Tomy (Ships ~60 Days)",
    description:
      "Pre-order the next-gen Beyblade X BX-20 Phoenix Wing starter set — the most anticipated release in the Beyblade X second wave. Phoenix Wing features the redesigned Wing 5 blade with aerodynamic profile adjustments for improved X-Dash trajectory control, and the new Phoenix driver for balance-type play. This is a Japan-warehouse pre-order — direct Takara Tomy import. Deposit 30% (₹599.70) now, balance charged on shipment confirmation in approximately 60 days.",
    category: "category-beyblade-x",
    categoryName: "Beyblade X",
    brand: "Beyblade",
    brandSlug: "brand-beyblade",
    preOrderDeliveryDate: daysAhead(60),
    preOrderDepositPercent: 30,
    preOrderDepositAmount: 179970,
    preOrderMaxQuantity: 80,
    preOrderCurrentCount: 31,
    preOrderProductionStatus: "in_production",
    preOrderCancellable: true,
    price: 599900,
    currency: "INR",
    stockQuantity: 80,
    availableQuantity: 49,
    mainImage:
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "Beyblade Arena",
    storeId: "store-beyblade-arena",
    featured: false,
    isPromoted: true,
    tags: ["beyblade-x", "bx-20", "phoenix-wing", "takara-tomy", "pre-order", "second-wave"],
    condition: "new",
    specifications: [
      { name: "Generation", value: "Beyblade X" },
      { name: "Product Code", value: "BX-20" },
      { name: "Top Name", value: "Phoenix Wing 5" },
      { name: "Deposit Required", value: "30% (₹1,799)" },
      { name: "Estimated Shipping", value: "~60 days" },
    ],
    features: [
      "Second-wave BX-20 — next-gen X-Dash control",
      "30% deposit secures your unit",
      "31 of 80 units already reserved",
      "Cancellable before shipping confirmation",
      "Authentic Takara Tomy Japan import",
    ],
    shippingInfo: "Deposit paid now. Balance before shipping. Free standard shipping on delivery.",
    returnPolicy: "Cancellable before shipment — full deposit refund. Standard return after delivery.",
    allowOffers: false,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(1),
  },

  // ── 8. ACTIVE — Gundam RG Hi-Nu Ver.Ka (deposit 30%, 90 days) ───────────────
  {
    id: "preorder-gundam-rg-hi-nu-verka",
    slug: "preorder-gundam-rg-hi-nu-verka",
    title:
      "PRE-ORDER: Bandai Gunpla RG 1/144 Hi-ν Gundam Ver.Ka — Real Grade Kit (Ships ~90 Days)",
    description:
      "Pre-order the highly anticipated RG 1/144 Hi-ν Gundam Ver.Ka — a Real Grade adaptation of Hajime Katoki's definitive Hi-Nu design featuring the iconic asymmetric fin funnel array in purple. This RG features pre-coloured inner frame runners, the complete 6-fin funnel set in deployable configuration, Hi-Mega Cannon effect parts, and Beam Sabre effects. Estimated 90-day window from Japan warehouse dispatch. 30% deposit locks your unit — limited to 25 units through Gundam Galaxy.",
    category: "category-gunpla",
    categoryName: "Gunpla",
    brand: "Bandai",
    brandSlug: "brand-bandai",
    preOrderDeliveryDate: daysAhead(90),
    preOrderDepositPercent: 30,
    preOrderDepositAmount: 119970,
    preOrderMaxQuantity: 25,
    preOrderCurrentCount: 9,
    preOrderProductionStatus: "in_production",
    preOrderCancellable: true,
    price: 399900,
    currency: "INR",
    stockQuantity: 25,
    availableQuantity: 16,
    mainImage:
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1608889825271-9696283b84bd?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1657664072470-99b02c2143f2?w=800&h=800&fit=crop",
    ],
    status: "published",
    storeName: "Gundam Galaxy",
    storeId: "store-gundam-galaxy",
    featured: false,
    isPromoted: false,
    tags: ["gunpla", "real-grade", "rg", "hi-nu-gundam", "ver-ka", "bandai", "katoki", "pre-order", "fin-funnel"],
    condition: "new",
    specifications: [
      { name: "Grade", value: "Real Grade (RG)" },
      { name: "Scale", value: "1/144" },
      { name: "Fin Funnels", value: "6 — full deployable set" },
      { name: "Deposit Required", value: "30% (₹1,199)" },
      { name: "Estimated Shipping", value: "~90 days" },
    ],
    features: [
      "Hi-ν Ver.Ka — Katoki definitive design",
      "6 fin funnels in deployable configuration",
      "Hi-Mega Cannon and Beam Sabre effects",
      "Pre-coloured inner frame runners",
      "Only 25 units — 9 already reserved",
    ],
    shippingInfo: "Deposit paid now. Balance collected before shipping. Double-boxed with foam.",
    returnPolicy: "Cancellable before shipment — full deposit refund.",
    allowOffers: false,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  },

  // ── 5. SOLD OUT — Hot Wheels RLC 2026 Annual Membership ────────────────────
  {
    id: "preorder-hot-wheels-rlc-2026",
    slug: "preorder-hot-wheels-rlc-2026",
    title:
      "SOLD OUT: Hot Wheels Red Line Club (RLC) 2026 Annual Membership — Pre-Order Closed",
    description:
      "SOLD OUT — Pre-orders for the Hot Wheels Red Line Club (RLC) 2026 Annual Membership have closed. All 15 allocated membership slots have been reserved. RLC Annual Membership entitles members to purchase all 2026 RLC exclusive cars (approx. 6–8 cars per year), first access to Hot Wheels Collectors events, and a membership card. This listing is maintained for reference — join our waitlist by messaging the store for cancellation availability. Membership price was ₹6,499.",
    category: "category-hot-wheels",
    categoryName: "Hot Wheels",
    brand: "Hot Wheels",
    brandSlug: "brand-hot-wheels",
    preOrderDeliveryDate: daysAhead(180),
    preOrderDepositPercent: 100,
    preOrderDepositAmount: 649900,
    preOrderMaxQuantity: 15,
    preOrderCurrentCount: 15,
    preOrderProductionStatus: "in_production",
    preOrderCancellable: false,
    price: 649900,
    currency: "INR",
    stockQuantity: 15,
    availableQuantity: 0,
    mainImage:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=800&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&h=800&fit=crop",
    ],
    status: "out_of_stock",
    storeName: "Diecast Depot",
    storeId: "store-diecast-depot",
    featured: false,
    isPromoted: false,
    tags: [
      "hot-wheels",
      "rlc",
      "membership",
      "2026",
      "sold-out",
      "pre-order-closed",
    ],
    condition: "new",
    specifications: [
      { name: "Product", value: "RLC 2026 Annual Membership" },
      { name: "Status", value: "SOLD OUT — all 15 slots reserved" },
      { name: "Membership Includes", value: "6–8 RLC exclusive cars, event access" },
      { name: "Full Price", value: "₹6,499 (paid in full)" },
      { name: "Availability", value: "Waitlist only — message store" },
    ],
    features: [
      "SOLD OUT — 15/15 memberships reserved",
      "Access to all 2026 RLC exclusive cars",
      "Priority access to Hot Wheels Collectors events",
      "Waitlist available — message store for cancellations",
      "2025 memberships were ₹5,999 — price rose 8.3%",
    ],
    shippingInfo:
      "Sold out — no further orders accepted. Existing members will receive shipping details per car.",
    returnPolicy:
      "Non-cancellable — all slots fully committed. Cancellation transfers handled store-to-buyer direct.",
    allowOffers: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
  },
];

/**
 * SB1-G Phase 4 (S22 2026-05-12): every pre-order document is stamped with
 * `listingType: "pre-order"`. The legacy `isPreOrder` boolean has been
 * removed from `ProductDocument`; this map-wrapper is the canonical write site.
 */
export const productsPreOrdersSeedData: Partial<ProductDocument>[] =
  _rawProductsPreOrdersSeedData.map((p) => ({
    ...p,
    listingType: "pre-order" as const,
  }));
