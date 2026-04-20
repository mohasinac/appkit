import React from "react";
import { Main } from "../../../ui";
import { carouselRepository } from "../../../repositories";
import { HeroCarousel } from "./HeroCarousel";
import { HowItWorksSection } from "./HowItWorksSection";
import { StatsCounterSection } from "./StatsCounterSection";
import { TrustFeaturesSection } from "./TrustFeaturesSection";
import { TrustIndicatorsSection } from "./TrustIndicatorsSection";
import { WelcomeSection } from "./WelcomeSection";
import { WhatsAppCommunitySection } from "./WhatsAppCommunitySection";

const TRUST_FEATURES = [
  {
    iconName: "verified-sellers",
    title: "Verified Sellers",
    description: "Identity and quality checks before listings go live.",
  },
  {
    iconName: "secure-checkout",
    title: "Secure Checkout",
    description: "Protected payments with transparent order tracking.",
  },
  {
    iconName: "nationwide-delivery",
    title: "Nationwide Delivery",
    description: "Fast shipping with reliable logistics partners.",
  },
  {
    iconName: "support-first",
    title: "Support First",
    description: "Real help from our team across pre and post purchase.",
  },
];

const STATS = [
  { key: "buyers", label: "Active Buyers", value: "50k+" },
  { key: "sellers", label: "Verified Sellers", value: "2,500+" },
  { key: "orders", label: "Orders Delivered", value: "200k+" },
  { key: "cities", label: "Cities Served", value: "400+" },
];

const TRUST_INDICATORS = [
  {
    key: "quality",
    icon: "Q",
    title: "Assured Quality",
    description: "Moderated listings from trusted sellers",
  },
  {
    key: "shipping",
    icon: "S",
    title: "Reliable Shipping",
    description: "End-to-end tracking on deliveries",
  },
  {
    key: "support",
    icon: "C",
    title: "Buyer Support",
    description: "Responsive support when you need help",
  },
  {
    key: "security",
    icon: "P",
    title: "Secure Checkout",
    description: "Protected payment and order lifecycle",
  },
];

const HOW_IT_WORKS = [
  {
    number: 1,
    title: "Explore",
    desc: "Discover trusted products, stores, and limited drops.",
  },
  {
    number: 2,
    title: "Compare",
    desc: "Use filters, reviews, and details to pick confidently.",
  },
  {
    number: 3,
    title: "Checkout",
    desc: "Complete payment with protected transaction flow.",
  },
  {
    number: 4,
    title: "Track",
    desc: "Follow shipment status until delivery completes.",
  },
];

export async function MarketplaceHomepageView() {
  const slides = await carouselRepository.getActiveSlides().catch(() => []);

  return (
    <Main>
      <WelcomeSection
        title="LetiTrip Marketplace"
        subtitle="Discover curated products, trusted sellers, and limited-time offers in one destination."
        pillLabel="Curated for collectors"
        brandLogoText="LT"
        showCTA
        ctaLabel="Shop Now"
        secondaryCtaLabel="Read Blog"
      />
      <HeroCarousel initialSlides={slides as any[]} />
      <StatsCounterSection stats={STATS} />
      <TrustFeaturesSection title="Why Buyers Trust LetiTrip" items={TRUST_FEATURES} />
      <HowItWorksSection title="How It Works" steps={HOW_IT_WORKS} />
      <TrustIndicatorsSection items={TRUST_INDICATORS} />
      <WhatsAppCommunitySection
        title="Join the LetiTrip Community"
        descriptionHtml="Get marketplace alerts, limited drops, and product stories in one channel."
        memberCount={12000}
        groupLink="https://chat.whatsapp.com/"
      />
    </Main>
  );
}
