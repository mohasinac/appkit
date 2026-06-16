import { Span, sortBy } from "@mohasinac/appkit";
import React from "react";
import Link from "next/link";
import { ROUTES } from "../../../next/routing/route-map";

const CLS_ICON_SM = "h-3 w-3 shrink-0";
const CLS_ROW_CHEVRON = "h-4 w-4 shrink-0 text-zinc-300 transition group-hover:text-error dark:text-zinc-600";
const CLS_PILL_LINK = "inline-flex items-center gap-1 rounded-full bg-error-surface dark:bg-error-surface px-2.5 py-0.5 text-xs font-medium text-error dark:text-error hover:bg-error-surface transition-colors";
import { Shield, Phone, Wallet, Mail, ChevronRight, Search } from "lucide-react";
import {
  Container,
  Div,
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
import { SCAM_TYPES, SCAM_TYPE_LABELS } from "../constants/scam-types";

const SORT_OPTIONS = [
  { value: sortBy("createdAt", "DESC"), label: "Newest Reports" },
  { value: sortBy("createdAt", "ASC"), label: "Oldest Reports" },
  { value: sortBy("incidentCount", "DESC"), label: "Most Victims" },
  { value: sortBy("amountLost", "DESC"), label: "Highest Loss" },
] as const;

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
              <Text className="truncate" weight="semibold">{name}</Text>
              {aliases.length > 0 && (
                <Text variant="secondary" size="xs">
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
              <Text key={p} variant="secondary" className="flex items-center gap-1" size="xs">
                <Phone className={CLS_ICON_SM} /> {p}
              </Text>
            ))}
            {scammer.upiIds.slice(0, 1).map((u) => (
              <Text key={u} variant="secondary" className="flex items-center gap-1" size="xs">
                <Wallet className={CLS_ICON_SM} /> {u}
              </Text>
            ))}
            {scammer.emails.slice(0, 1).map((e) => (
              <Text key={e} variant="secondary" className="flex items-center gap-1" size="xs">
                <Mail className={CLS_ICON_SM} /> {e}
              </Text>
            ))}
          </Stack>

          <Row justify="between" gap="sm">
            <Text variant="secondary" size="xs">
              {scammer.incidentCount > 0
                ? `${scammer.incidentCount + 1} victims reported`
                : "1 victim reported"}
              {scammer.amountLost ? ` · ${formatPaise(scammer.amountLost)} lost` : ""}
            </Text>
            <ChevronRight className={CLS_ROW_CHEVRON} />
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
  const sort = sp(searchParams, "sort") || "-createdAt";
  const scamType = sp(searchParams, "scamType");
  const pageSize = 20;

  const result = await listVerifiedScammers({ ...searchParams, sort, pageSize: String(pageSize) }).catch(() => ({
    items: [] as ScammerDocument[],
    total: 0,
    page: 1,
    pageSize,
    hasMore: false,
  }));

  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const reportHref = String(ROUTES.PUBLIC.SCAM_REPORT);

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (sort !== "-createdAt") p.set("sort", sort);
    if (scamType) p.set("scamType", scamType);
    p.set("page", String(result.page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    const qs = p.toString();
    return `/scams${qs ? `?${qs}` : ""}`;
  }

  return (
    <Main>
      {/* Site-wide notice: all profiles are moderation-verified */}
      <Div className="border-b appkit-alert--warning" rounded="none">
        <Container padding="y-xs" size="xl" className=".5">
          <Alert variant="warning" compact>
            All profiles on this page have been verified by our moderation team. If you recognise a
            scammer not listed here,{" "}
            <Link href={reportHref} className="font-medium underline hover:no-underline">
              report them
            </Link>
            .
          </Alert>
        </Container>
      </Div>

      <Section padding="y-2xl">
        <Container size="xl">
          <Stack gap="xl">
            {/* Page header */}
            <Row justify="between" gap="md" align="end" wrap>
              <Stack gap="xs">
                <Heading level={1} weight="semibold" size="3xl">
                  Scam Registry
                </Heading>
                <Text variant="secondary" size="sm">
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

            {/* Search + sort + type filter form (GET — SSR-friendly) */}
            {/* audit-raw-form-input-ok: plain GET-form URL search/filter — SSR-friendly */}
            <form method="GET" className="flex flex-wrap gap-3">
              <Div className="flex-1 min-w-48">
                <Input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search name, phone, UPI ID, or email…"
                  icon={<Search className="h-4 w-4" />}
                />
              </Div>
              <select
                name="scamType"
                defaultValue={scamType}
                className="rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All scam types</option>
                {SCAM_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <select
                name="sort"
                defaultValue={sort}
                className="rounded-lg border border-zinc-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Search
              </button>
              {(query || scamType || sort !== "-createdAt") && (
                <Link
                  href={ROUTES.PUBLIC.SCAMS as string}
                  className="rounded-lg border border-zinc-300 dark:border-slate-600 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear
                </Link>
              )}
            </form>

            {/* Active filter chip */}
            {scamType && SCAM_TYPE_LABELS[scamType as keyof typeof SCAM_TYPE_LABELS] && (
              <Row gap="sm" align="center">
                <Text variant="secondary" size="xs">Filtering by:</Text>
                <Link
                  href={buildHref({ scamType: "" })}
                  className={CLS_PILL_LINK}
                >
                  {SCAM_TYPE_LABELS[scamType as keyof typeof SCAM_TYPE_LABELS]}
                  <Span aria-hidden="true">×</Span>
                </Link>
              </Row>
            )}

            {/* Results */}
            {result.items.length === 0 ? (
              <EmptyState
                icon={<Shield className="h-12 w-12" />}
                title={
                  query || scamType
                    ? "No verified scammers matched your filters"
                    : "No verified scammers in the registry yet"
                }
                description={
                  query || scamType
                    ? "Try a different search or clear your filters."
                    : "Verified reports will appear here once reviewed by our moderation team."
                }
              />
            ) : (
              <Stack gap="md">
                <Text variant="secondary" size="sm">
                  {result.total} verified profile{result.total !== 1 ? "s" : ""}
                  {scamType && SCAM_TYPE_LABELS[scamType as keyof typeof SCAM_TYPE_LABELS]
                    ? ` · ${SCAM_TYPE_LABELS[scamType as keyof typeof SCAM_TYPE_LABELS]}`
                    : ""}
                </Text>
                <Grid cols={3} gap="md">
                  {result.items.map((scammer) => (
                    <ScammerCard key={scammer.id} scammer={scammer} />
                  ))}
                </Grid>
              </Stack>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Row justify="center" gap="sm" wrap>
                {result.page > 1 && (
                  <Link href={buildHref({ page: String(result.page - 1) })} className="appkit-button appkit-button--outline appkit-button--sm">← Prev</Link>
                )}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <Link
                      key={p}
                      href={buildHref({ page: String(p) })}
                      className={`appkit-button appkit-button--sm ${p === result.page ? "appkit-button--primary" : "appkit-button--outline"}`}
                    >
                      {p}
                    </Link>
                  );
                })}
                {result.page < totalPages && (
                  <Link href={buildHref({ page: String(result.page + 1) })} className="appkit-button appkit-button--outline appkit-button--sm">Next →</Link>
                )}
              </Row>
            )}
          </Stack>
        </Container>
      </Section>
    </Main>
  );
}
