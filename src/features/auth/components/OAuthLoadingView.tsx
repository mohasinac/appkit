import { Div } from "../../../ui/components/Div";
import { Heading, Text } from "../../../ui/components/Typography";
import { Row } from "../../../ui/components/Layout";
import { AdminComposableRegion } from "../../dashboard/components/AdminComposableRegion";
import type { DashboardCard } from "../../../_internal/shared/features/dashboard/recent-entry";

export interface OAuthLoadingViewProps {
  /** Admin-curated page-region cards (Phase 12). Omit for no extra content. */
  pageRegionCards?: DashboardCard[];
}

export function OAuthLoadingView({ pageRegionCards = [] }: OAuthLoadingViewProps = {}) {
  return (
    <Row className="min-h-[60vh]" padding="x-md" align="center" justify="center">
      <Div className="max-w-sm w-full text-center">
        <Div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin mx-auto mb-6" rounded="full" />
        <Heading level={2} className="mb-2" size="xl" weight="semibold">
          Signing you in…
        </Heading>
        <Text variant="secondary" size="sm">
          Please wait while we complete your sign-in.
        </Text>
        <AdminComposableRegion pageId="auth-oauth-loading" initialCards={pageRegionCards} />
      </Div>
    </Row>
  );
}
