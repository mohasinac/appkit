import Link from "next/link";
import { productRepository } from "../../../repositories";
import { ROUTES } from "../../../next";
import { getDefaultCurrency } from "../../../core/baseline-resolver";
import {
  Button,
  Container,
  Div,
  Heading,
  Main,
  Row,
  Section,
  Span,
  Stack,
  Text,
} from "../../../ui";
import { PreOrderDetailView } from "../../products/components/PreOrderDetailView";

export interface PreOrderDetailPageViewProps {
  id: string;
}

export async function PreOrderDetailPageView({ id }: PreOrderDetailPageViewProps) {
  const product = await productRepository.findByIdOrSlug(id).catch(() => undefined);

  if (!product) {
    return (
      <Main>
        <Section className="py-20">
          <Container size="md">
            <Stack align="center" gap="md" className="text-center">
              <Heading level={1} className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Pre-Order Not Found
              </Heading>
              <Text className="text-zinc-500">
                The pre-order item you are looking for may have been removed.
              </Text>
              <Link href={String(ROUTES.PUBLIC.PRE_ORDERS)} className="text-sm font-medium text-primary-600 hover:underline">
                Browse Pre-Orders
              </Link>
            </Stack>
          </Container>
        </Section>
      </Main>
    );
  }

  const p = product as Record<string, any>;
  const currency = p.currency || getDefaultCurrency();
  const price =
    typeof p.price === "number"
      ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(p.price)
      : null;

  const images: string[] = Array.isArray(p.images) ? p.images : p.imageUrl ? [p.imageUrl] : [];
  const primaryImage = images[0];

  const reservedCount = typeof p.reservedCount === "number" ? p.reservedCount
    : typeof p.preOrderCurrentCount === "number" ? p.preOrderCurrentCount : 0;
  const reserveTarget = typeof p.reserveTarget === "number" ? p.reserveTarget
    : typeof p.preOrderTarget === "number" ? p.preOrderTarget
    : typeof p.preOrderMaxQuantity === "number" ? p.preOrderMaxQuantity : 0;
  const progressPct = reserveTarget > 0 ? Math.min(100, Math.round((reservedCount / reserveTarget) * 100)) : 0;

  return (
    <PreOrderDetailView
      renderGallery={() =>
        primaryImage ? (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
            <Div
              role="img"
              aria-label={p.name ?? "Pre-order image"}
              className="aspect-square w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${primaryImage})` }}
            />
          </Div>
        ) : (
          <Div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <Div className="flex aspect-square items-center justify-center text-zinc-300 dark:text-zinc-700">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </Div>
          </Div>
        )
      }
      renderInfo={() => (
        <Stack gap="md">
          <Heading level={1} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {p.name ?? "Pre-Order Item"}
          </Heading>
          {price && (
            <Text className="text-2xl font-semibold text-primary-600 dark:text-primary-400">{price}</Text>
          )}
          {p.description && (
            <Text className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {typeof p.description === "string" ? p.description : ""}
            </Text>
          )}
        </Stack>
      )}
      renderBuyBar={() => (
        <Div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Stack gap="sm">
            {reserveTarget > 0 && (
              <Stack gap="xs">
                <Row justify="between" align="center">
                  <Span className="text-xs text-zinc-500">
                    {reservedCount} of {reserveTarget} reserved
                  </Span>
                  <Span className="text-xs font-medium text-primary-600">
                    {progressPct}%
                  </Span>
                </Row>
                <Div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <Div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progressPct}%` }}
                  />
                </Div>
              </Stack>
            )}
            {price && (
              <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{price}</Text>
            )}
            <Button variant="primary" size="md" className="w-full">
              Reserve Now
            </Button>
          </Stack>
        </Div>
      )}
    />
  );
}
