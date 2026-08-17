import { Accordion, Badge, Button, Row, Stack, Text } from "../../../ui";

export interface LinkedAccountsSectionProps {
  googleLinked?: boolean;
  googleLinkedEmail?: string | null;
  onLinkGoogle: () => void;
  isLinking?: boolean;
}

/** Account-settings slot showing which external providers are connected to
 * this account, with a "Connect Google account" action for password-only
 * users. Mount inside the consumer's own card/section wrapper on the
 * account-settings page. */
export function LinkedAccountsSection({
  googleLinked,
  googleLinkedEmail,
  onLinkGoogle,
  isLinking,
}: LinkedAccountsSectionProps) {
  return (
    <Accordion title="Linked Accounts">
      <Stack gap="md" padding="t-sm">
        <Row align="center" justify="between" gap="md">
          <Stack gap="none">
            <Row align="center" gap="sm">
              <Text size="sm" weight="medium" color="primary">Google</Text>
              {googleLinked && <Badge variant="success" size="sm">Connected</Badge>}
            </Row>
            <Text size="xs" color="muted">
              {googleLinked
                ? `Signed in as ${googleLinkedEmail ?? "your Google account"}. You can also sign in with Google going forward.`
                : "Connect your Google account so you can sign in with either your password or Google."}
            </Text>
          </Stack>
          {!googleLinked && (
            <Button type="button" variant="outline" size="sm" isLoading={isLinking} onClick={onLinkGoogle}>
              Connect Google
            </Button>
          )}
        </Row>
      </Stack>
    </Accordion>
  );
}
