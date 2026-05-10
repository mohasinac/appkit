import React from "react";
import Link from "next/link";
import { Shield, AlertTriangle, Phone, Wallet, Mail, ChevronRight, Search } from "lucide-react";
import { Container, Heading, Main, Section, Text } from "../../../ui";
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
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-red-600"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {name}
          </span>
          {aliases.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Also known as: {aliases.join(", ")}
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
          Verified
        </span>
      </div>

      {/* Scam type badge */}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {SCAM_TYPE_LABELS[scammer.scamType] ?? scammer.scamType}
        </span>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {SCAM_PLATFORM_LABELS[scammer.scamPlatform] ?? scammer.scamPlatform}
        </span>
      </div>

      {/* Contact identifiers — SEO plaintext */}
      <div className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        {scammer.phones.slice(0, 2).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <Phone className="h-3 w-3 shrink-0" /> {p}
          </span>
        ))}
        {scammer.upiIds.slice(0, 1).map((u) => (
          <span key={u} className="flex items-center gap-1">
            <Wallet className="h-3 w-3 shrink-0" /> {u}
          </span>
        ))}
        {scammer.emails.slice(0, 1).map((e) => (
          <span key={e} className="flex items-center gap-1">
            <Mail className="h-3 w-3 shrink-0" /> {e}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          {scammer.incidentCount > 0 ? `${scammer.incidentCount + 1} victims reported` : "1 victim reported"}
          {scammer.amountLost ? ` · ${formatPaise(scammer.amountLost)} lost` : ""}
        </span>
        <ChevronRight className="h-4 w-4 text-zinc-300 transition group-hover:text-red-500 dark:text-zinc-600" />
      </div>
    </Link>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <Shield className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
      <Heading level={3} className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
        {query ? "No verified scammers matched your search" : "No verified scammers in the registry yet"}
      </Heading>
      <Text className="max-w-sm text-sm text-zinc-400 dark:text-zinc-500">
        {query
          ? "Try a different name, phone number, or UPI ID."
          : "Verified reports will appear here once reviewed by our moderation team."}
      </Text>
    </div>
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
      {/* Warning banner */}
      <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30">
        <Container size="xl" className="flex items-center gap-3 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <Text className="text-amber-700 dark:text-amber-300">
            All profiles on this page have been verified by our moderation team.
            If you recognise a scammer not listed here,{" "}
            <Link href={reportHref} className="font-medium underline hover:no-underline">
              report them
            </Link>
            .
          </Text>
        </Container>
      </div>

      <Section className="py-10">
        <Container size="xl">
          {/* Page header */}
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Heading level={1} className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                Scam Registry
              </Heading>
              <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Verified scammers active in India's collectibles community. Search by name, phone, or UPI.
              </Text>
            </div>
            <Link
              href={reportHref}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600"
            >
              <Shield className="h-4 w-4" />
              Report a Scammer
            </Link>
          </div>

          {/* Search form */}
          <form method="GET" className="mb-6">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search name, phone number, UPI ID, or email…"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-red-600 dark:focus:ring-red-900/30"
              />
            </div>
          </form>

          {/* Stats summary */}
          {result.total > 0 && (
            <Text className="mb-6 text-sm text-zinc-400 dark:text-zinc-500">
              {result.total} verified profile{result.total !== 1 ? "s" : ""}
            </Text>
          )}

          {/* Grid */}
          {result.items.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((scammer) => (
                <ScammerCard key={scammer.id} scammer={scammer} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {result.hasMore && (
            <div className="mt-10 flex justify-center">
              <Link
                href={`/scams?page=${result.page + 1}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className="rounded-lg border border-zinc-300 bg-white px-6 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Load more
              </Link>
            </div>
          )}
        </Container>
      </Section>
    </Main>
  );
}
