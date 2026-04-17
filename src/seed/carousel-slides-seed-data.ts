import "server-only";

/**
 * Carousel Slides Seed Data
 * Homepage carousel/hero section slides with interactive grid cards
 */

import type { CarouselSlideDocument } from "../features/homepage/schemas";

// Dynamic date helpers
const NOW = new Date();
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

export const carouselSlidesSeedData: Partial<CarouselSlideDocument>[] = [
  // Slide 1: Welcome/Hero Slide — full-slide central overlay (no cards)
  {
    id: "carousel-welcome-hero-slide-1707300000001",
    title: "Welcome Hero Slide",
    order: 1,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&h=1080&fit=crop",
      alt: "Welcome to LetItRip — Anime Figures & Collectibles",
    },
    mobileMedia: {
      type: "image",
      url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=1200&fit=crop",
      alt: "Welcome to LetItRip",
    },
    cards: [],
    overlay: {
      subtitle: "Your Otaku Marketplace",
      title: "Anime Figures & Collectibles",
      description:
        "Shop authentic scale figures, Nendoroids, Gunpla kits, and cosplay — bid on rare auctions and exclusive drops.",
      button: {
        id: "btn_overlay_001",
        text: "Shop Now",
        link: "/products",
        variant: "primary",
        openInNewTab: false,
      },
    },
    createdAt: daysAgo(799),
    updatedAt: daysAgo(2),
    createdBy: "user-admin-user-admin",
  },

  // Slide 2: Electronics Sale
  {
    id: "carousel-flash-sale-1707300000002",
    title: "Electronics Mega Sale",
    order: 2,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1920&h=1080&fit=crop",
      alt: "Electronics Mega Sale",
    },
    cards: [
      {
        id: "card_003",
        gridRow: 1,
        gridCol: 1,
        background: {
          type: "gradient",
          value:
            "linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(124, 58, 237, 0.95))",
        },
        content: {
          title: "Electronics Sale",
          subtitle: "Up to 50% OFF",
          description: "Latest gadgets at great prices",
        },
        buttons: [
          {
            id: "btn_003",
            text: "Shop Electronics",
            link: "/categories/electronics",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card_004",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "image",
          value:
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=600&fit=crop",
        },
        content: {
          title: "iPhone 15 Pro",
          description: "Starting at ₹134,900",
        },
        buttons: [
          {
            id: "btn_004",
            text: "View",
            link: "/products/product-iphone-15-pro-max-smartphones-new-techhub-electronics-1",
            variant: "secondary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: true,
      },
    ],
    createdAt: daysAgo(37),
    updatedAt: daysAgo(30),
    createdBy: "user-admin-user-admin",
  },

  // Slide 3: Cosplay & Apparel
  {
    id: "carousel-special-offer-1707300000003",
    title: "Cosplay & Apparel",
    order: 3,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&h=1080&fit=crop",
      alt: "Cosplay & Apparel Collection",
    },
    cards: [
      {
        id: "card_005",
        gridRow: 1,
        gridCol: 3,
        background: {
          type: "gradient",
          value:
            "linear-gradient(135deg, rgba(236, 72, 153, 0.9), rgba(219, 39, 119, 0.9))",
        },
        content: {
          title: "Cosplay & Apparel",
          subtitle: "New Collection",
          description: "Demon Slayer, Sailor Moon, Genshin Impact",
        },
        buttons: [
          {
            id: "btn_005",
            text: "Men's Cosplay",
            link: "/categories/mens-fashion",
            variant: "primary",
            openInNewTab: false,
          },
          {
            id: "btn_006",
            text: "Women's Cosplay",
            link: "/categories/womens-fashion",
            variant: "secondary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
    ],
    createdAt: daysAgo(33),
    updatedAt: daysAgo(30),
    createdBy: "user-admin-user-admin",
  },

  // Slide 4: Limited Edition Drops (with video)
  {
    id: "carousel-trending-now-1707300000004",
    title: "Limited Edition Drops",
    order: 4,
    active: true,
    media: {
      type: "video",
      url: "https://assets.mixkit.co/videos/preview/mixkit-going-down-on-an-escalator-4549-large.mp4",
      alt: "Limited Edition Drops",
      thumbnail:
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1920&h=1080&fit=crop",
    },
    cards: [
      {
        id: "card_006",
        gridRow: 1,
        gridCol: 1,
        background: {
          type: "color",
          value: "#f59e0b",
        },
        content: {
          title: "Limited Edition",
          description: "Rare figures — grab before they're gone",
        },
        buttons: [
          {
            id: "btn_007",
            text: "View Limited Drops",
            link: "/categories/audio-electronics",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card_007",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "gradient",
          value: "linear-gradient(135deg, #ef4444, #dc2626)",
        },
        content: {
          title: "Evangelion Unit-01",
          description: "Garage Kit — Only 3 left!",
        },
        buttons: [],
        isButtonOnly: false,
      },
    ],
    createdAt: daysAgo(31),
    updatedAt: daysAgo(30),
    createdBy: "user-admin-user-admin",
  },

  // Slide 5: Live Figure Auctions
  {
    id: "carousel-seasonal-collection-1707300000005",
    title: "Live Figure Auctions",
    order: 5,
    active: true,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1920&h=1080&fit=crop",
      alt: "Live Figure Auctions",
    },
    link: {
      url: "/auctions",
      openInNewTab: false,
    },
    cards: [
      {
        id: "card_008",
        gridRow: 1,
        gridCol: 2,
        background: {
          type: "gradient",
          value:
            "linear-gradient(135deg, rgba(20, 184, 166, 0.9), rgba(13, 148, 136, 0.9))",
        },
        content: {
          title: "Live Figure Auctions",
          subtitle: "Bid & Win",
          description: "NGE Evangelion Signed Poster • Son Goku Family Set",
        },
        buttons: [
          {
            id: "btn_008",
            text: "Browse Auctions",
            link: "/auctions",
            variant: "primary",
            openInNewTab: false,
          },
        ],
        isButtonOnly: false,
      },
      {
        id: "card_009",
        gridRow: 2,
        gridCol: 3,
        background: {
          type: "color",
          value: "#ef4444",
        },
        content: {
          title: "Auction Closing",
          description: "NGE Poster — 2 hours left!",
        },
        buttons: [],
        isButtonOnly: false,
      },
    ],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    createdBy: "user-admin-user-admin",
  },

  // Inactive Slide (for testing)
  {
    id: "carousel-limited-time-deals-1707300000006",
    title: "Inactive Test Slide",
    order: 6,
    active: false,
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1557821552-17105176677c?w=1920&h=1080&fit=crop",
      alt: "Test Banner",
    },
    cards: [],
    createdAt: daysAgo(54),
    updatedAt: daysAgo(49),
    createdBy: "user-admin-user-admin",
  },
];
