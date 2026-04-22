import { Div, Heading, Text } from "../../../ui";

export function OAuthLoadingView() {
  return (
    <Div className="flex items-center justify-center min-h-[60vh] px-4">
      <Div className="max-w-sm w-full text-center">
        <Div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-6" />
        <Heading level={2} className="text-xl font-semibold mb-2">
          Signing you in…
        </Heading>
        <Text variant="secondary" className="text-sm">
          Please wait while we complete your sign-in.
        </Text>
      </Div>
    </Div>
  );
}
