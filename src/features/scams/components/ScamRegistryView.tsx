import React from "react";
import Link from "next/link";

const CLS_ICON_SM = "h-3 w-3 shrink-0";
import { Shield, Phone, Wallet, Mail, ChevronRight, Search } from "lucide-react";
import {
  Container,
  Heading,
  Main,
  Section,
  Text,
  Grid,
  Stack,
  Row,
  Card,
  Badge,
  Alert,
  EmptyState,
  Input,
} from "../../../ui";
import { listVerifiedScammers } from "../actions/scam-actions";
import type { ScammerDocument } from "../schemas/firestore";
import { SCAM_PLATFORM_LABELS } from "../schemas/firestore";
import { SCAM_TYPE_LABELS } from "../constants/scam-types";
import { ROUTES } from "../../../next/routing/route-map";

type SearchParams = Record<string, string | string[]>;

function sp(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function formatPaise(paise: number | undefined): string {
  if (!paise) return "";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function ScammerCard({ scammer }: { scammer: ScammerDocument }) {
  const href = String((ROUTES.PUBLIC.SCAM_DETAIL as (id: string) => string)(scammer.id));
  const name = scammer.displayNames[0] ?? "Unknown";
  const aliases = scammer.displayNames.slice(1);

  return (
    <Link href={href} className="group block">
      <Card variant="outlined" hover padding="md">
        <Stack gap="sm">
          <Row justify="between" gap="sm" align="start">
            <Stack gap="xs" className="min-w-0">
              <Text className="truncate font-semibold">{name}</Text>
              {aliases.length > 0 && (
                <Text variant="secondary" className="text-xs">
                  Also known as: {aliases.join(", ")}
                </Text>
              )}
            </Stack>
            <Badge variant="danger">Verified</Badge>
          </Row>

          <Row gap="xs" wrap>
            <Badge variant="warning">
              {SCAM_TYPE_LABELS[scammer.scamType] ?? scammer.scamType}
            </Badge>
            <Badge variant="default">
              {SCAM_PLATFORM_LABELS[scammer.scamPlatform] ?? scammer.scamPlatform}
            </Badge>
          </Row>

          {/* Contact identifiers rendered as plaintext for SEO */}
          <Stack gap="xs">
            {scammer.phones.slice(0, 2).map((p) => (
              <Text key={p} variant="secondary" className="flex items-center gap-1 text-xs">
                <Phone className={CLS_ICON_SM} /> {p}
              </Text>
            ))}
            {scammer.upiIds.slice(0, 1).map((u) => (
              <Text key={u} variant="secondary" className="flex items-center gap-1 text-xs">
                <Wallet className={CLS_ICON_SM} /> {u}
              </Text>
            ))}
            {scammer.emails.slice(0, 1).map((e) => (
              <Text key={e} variant="secondary" className="flex items-center gap-1 text-xs">
                <Mail className={CLS_ICON_SM} /> {e}
              </Text>
            ))}
          </Stack>

          <Row justify="between" gap="sm">
            <Text variant="secondary" className="text-xs">
              {scammer.incidentCount > 0
                ? `${scammer.incidentCount + 1} victims reported`
                : "1 victim reported"}
              {scammer.amountLost ? ` · ${formatPaise(scammer.amountLost)} lost` : ""}
            </Text>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:text-red-500 dark:text-zinc-600" />
          </Row>
        </Stack>
      </Card>
    </Link>
  );
}

export interface ScamRegistryViewProps {
  searchParams?: SearchParams;
}

export async function ScamRegistryView({ searchParams = {} }: ScamRegistryViewProps) {
  const query = sp(searchParams, "q");

  const result = await listVerifiedScammers(searchParams).catch(() => ({
    items: [] as ScammerDocument[],
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
  }));

  const reportHref = String(ROUTES.PUBLIC.SCAM_REPORT);

  return (
    <Main>
      {/* Site-wide notice: all profiles are moderation-verified */}
      <div className="border-b appkit-alert--warning rounded-none">
        <Container size="xl" className="py-2.5">
          <Alert variant="warning" compact>
            All profiles on this page have been verified by our moderation team. If you recognise a
            scammer not listed here,{" "}
            <Link href={reportHref} className="font-medium underline hover:no-underline">
              report them
            </Link>
            .
          </Alert>
        </Container>
      </div>

      <Section className="py-10">
        <Container size="xl">
          <Stack gap="xl">
            {/* Page header */}
            <Row justify="between" gap="md" align="end" className="flex-wrap">
              <Stack gap="xs">
                <Heading level={1} className="text-3xl font-semibold">
                  Scam Registry
                </Heading>
                <Text variant="secondary" className="text-sm">
                  Verified scammers active in India&apos;s collectibles community. Search by name,
                  phone, or UPI.
                </Text>
              </Stack>
              <Link
                href={reportHref}
                className="appkit-button appkit-button--danger appkit-button--md shrink-0"
              >
                <Shield className="h-4 w-4" />
                Report a Scammer
              </Link>
            </Row>

            {/* Search form */}
            <form method="GET" className="max-w-xl">
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search name, phone number, UPI ID, or email…"
                icon={<Search className="h-4 w-4" />}
              />
            </form>

            {/* Results */}
            {result.items.length === 0 ? (
              <EmptyState
                icon={<Shield className="h-12 w-12" />}
                title={
                  query
                    ? "No verified scammers matched your search"
                    : "No verified scammers in the registry yet"
                }
                description={
                  query
                    ? "Try a different name, phone number, or UPI ID."
                    : "Verified reports will appear here once reviewed by our moderation team."
                }
              />
            ) : (
              <Stack gap="md">
                {result.total > 0 && (
                  <Text variant="secondary" className="text-sm">
                    {result.total} verified profile{result.total !== 1 ? "s" : ""}
                  </Text>
                )}
                <Grid cols={3} gap="md">
                  {result.items.map((scammer) => (
                    <ScammerCard key={scammer.id} scammer={scammer} />
                  ))}
                </Grid>
              </Stack>
            )}

            {/* Pagination */}
            {result.hasMore && (
              <Row justify="center">
                <Link
                  href={`/scams?page=${result.page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  className="appkit-button appkit-button--outline appkit-button--md"
                >
                  Load more
                </Link>
              </Row>
            )}
          </Stack>
        </Container>
      </Section>
    </Main>
  );
}
