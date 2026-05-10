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
  FileText,
  MessageSquare,
  Link2,
} from "lucide-react";
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
  CardHeader,
  CardBody,
  Badge,
  Alert,
  Breadcrumb,
  EmptyState,
} from "../../../ui";
import type {
  ScammerDocument,
  ScammerIncidentDocument,
  ScammerCommentDocument,
} from "../schemas/firestore";
import {
  SCAM_PLATFORM_LABELS,
  SCAMMER_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  CONTEST_TYPE_LABELS,
} from "../schemas/firestore";
import { SCAM_TYPE_LABELS, getScamType } from "../constants/scam-types";
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

function IdentityChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card variant="outlined" padding="sm">
      <Row gap="sm" align="center">
        <span className="text-[color:var(--appkit-color-text-muted,theme(colors.zinc.400))]">
          {icon}
        </span>
        <Stack gap="none">
          <Text className="text-[11px] font-medium uppercase tracking-wide" variant="secondary">
            {label}
          </Text>
          <Text className="truncate text-sm font-medium">{value}</Text>
        </Stack>
      </Row>
    </Card>
  );
}

function statusVariant(
  status: string,
): "danger" | "warning" | "default" | "inactive" {
  if (status === "verified") return "danger";
  if (status === "pending_review") return "warning";
  return "inactive";
}

export interface ScamProfileViewProps {
  scammer: ScammerDocument;
  /** When true the contest/report buttons are direct links; otherwise show sign-in prompts. */
  isAuthenticated: boolean;
  incidents?: ScammerIncidentDocument[];
  comments?: ScammerCommentDocument[];
  relatedScammers?: ScammerDocument[];
}

