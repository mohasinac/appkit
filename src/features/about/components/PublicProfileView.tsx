import { ROUTES } from "../../../constants";
import { THEME_CONSTANTS } from "../../../tokens";
import { Heading, Text, Section } from "../../../ui";
import { TextLink } from "../../../ui";
import { User, Star, ShoppingBag, MessageCircle } from "lucide-react";

const DEFAULT_HERO_CLASS =
  "bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-900 dark:to-black";

export interface PublicProfileViewProps {
  userId: string;
  heroBannerClass?: string;
}

export async function PublicProfileView({
  userId,
  heroBannerClass = DEFAULT_HERO_CLASS,
}: PublicProfileViewProps) {
  const { themed, flex, page } = THEME_CONSTANTS;
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("publicProfile");

  void userId; // userId used by consumer to fetch profile data and pass as props

  // This is a layout shell — data (displayName, avatarUrl, reviewCount, listingCount, joinedAt)
  // is injected by the consumer page via server-fetched props.
  // The view renders a consistent shell; in Phase 3 consumers pass data.

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 lg:-mt-10" data-section="publicprofileview-div-186">
      {/* Profile hero banner */}
      <Section className={`${heroBannerClass} text-white py-10 md:py-14`}>
        <div className={`${page.container.md}`} data-section="publicprofileview-div-187">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5" data-section="publicprofileview-div-188">
            {/* Avatar placeholder */}
            <div
              className={`w-20 h-20 rounded-full bg-white/20 ${flex.center} flex-shrink-0`}
             data-section="publicprofileview-div-189">
              <User className="w-10 h-10 text-white/60" />
            </div>
            <div className="text-center sm:text-left" data-section="publicprofileview-div-190">
              <Heading level={1} variant="none" className="text-white mb-1">
                {t("profileTitle")}
              </Heading>
              <Text variant="none" className="text-white/60 text-sm">
                {t("memberSince")}
              </Text>
            </div>
          </div>
        </div>
      </Section>

      <div className={`${page.container.md} py-10 md:py-12 space-y-10`} data-section="publicprofileview-div-191">
        {/* Stats row */}
        <div className={`grid grid-cols-3 gap-4`} data-section="publicprofileview-div-192">
          {[
            { icon: ShoppingBag, label: t("statListings"), value: "—" },
            { icon: Star, label: t("statReviews"), value: "—" },
            { icon: MessageCircle, label: t("statMessages"), value: "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className={`rounded-xl border ${themed.border} ${themed.bgPrimary} p-4 text-center`}
             data-section="publicprofileview-div-193">
              <div className={`${flex.center} mb-1`} data-section="publicprofileview-div-194">
                <Icon className="w-4 h-4 text-neutral-400" />
              </div>
              <Text className="text-lg font-bold">{value}</Text>
              <Text variant="secondary" className="text-xs">
                {label}
              </Text>
            </div>
          ))}
        </div>

        {/* Listings placeholder */}
        <Section>
          <Heading level={2} className="mb-4">
            {t("listingsTitle")}
          </Heading>
          <div
            className={`rounded-2xl border ${themed.border} ${themed.bgSecondary} p-12 text-center`}
           data-section="publicprofileview-div-195">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <Text variant="secondary" className="text-sm">
              {t("noListings")}
            </Text>
          </div>
        </Section>

        {/* Reviews placeholder */}
        <Section>
          <Heading level={2} className="mb-4">
            {t("reviewsTitle")}
          </Heading>
          <div
            className={`rounded-2xl border ${themed.border} ${themed.bgSecondary} p-12 text-center`}
           data-section="publicprofileview-div-196">
            <Star className="w-10 h-10 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <Text variant="secondary" className="text-sm">
              {t("noReviews")}
            </Text>
          </div>
        </Section>

        {/* Back link */}
        <div className="flex justify-center pt-2" data-section="publicprofileview-div-197">
          <TextLink
            href={String(ROUTES.HOME)}
            variant="muted"
            className="text-sm"
          >
            ← {t("backHome")}
          </TextLink>
        </div>
      </div>
    </div>
  );
}
