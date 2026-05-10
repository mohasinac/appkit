import React from "react";
import Link from "next/link";
import {
  Shield,
  Phone,
  Wallet,
  Mail,
  AlertOctagon,
  Flag,
  Eye,
  Users,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Container, Heading, Main, Section, Text } from "../../../ui";
import type { ScammerDocument } from "../schemas/firestore";
import {
  SCAM_PLATFORM_LABELS,
  SCAMMER_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  CONTEST_TYPE_LABELS,
} from "../schemas/firestore";
import { SCAM_TYPE_LABELS } from "../constants/scam-types";
import { ROUTES } from "../../../next/routing/route-map";

function formatDate(d: Date | string | undefined): string {
  if (!d) return "";
  try {
    return new Date(d as string).toLocaleDateString("en-IN", { dateStyle: "medium" });
  } catch {
    return String(d);
  }
}

function formatPaise(paise: number | undefined): string {
  if (!paise) return "";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function IdentityChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
      <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</p>
        <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

export interface ScamProfileViewProps {
  scammer: ScammerDocument;
  /** When true, the Contest button links to the report page; when false shows login-required note. */
  isAuthenticated: boolean;
}

export function ScamProfileView({ scammer, isAuthenticated }: ScamProfileViewProps) {
  const reportHref = String(ROUTES.PUBLIC.SCAM_REPORT);
  const registryHref = String(ROUTES.PUBLIC.SCAMS);

  const statusColor: Record<string, string> = {
    verified: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    rejected: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    removed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  };

  const contestLoginHref = `${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(`/scams/${scammer.id}`)}`;

  return (
    <Main>
      {/* Breadcrumb */}
      <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700/60 dark:bg-zinc-900/60">
        <Container size="xl" className="flex items-center gap-2 py-3 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-200">Home</Link>
          <span>/</span>
          <Link href={registryHref} className="hover:text-zinc-700 dark:hover:text-zinc-200">Scam Registry</Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-zinc-200 truncate">{scammer.displayNames[0]}</span>
        </Container>
      </div>

      <Section className="py-10">
        <Container size="xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

            {/* ── Left column — main profile ──────────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-8">

              {/* Header card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <Heading level={1} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {scammer.displayNames[0]}
                    </Heading>
                    {scammer.displayNames.length > 1 && (
                      <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Also known as: {scammer.displayNames.slice(1).join(", ")}
                      </Text>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor[scammer.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                    {SCAMMER_STATUS_LABELS[scammer.status] ?? scammer.status}
                  </span>
                </div>

                {/* Scam classification */}
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
                    {SCAM_TYPE_LABELS[scammer.scamType] ?? scammer.scamType}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    via {SCAM_PLATFORM_LABELS[scammer.scamPlatform] ?? scammer.scamPlatform}
                  </span>
                  {scammer.tags.includes("repeat_offender") && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                      Repeat Offender
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" />{scammer.views} views</span>
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{scammer.incidentCount + 1} victim{scammer.incidentCount !== 0 ? "s" : ""} reported</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Reported {formatDate(scammer.createdAt)}</span>
                  {scammer.amountLost ? (
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatPaise(scammer.amountLost)} lost (primary incident)
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Contact identifiers — plaintext for SEO */}
              {(scammer.phones.length > 0 || scammer.upiIds.length > 0 || scammer.emails.length > 0) && (
                <div>
                  <Heading level={2} className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    Contact Identifiers
                  </Heading>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {scammer.phones.map((p) => (
                      <IdentityChip key={p} label="Phone" value={p} icon={<Phone className="h-4 w-4" />} />
                    ))}
                    {scammer.upiIds.map((u) => (
                      <IdentityChip key={u} label="UPI ID" value={u} icon={<Wallet className="h-4 w-4" />} />
                    ))}
                    {scammer.emails.map((e) => (
                      <IdentityChip key={e} label="Email" value={e} icon={<Mail className="h-4 w-4" />} />
                    ))}
                  </div>
                </div>
              )}

              {/* Social media */}
              {scammer.socialMedia.length > 0 && (
                <div>
                  <Heading level={2} className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    Social Media Profiles
                  </Heading>
                  <div className="flex flex-col gap-2">
                    {scammer.socialMedia.map((sm, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <ExternalLink className="h-4 w-4 shrink-0 text-zinc-400" />
                        <span className="font-medium">{SOCIAL_PLATFORM_LABELS[sm.platform] ?? sm.platform}:</span>
                        {sm.url ? (
                          <a href={sm.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                            {sm.handle}
                          </a>
                        ) : (
                          <span>{sm.handle}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Item involved */}
              {scammer.itemInvolved && (
                <div>
                  <Heading level={2} className="mb-1 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    Item Involved
                  </Heading>
                  <Text className="text-sm text-zinc-600 dark:text-zinc-300">{scammer.itemInvolved}</Text>
                </div>
              )}

              {/* Description */}
              <div>
                <Heading level={2} className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                  What Happened
                </Heading>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                  {scammer.description}
                </div>
              </div>

              {/* Evidence images */}
              {scammer.evidence.length > 0 && (
                <div>
                  <Heading level={2} className="mb-3 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    Evidence
                  </Heading>
                  <div className="flex flex-wrap gap-3">
                    {scammer.evidence.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="h-32 w-auto rounded-lg border border-zinc-200 object-cover shadow-sm hover:opacity-90 dark:border-zinc-700"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column — actions + meta ───────────────────────────────── */}
            <div className="flex flex-col gap-5">

              {/* Report / Contest card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <Heading level={3} className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Actions
                </Heading>
                <div className="flex flex-col gap-3">
                  {/* Report another incident */}
                  {isAuthenticated ? (
                    <Link
                      href={reportHref}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-red-700 dark:hover:bg-red-900/20"
                    >
                      <AlertOctagon className="h-4 w-4 text-red-500" />
                      Report another incident
                    </Link>
                  ) : (
                    <Link
                      href={`${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(reportHref)}`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-red-700 dark:hover:bg-red-900/20"
                    >
                      <AlertOctagon className="h-4 w-4 text-red-500" />
                      Sign in to report an incident
                    </Link>
                  )}

                  {/* Contest this profile */}
                  {isAuthenticated ? (
                    <Link
                      href={`/scams/${scammer.id}/contest`}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-600 hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-amber-700 dark:hover:bg-amber-900/20"
                    >
                      <Flag className="h-4 w-4 text-amber-500" />
                      Contest this profile
                    </Link>
                  ) : (
                    <Link
                      href={contestLoginHref}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800"
                    >
                      <Flag className="h-4 w-4" />
                      Sign in to contest
                    </Link>
                  )}
                </div>

                <Text className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
                  All contest submissions are reviewed by our moderation team before any changes are made.
                </Text>
              </div>

              {/* Contest types reference */}
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <Heading level={3} className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Contest Options
                </Heading>
                <ul className="flex flex-col gap-2">
                  {Object.entries(CONTEST_TYPE_LABELS).map(([, label]) => (
                    <li key={label} className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Verified meta */}
              {scammer.verifiedAt && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-950/20">
                  <Text className="text-xs font-medium text-green-700 dark:text-green-400">
                    <Shield className="mr-1 inline h-3.5 w-3.5" />
                    Verified by LetItRip moderation on {formatDate(scammer.verifiedAt)}
                  </Text>
                </div>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </Main>
  );
}