export function ScamProfileView({
  scammer,
  isAuthenticated,
  incidents = [],
  comments = [],
  relatedScammers = [],
}: ScamProfileViewProps) {
  const reportHref = String(ROUTES.PUBLIC.SCAM_REPORT);
  const registryHref = String(ROUTES.PUBLIC.SCAMS);
  const contestLoginHref = `${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(`/scams/${scammer.id}`)}`;

  return (
    <Main>
      {/* Breadcrumb strip */}
      <div className="border-b appkit-breadcrumb-strip">
        <Container size="xl" className="py-3">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Scam Registry", href: registryHref },
              { label: scammer.displayNames[0] ?? "Profile" },
            ]}
          />
        </Container>
      </div>

      <Section className="py-10">
        <Container size="xl">
          <Grid cols="twoThird" gap="lg">
            {/* ── Left column — main profile ───────────────────────────────── */}
            <Stack gap="lg">
              {/* Header card */}
              <Card variant="elevated" padding="lg">
                <Stack gap="md">
                  <Row justify="between" gap="md" align="start" className="flex-wrap">
                    <Stack gap="xs">
                      <Heading level={1} className="text-2xl font-bold">
                        {scammer.displayNames[0]}
                      </Heading>
                      {scammer.displayNames.length > 1 && (
                        <Text variant="secondary" className="text-sm">
                          Also known as: {scammer.displayNames.slice(1).join(", ")}
                        </Text>
                      )}
                    </Stack>
                    <Badge variant={statusVariant(scammer.status)}>
                      {SCAMMER_STATUS_LABELS[scammer.status] ?? scammer.status}
                    </Badge>
                  </Row>

                  <Row gap="xs" wrap>
                    <Badge variant="warning">
                      {SCAM_TYPE_LABELS[scammer.scamType] ?? scammer.scamType}
                    </Badge>
                    <Badge variant="default">
                      via {SCAM_PLATFORM_LABELS[scammer.scamPlatform] ?? scammer.scamPlatform}
                    </Badge>
                    {scammer.tags.includes("repeat_offender") && (
                      <Badge variant="danger">Repeat Offender</Badge>
                    )}
                  </Row>

                  <Row gap="md" wrap>
                    <Text variant="secondary" className="flex items-center gap-1.5 text-sm">
                      <Eye className="h-4 w-4" />
                      {scammer.views} views
                    </Text>
                    <Text variant="secondary" className="flex items-center gap-1.5 text-sm">
                      <Users className="h-4 w-4" />
                      {scammer.incidentCount + 1} victim
                      {scammer.incidentCount !== 0 ? "s" : ""} reported
                    </Text>
                    <Text variant="secondary" className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-4 w-4" />
                      Reported {formatDate(scammer.createdAt)}
                    </Text>
                    {scammer.amountLost ? (
                      <Text className="text-sm font-medium text-[color:var(--appkit-color-danger,theme(colors.red.600))]">
                        {formatPaise(scammer.amountLost)} lost (primary incident)
                      </Text>
                    ) : null}
                  </Row>
                </Stack>
              </Card>

              {/* Contact identifiers — plaintext for SEO */}
              {(scammer.phones.length > 0 ||
                scammer.upiIds.length > 0 ||
                scammer.emails.length > 0) && (
                <Stack gap="sm">
                  <Heading level={2} className="text-base font-semibold">
                    Contact Identifiers
                  </Heading>
                  <Grid cols={2} gap="sm">
                    {scammer.phones.map((p) => (
                      <IdentityChip
                        key={p}
                        label="Phone"
                        value={p}
                        icon={<Phone className="h-4 w-4" />}
                      />
                    ))}
                    {scammer.upiIds.map((u) => (
                      <IdentityChip
                        key={u}
                        label="UPI ID"
                        value={u}
                        icon={<Wallet className="h-4 w-4" />}
                      />
                    ))}
                    {scammer.emails.map((e) => (
                      <IdentityChip
                        key={e}
                        label="Email"
                        value={e}
                        icon={<Mail className="h-4 w-4" />}
                      />
                    ))}
                  </Grid>
                </Stack>
              )}

              {/* Social media profiles */}
              {scammer.socialMedia.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} className="text-base font-semibold">
                    Social Media Profiles
                  </Heading>
                  <Stack gap="xs">
                    {scammer.socialMedia.map((sm, i) => (
                      <Row key={i} gap="sm" align="center">
                        <ExternalLink className="h-4 w-4 shrink-0 text-[color:var(--appkit-color-text-muted,theme(colors.zinc.400))]" />
                        <Text className="text-sm font-medium">
                          {SOCIAL_PLATFORM_LABELS[sm.platform] ?? sm.platform}:
                        </Text>
                        {sm.url ? (
                          <a
                            href={sm.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[color:var(--appkit-color-primary,theme(colors.blue.600))] hover:underline"
                          >
                            {sm.handle}
                          </a>
                        ) : (
                          <Text variant="secondary" className="text-sm">
                            {sm.handle}
                          </Text>
                        )}
                      </Row>
                    ))}
                  </Stack>
                </Stack>
              )}

              {/* Item involved */}
              {scammer.itemInvolved && (
                <Stack gap="xs">
                  <Heading level={2} className="text-base font-semibold">
                    Item Involved
                  </Heading>
                  <Text variant="secondary" className="text-sm">
                    {scammer.itemInvolved}
                  </Text>
                </Stack>
              )}

              {/* Incident description */}
              <Stack gap="sm">
                <Heading level={2} className="text-base font-semibold">
                  What Happened
                </Heading>
                <Card variant="flat" padding="md">
                  <Text className="text-sm leading-relaxed">{scammer.description}</Text>
                </Card>
              </Stack>

              {/* How to Avoid */}
              {(() => {
                const scamTypeDef = getScamType(scammer.scamType);
                if (!scamTypeDef || scamTypeDef.howToAvoid.length === 0) return null;
                return (
                  <Stack gap="sm">
                    <Heading level={2} className="text-base font-semibold">
                      How to Avoid This Scam
                    </Heading>
                    <Card variant="flat" padding="md">
                      <Stack gap="xs" as="ol">
                        {scamTypeDef.howToAvoid.map((tip, i) => (
                          <Row key={i} gap="sm" align="start" as="li">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--appkit-color-success,theme(colors.green.600))]/10 text-xs font-bold text-[color:var(--appkit-color-success,theme(colors.green.700))]">
                              {i + 1}
                            </span>
                            <Text variant="secondary" className="text-sm leading-relaxed">
                              {tip}
                            </Text>
                          </Row>
                        ))}
                      </Stack>
                    </Card>
                  </Stack>
                );
              })()}

              {/* Evidence images */}
              {scammer.evidence.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} className="text-base font-semibold">
                    Evidence
                  </Heading>
                  <Row gap="sm" wrap>
                    {scammer.evidence.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="h-32 w-auto rounded-lg border object-cover shadow-sm hover:opacity-90"
                        />
                      </a>
                    ))}
                  </Row>
                </Stack>
              )}
              {/* Additional Incidents */}
              <Stack gap="sm">
                <Row justify="between" align="center">
                  <Heading level={2} className="text-base font-semibold">
                    Additional Incidents{incidents.length > 0 && ` (${incidents.length})`}
                  </Heading>
                </Row>
                {incidents.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    title="No additional incidents yet"
                    description="Other victims' verified reports linked to this profile will appear here."
                  />
                ) : (
                  <Stack gap="sm">
                    {incidents.map((inc) => (
                      <Card key={inc.id} variant="outlined" padding="md">
                        <Stack gap="xs">
                          <Row justify="between" align="start" gap="sm" className="flex-wrap">
                            <Row gap="xs" wrap>
                              <Badge variant="warning">
                                {SCAM_TYPE_LABELS[inc.scamType] ?? inc.scamType}
                              </Badge>
                              <Badge variant="default">
                                via {SCAM_PLATFORM_LABELS[inc.scamPlatform] ?? inc.scamPlatform}
                              </Badge>
                            </Row>
                            <Text variant="secondary" className="text-xs">
                              {formatDate(inc.createdAt)}
                            </Text>
                          </Row>
                          {inc.itemInvolved && (
                            <Text variant="secondary" className="text-xs">
                              Item: {inc.itemInvolved}
                            </Text>
                          )}
                          {inc.amountLost ? (
                            <Text className="text-xs font-medium text-[color:var(--appkit-color-danger,theme(colors.red.600))]">
                              {formatPaise(inc.amountLost)} lost
                            </Text>
                          ) : null}
                          <Text variant="secondary" className="text-sm leading-relaxed">
                            {inc.description.length > 200
                              ? `${inc.description.slice(0, 200).trimEnd()}…`
                              : inc.description}
                          </Text>
                          <Text variant="secondary" className="text-xs">
                            Reported by: {inc.reportedByAnon ? "Anonymous" : "Verified victim"}
                          </Text>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>

              {/* Community Discussion */}
              <Stack gap="sm">
                <Row justify="between" align="center">
                  <Heading level={2} className="text-base font-semibold">
                    Community Discussion{comments.length > 0 && ` (${comments.length})`}
                  </Heading>
                  {isAuthenticated ? (
                    <Link
                      href={String(ROUTES.PUBLIC.SCAM_REPORT)}
                      className="text-xs text-[color:var(--appkit-color-primary,theme(colors.blue.600))] hover:underline"
                    >
                      Leave a comment
                    </Link>
                  ) : (
                    <Link
                      href={`${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(`/scams/${scammer.id}`)}`}
                      className="text-xs text-[color:var(--appkit-color-primary,theme(colors.blue.600))] hover:underline"
                    >
                      Sign in to comment
                    </Link>
                  )}
                </Row>
                {comments.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare className="h-8 w-8" />}
                    title="No comments yet"
                    description="Community comments and victim testimonials appear here."
                  />
                ) : (
                  <Stack gap="sm">
                    {comments.map((c) => (
                      <Card key={c.id} variant="flat" padding="md">
                        <Stack gap="xs">
                          <Row justify="between" align="center" gap="sm">
                            <Row gap="xs" align="center">
                              <Text className="text-sm font-medium">{c.authorDisplayName}</Text>
                              {c.authorRole !== "user" && (
                                <Badge variant="default" className="text-[10px]">
                                  {c.authorRole}
                                </Badge>
                              )}
                              {c.isAccused && c.isAccusedVerified && (
                                <Badge variant="warning" className="text-[10px]">Accused</Badge>
                              )}
                              {c.isVerifiedVictim && (
                                <Badge variant="success" className="text-[10px]">Verified Victim</Badge>
                              )}
                            </Row>
                            <Text variant="secondary" className="text-xs">
                              {formatDate(c.createdAt)}
                            </Text>
                          </Row>
                          <Text variant="secondary" className="text-sm leading-relaxed">
                            {c.body}
                          </Text>
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>

              {/* Related Profiles */}
              {relatedScammers.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} className="text-base font-semibold">
                    Related Profiles
                  </Heading>
                  <Stack gap="sm">
                    {relatedScammers.map((rel) => (
                      <Link
                        key={rel.id}
                        href={String(ROUTES.PUBLIC.SCAM_DETAIL(rel.id))}
                        className="block"
                      >
                        <Card variant="outlined" padding="sm" className="hover:opacity-80 transition-opacity">
                          <Row gap="sm" align="center" justify="between">
                            <Stack gap="none">
                              <Text className="text-sm font-medium">{rel.displayNames[0]}</Text>
                              <Text variant="secondary" className="text-xs">
                                {SCAM_TYPE_LABELS[rel.scamType] ?? rel.scamType}
                              </Text>
                            </Stack>
                            <Row gap="xs" align="center">
                              <Badge variant={statusVariant(rel.status)}>
                                {SCAMMER_STATUS_LABELS[rel.status] ?? rel.status}
                              </Badge>
                              <Link2 className="h-4 w-4 text-[color:var(--appkit-color-text-muted,theme(colors.zinc.400))]" />
                            </Row>
                          </Row>
                        </Card>
                      </Link>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Stack>

            {/* ── Right column — actions + meta ───────────────────────────── */}
            <Stack gap="md">
              {/* Actions card */}
              <Card variant="elevated" padding="md">
                <CardHeader>
                  <Heading level={3} className="text-sm font-semibold uppercase tracking-wide">
                    Actions
                  </Heading>
                </CardHeader>
                <CardBody>
                  <Stack gap="sm">
                    {isAuthenticated ? (
                      <Link
                        href={reportHref}
                        className="appkit-button appkit-button--outline appkit-button--md flex w-full items-center gap-2"
                      >
                        <AlertOctagon className="h-4 w-4 text-[color:var(--appkit-color-danger,theme(colors.red.500))]" />
                        Report another incident
                      </Link>
                    ) : (
                      <Link
                        href={`${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(reportHref)}`}
                        className="appkit-button appkit-button--outline appkit-button--md flex w-full items-center gap-2"
                      >
                        <AlertOctagon className="h-4 w-4 text-[color:var(--appkit-color-danger,theme(colors.red.500))]" />
                        Sign in to report an incident
                      </Link>
                    )}

                    {isAuthenticated ? (
                      <Link
                        href={`/scams/${scammer.id}/contest`}
                        className="appkit-button appkit-button--outline appkit-button--md flex w-full items-center gap-2"
                      >
                        <Flag className="h-4 w-4 text-[color:var(--appkit-color-warning,theme(colors.amber.500))]" />
                        Contest this profile
                      </Link>
                    ) : (
                      <Link
                        href={contestLoginHref}
                        className="appkit-button appkit-button--ghost appkit-button--md flex w-full items-center gap-2"
                      >
                        <Flag className="h-4 w-4" />
                        Sign in to contest
                      </Link>
                    )}

                    <Text variant="secondary" className="text-xs">
                      All contest submissions are reviewed by our moderation team before any changes
                      are made.
                    </Text>
                  </Stack>
                </CardBody>
              </Card>

              {/* Contest types reference */}
              <Card variant="outlined" padding="md">
                <CardHeader>
                  <Heading level={3} className="text-sm font-semibold uppercase tracking-wide">
                    Contest Options
                  </Heading>
                </CardHeader>
                <CardBody>
                  <Stack gap="xs" as="ul">
                    {Object.entries(CONTEST_TYPE_LABELS).map(([, label]) => (
                      <Row key={label} gap="sm" align="start" as="li">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--appkit-color-border,theme(colors.zinc.300))]" />
                        <Text variant="secondary" className="text-xs">
                          {label}
                        </Text>
                      </Row>
                    ))}
                  </Stack>
                </CardBody>
              </Card>

              {/* Verification meta */}
              {scammer.verifiedAt && (
                <Alert variant="success" compact>
                  <Row gap="xs" align="center">
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <Text className="text-xs font-medium">
                      Verified by LetItRip moderation on {formatDate(scammer.verifiedAt)}
                    </Text>
                  </Row>
                </Alert>
              )}
            </Stack>
          </Grid>
        </Container>
      </Section>
    </Main>
  );
}
