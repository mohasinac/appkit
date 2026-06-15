import { Div, Heading, Row, Text } from "../../../ui";
export function OAuthLoadingView() {
  return (
    <Row className="min-h-[60vh] px-4" align="center" justify="center">
      <Div className="max-w-sm w-full text-center">
        <Div className="w-12 h-12 border-4 border-primary border-t-transparent animate-spin mx-auto mb-6" rounded="full" />
        <Heading level={2} className="mb-2" size="xl" weight="semibold">
          Signing you in…
        </Heading>
        <Text variant="secondary" size="sm">
          Please wait while we complete your sign-in.
        </Text>
      </Div>
    </Row>
  );
}
