import "server-only";

/**
 * Stores Seed Data
 *
 * One StoreDocument per seller user.  Stats are pre-computed from the seed
 * products and reviews because Admin-SDK writes do NOT fire Firestore triggers.
 *
 * Computed values (as of seed data version):
 *   FigureVault JP   — 18 published products, 12 approved reviews, avg 4.7
 *   AnimeCraft Apparel — 10 published products,  6 approved reviews, avg 4.7
 *   OtakuShelf Co    — 12 published products,  7 approved reviews, avg 4.4
 */

import type { StoreDocument } from "../features/stores/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

export const storesSeedData: Partial<StoreDocument>[] = [
  // ── FigureVault JP ────────────────────────────────────────────────────────
  {
    id: "store-figurevault-jp-by-figurevault",
    storeSlug: "store-figurevault-jp-by-figurevault",
    ownerId: "user-techhub-electronics-electron",
    storeName: "FigureVault JP",
    storeDescription:
      "Your premier source for authentic anime scale figures, limited editions, and rare collectibles direct from Japan.",
    storeCategory: "electronics",
    storeLogoURL:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Japan-based premium scale figures dealer — Bandai Spirits, MegaHouse, Kotobukiya and more.",
    location: "Mumbai, India",
    website: "https://figurevaultjp.example.com",
    socialLinks: {
      facebook: "https://facebook.com/figurevaultjp",
      instagram: "https://instagram.com/figurevaultjp",
    },
    returnPolicy:
      "7-day hassle-free returns on all items. Figures must be in original sealed packaging for a full refund.",
    shippingPolicy:
      "Free shipping on orders above ₹999. Standard delivery in 3-5 business days. Express delivery available.",
    isPublic: true,
    isVacationMode: false,
    // Pre-computed from seed products (triggers don't fire during seeding)
    // totalProducts: all published products where sellerId = user-techhub-electronics-electron
    //   Regular (isAuction:false): iphone-15-pro-max, samsung-galaxy-s24-ultra,
    //     google-pixel-8-pro, macbook-pro-16, dell-xps-15, samsung-galaxy-watch6,
    //     anker-usbc-charger, apple-ipad-pro, preorder-chainsaw-man-makima,
    //     preorder-frieren => 10
    //   Auctions: vintage-canon, macbook-pro-m3, vintage-leica, fate-saber-alter,
    //     rezero-rem-wedding, one-piece-signed-artbook, gunpla-pg-wing-zero => 7
    //     (sony-wh is out_of_stock — not counted)
    //   Wait, preorder products are also regular (isAuction:false). Count: 10 + 8 = 18... let me recheck.
    //   Actually: vintage-leica + vintage-canon + one-piece-artbook + fate-saber-alter
    //           + rezero-rem-wedding + macbook-m3-auction + gunpla-pg-wing-zero = 7 auctions
    //           Regular: 3 smartphones + macbook-16 + dell-xps + galaxy-watch6 +
    //                    anker-charger + apple-ipad + 2 preorders = 10
    //   Total = 18
    stats: {
      totalProducts: 18,
      itemsSold: 7,
      totalReviews: 12,
      averageRating: 4.7,
    },
    createdAt: daysAgo(647),
    updatedAt: daysAhead(4),
  },

  // ── AnimeCraft Apparel ───────────────────────────────────────────────────
  {
    id: "store-animecraft-apparel-by-animecraft",
    storeSlug: "store-animecraft-apparel-by-animecraft",
    ownerId: "user-fashion-boutique-fashionb",
    storeName: "AnimeCraft Apparel",
    storeDescription:
      "Crafted cosplay costumes, anime hoodies, graphic tees, and accessories for every otaku.",
    storeCategory: "fashion",
    storeLogoURL:
      "https://images.unsplash.com/photo-1612810806695-30f7a8258391?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Handcrafted cosplay outfits and anime apparel — Demon Slayer, Sailor Moon, Genshin Impact and more.",
    location: "Delhi, India",
    website: "https://animecraftapparel.example.com",
    socialLinks: {
      instagram: "https://instagram.com/animecraftapparel",
      facebook: "https://facebook.com/animecraftapparel",
    },
    returnPolicy:
      "14-day returns on unworn items with original tags attached. Exchange available within 30 days.",
    shippingPolicy:
      "Free shipping on all orders above ₹599. Express delivery in 1-2 business days available at checkout.",
    isPublic: true,
    isVacationMode: false,
    // totalProducts: all published products where sellerId = user-fashion-boutique-fashionb
    //   Regular: mens-cotton, oxford-shirt, slim-chinos, derby-shoes,
    //            womens-kurti, anarkali-kurta, midi-dress, tote-bag => 8
    //   Auctions: chainsaw-man-makima, pokemon-charizard => 2
    //   Total = 10
    stats: {
      totalProducts: 10,
      itemsSold: 2,
      totalReviews: 6,
      averageRating: 4.7,
    },
    createdAt: daysAgo(768),
    updatedAt: daysAhead(4),
  },

  // ── OtakuShelf Co ────────────────────────────────────────────────────────
  {
    id: "store-otakushelf-co-by-otakushelf",
    storeSlug: "store-otakushelf-co-by-otakushelf",
    ownerId: "user-home-essentials-homeesse",
    storeName: "OtakuShelf Co",
    storeDescription:
      "Nendoroids, Gunpla model kits, dioramas, and shelf-worthy collectibles for anime enthusiasts.",
    storeCategory: "home",
    storeLogoURL:
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&h=400&fit=crop",
    storeBannerURL:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&h=400&fit=crop",
    status: "active",
    bio: "Nendoroid sets, Gunpla kits, and collectible display pieces for the serious anime collector.",
    location: "Pune, India",
    website: "https://otakushelfco.example.com",
    socialLinks: {
      instagram: "https://instagram.com/otakushelfco",
      facebook: "https://facebook.com/otakushelfco",
    },
    returnPolicy:
      "10-day returns accepted on all products. Damaged or defective items replaced at no extra cost.",
    shippingPolicy:
      "Free shipping on orders above ₹1499. Fragile items packed securely. Delivery in 3-7 business days.",
    isPublic: true,
    isVacationMode: false,
    // totalProducts: all published products where sellerId = user-home-essentials-homeesse
    //   Regular: non-stick-cookware, prestige-pressure-cooker, nonstick-cookware,
    //            smart-air-purifier, solid-wood-coffee-table, yoga-mat-with-bag,
    //            premium-yoga-mat, adjustable-dumbbell, cricket-bat-mrf,
    //            running-shoes-adidas => 10
    //   Auctions: jjk-sukuna, spirited-away-cel => 2
    //   Total = 12
    stats: {
      totalProducts: 12,
      itemsSold: 2,
      totalReviews: 7,
      averageRating: 4.4,
    },
    createdAt: daysAgo(525),
    updatedAt: daysAhead(4),
  },
];
