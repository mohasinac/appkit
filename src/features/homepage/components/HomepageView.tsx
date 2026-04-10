"use client";

import React from "react";
import { Div } from "@mohasinac/ui";

export interface HomepageViewProps {
  renderHero?: () => React.ReactNode;
  renderWelcome?: () => React.ReactNode;
  renderTrustFeatures?: () => React.ReactNode;
  renderStats?: () => React.ReactNode;
  renderTopCategories?: () => React.ReactNode;
  renderTopBrands?: () => React.ReactNode;
  renderFeaturedProducts?: () => React.ReactNode;
  renderFeaturedAuctions?: () => React.ReactNode;
  renderFeaturedPreOrders?: () => React.ReactNode;
  renderFeaturedStores?: () => React.ReactNode;
  renderFeaturedEvents?: () => React.ReactNode;
  renderAdvertisement?: () => React.ReactNode;
  renderCustomerReviews?: () => React.ReactNode;
  renderCommunity?: () => React.ReactNode;
  renderFaq?: () => React.ReactNode;
  renderBlogArticles?: () => React.ReactNode;
  renderHowItWorks?: () => React.ReactNode;
  renderSecurity?: () => React.ReactNode;
  renderNewsletter?: () => React.ReactNode;
  renderFeaturedResults?: () => React.ReactNode;
  className?: string;
}

export function HomepageView({
  renderHero,
  renderWelcome,
  renderTrustFeatures,
  renderStats,
  renderTopCategories,
  renderTopBrands,
  renderFeaturedProducts,
  renderFeaturedAuctions,
  renderFeaturedPreOrders,
  renderFeaturedStores,
  renderFeaturedEvents,
  renderAdvertisement,
  renderCustomerReviews,
  renderCommunity,
  renderFaq,
  renderBlogArticles,
  renderHowItWorks,
  renderSecurity,
  renderNewsletter,
  renderFeaturedResults,
  className = "",
}: HomepageViewProps) {
  return (
    <Div className={className}>
      {renderHero?.()}
      {renderWelcome?.()}
      {renderTrustFeatures?.()}
      {renderStats?.()}
      {renderTopCategories?.()}
      {renderTopBrands?.()}
      {renderFeaturedProducts?.()}
      {renderFeaturedAuctions?.()}
      {renderFeaturedPreOrders?.()}
      {renderFeaturedStores?.()}
      {renderFeaturedEvents?.()}
      {renderAdvertisement?.()}
      {renderCustomerReviews?.()}
      {renderCommunity?.()}
      {renderFaq?.()}
      {renderBlogArticles?.()}
      {renderHowItWorks?.()}
      {renderSecurity?.()}
      {renderNewsletter?.()}
      {renderFeaturedResults?.()}
    </Div>
  );
}
