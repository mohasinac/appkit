import React from "react";

const CLS_OUTLINE_BTN = "appkit-button appkit-button--outline appkit-button--md flex w-full items-center gap-2";
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
  Div,
  Heading,
  Main,
  Section,
  Span,
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
import { MediaImage } from "../../media/MediaImage";
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
          <Text className="text-[11px] tracking-wide" weight="medium" transform="uppercase" variant="secondary">
            {label}
          </Text>
          <Text className="truncate" size="sm" weight="medium">{value}</Text>
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScammerHeaderCard({ scammer }: { scammer: ScammerDocument }) {
  return (
    <Card variant="elevated" padding="lg">
      <Stack gap="md">
        <Row justify="between" gap="md" align="start" wrap>
          <Stack gap="xs">
            <Heading level={1} weight="bold" size="2xl">
              {scammer.displayNames[0]}
            </Heading>
            {scammer.displayNames.length > 1 && (
              <Text variant="secondary" size="sm">
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
          <Text variant="secondary" className="flex items-center gap-1.5" size="sm">
            <Eye className="h-4 w-4" />
            {scammer.views} views
          </Text>
          <Text variant="secondary" className="flex items-center gap-1.5" size="sm">
            <Users className="h-4 w-4" />
            {scammer.incidentCount + 1} victim{scammer.incidentCount !== 0 ? "s" : ""} reported
          </Text>
          <Text variant="secondary" className="flex items-center gap-1.5" size="sm">
            <Calendar className="h-4 w-4" />
            Reported {formatDate(scammer.createdAt)}
          </Text>
          {scammer.amountLost ? (
            <Text className="text-[color:var(--appkit-color-danger,theme(colors.red.600))]" size="sm" weight="medium">
              {formatPaise(scammer.amountLost)} lost (primary incident)
            </Text>
          ) : null}
        </Row>
      </Stack>
    </Card>
  );
}

function ScammerIncidentsSection({ incidents }: { incidents: ScammerIncidentDocument[] }) {
  return (
    <Stack gap="sm">
      <Row justify="between" align="center">
        <Heading level={2} size="base" weight="semibold">
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
                <Row justify="between" align="start" gap="sm" wrap>
                  <Row gap="xs" wrap>
                    <Badge variant="warning">
                      {SCAM_TYPE_LABELS[inc.scamType] ?? inc.scamType}
                    </Badge>
                    <Badge variant="default">
                      via {SCAM_PLATFORM_LABELS[inc.scamPlatform] ?? inc.scamPlatform}
                    </Badge>
                  </Row>
                  <Text variant="secondary" size="xs">
                    {formatDate(inc.createdAt)}
                  </Text>
                </Row>
                {inc.itemInvolved && (
                  <Text variant="secondary" size="xs">Item: {inc.itemInvolved}</Text>
                )}
                {inc.amountLost ? (
                  <Text className="text-[color:var(--appkit-color-danger,theme(colors.red.600))]" size="xs" weight="medium">
                    {formatPaise(inc.amountLost)} lost
                  </Text>
                ) : null}
                <Text variant="secondary" className="leading-relaxed" size="sm">
                  {inc.description.length > 200
                    ? `${inc.description.slice(0, 200).trimEnd()}…`
                    : inc.description}
                </Text>
                <Text variant="secondary" size="xs">
                  Reported by: {inc.reportedByAnon ? "Anonymous" : "Verified victim"}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function ScammerCommentsSection({
  comments,
  isAuthenticated,
  scammerId,
}: {
  comments: ScammerCommentDocument[];
  isAuthenticated: boolean;
  scammerId: string;
}) {
  const commentLoginHref = `${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(`/scams/${scammerId}`)}`;
  return (
    <Stack gap="sm">
      <Row justify="between" align="center">
        <Heading level={2} size="base" weight="semibold">
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
            href={commentLoginHref}
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
                    <Text size="sm" weight="medium">{c.authorDisplayName}</Text>
                    {c.authorRole !== "user" && (
                      <Badge variant="default" className="text-[10px]">{c.authorRole}</Badge>
                    )}
                    {c.isAccused && c.isAccusedVerified && (
                      <Badge variant="warning" className="text-[10px]">Accused</Badge>
                    )}
                    {c.isVerifiedVictim && (
                      <Badge variant="success" className="text-[10px]">Verified Victim</Badge>
                    )}
                  </Row>
                  <Text variant="secondary" size="xs">{formatDate(c.createdAt)}</Text>
                </Row>
                <Text variant="secondary" className="leading-relaxed" size="sm">{c.body}</Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function ScammerActionsColumn({
  scammer,
  isAuthenticated,
  reportHref,
  contestLoginHref,
}: {
  scammer: ScammerDocument;
  isAuthenticated: boolean;
  reportHref: string;
  contestLoginHref: string;
}) {
  return (
    <Stack gap="md">
      <Card variant="elevated" padding="md">
        <CardHeader>
          <Heading level={3} className="tracking-wide" size="sm" weight="semibold" transform="uppercase">Actions</Heading>
        </CardHeader>
        <CardBody>
          <Stack gap="sm">
            {isAuthenticated ? (
              <Link
                href={reportHref}
                className={CLS_OUTLINE_BTN}
              >
                <AlertOctagon className="h-4 w-4 text-[color:var(--appkit-color-danger,theme(colors.red.500))]" />
                Report another incident
              </Link>
            ) : (
              <Link
                href={`${String(ROUTES.AUTH.LOGIN)}?redirect=${encodeURIComponent(reportHref)}`}
                className={CLS_OUTLINE_BTN}
              >
                <AlertOctagon className="h-4 w-4 text-[color:var(--appkit-color-danger,theme(colors.red.500))]" />
                Sign in to report an incident
              </Link>
            )}

            {isAuthenticated ? (
              <Link
                href={`/scams/${scammer.id}/contest`}
                className={CLS_OUTLINE_BTN}
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

            <Text variant="secondary" size="xs">
              All contest submissions are reviewed by our moderation team before any changes are made.
            </Text>
          </Stack>
        </CardBody>
      </Card>

      <Card variant="outlined" padding="md">
        <CardHeader>
          <Heading level={3} className="tracking-wide" size="sm" weight="semibold" transform="uppercase">Contest Options</Heading>
        </CardHeader>
        <CardBody>
          <Stack gap="xs" as="ul">
            {Object.entries(CONTEST_TYPE_LABELS).map(([, label]) => (
              <Row key={label} gap="sm" align="start" as="li">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--appkit-color-border,theme(colors.zinc.300))]" />
                <Text variant="secondary" size="xs">{label}</Text>
              </Row>
            ))}
          </Stack>
        </CardBody>
      </Card>

      {scammer.verifiedAt && (
        <Alert variant="success" compact>
          <Row gap="xs" align="center">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <Text size="xs" weight="medium">
              Verified by LetItRip moderation on {formatDate(scammer.verifiedAt)}
            </Text>
          </Row>
        </Alert>
      )}
    </Stack>
  );
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

  const scamTypeDef = getScamType(scammer.scamType);

  return (
    <Main>
      {/* Breadcrumb strip */}
      <Div className="border-b appkit-breadcrumb-strip">
        <Container size="xl" className="py-3">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Scam Registry", href: registryHref },
              { label: scammer.displayNames[0] ?? "Profile" },
            ]}
          />
        </Container>
      </Div>

      <Section className="py-10">
        <Container size="xl">
          <Grid cols="twoThird" gap="lg">
            {/* ── Left column — main profile ───────────────────────────────── */}
            <Stack gap="lg">
              <ScammerHeaderCard scammer={scammer} />

              {(scammer.phones.length > 0 || scammer.upiIds.length > 0 || scammer.emails.length > 0) && (
                <Stack gap="sm">
                  <Heading level={2} size="base" weight="semibold">Contact Identifiers</Heading>
                  <Grid cols={2} gap="sm">
                    {scammer.phones.map((p) => (
                      <IdentityChip key={p} label="Phone" value={p} icon={<Phone className="h-4 w-4" />} />
                    ))}
                    {scammer.upiIds.map((u) => (
                      <IdentityChip key={u} label="UPI ID" value={u} icon={<Wallet className="h-4 w-4" />} />
                    ))}
                    {scammer.emails.map((e) => (
                      <IdentityChip key={e} label="Email" value={e} icon={<Mail className="h-4 w-4" />} />
                    ))}
                  </Grid>
                </Stack>
              )}

              {scammer.socialMedia.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} size="base" weight="semibold">Social Media Profiles</Heading>
                  <Stack gap="xs">
                    {scammer.socialMedia.map((sm, i) => (
                      <Row key={i} gap="sm" align="center">
                        <ExternalLink className="h-4 w-4 shrink-0 text-[color:var(--appkit-color-text-muted,theme(colors.zinc.400))]" />
                        <Text size="sm" weight="medium">
                          {SOCIAL_PLATFORM_LABELS[sm.platform] ?? sm.platform}:
                        </Text>
                        {sm.url ? (
                          <a href={sm.url} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-[color:var(--appkit-color-primary,theme(colors.blue.600))] hover:underline">
                            {sm.handle}
                          </a>
                        ) : (
                          <Text variant="secondary" size="sm">{sm.handle}</Text>
                        )}
                      </Row>
                    ))}
                  </Stack>
                </Stack>
              )}

              {scammer.itemInvolved && (
                <Stack gap="xs">
                  <Heading level={2} size="base" weight="semibold">Item Involved</Heading>
                  <Text variant="secondary" size="sm">{scammer.itemInvolved}</Text>
                </Stack>
              )}

              <Stack gap="sm">
                <Heading level={2} size="base" weight="semibold">What Happened</Heading>
                <Card variant="flat" padding="md">
                  <Text className="leading-relaxed" size="sm">{scammer.description}</Text>
                </Card>
              </Stack>

              {scamTypeDef && scamTypeDef.howToAvoid.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} size="base" weight="semibold">How to Avoid This Scam</Heading>
                  <Card variant="flat" padding="md">
                    <Stack gap="xs" as="ol">
                      {scamTypeDef.howToAvoid.map((tip, i) => (
                        <Row key={i} gap="sm" align="start" as="li">
                          <Span size="xs" weight="bold" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--appkit-color-success,theme(colors.green.600))]/10 text-[color:var(--appkit-color-success,theme(colors.green.700))]">
                            {i + 1}
                          </Span>
                          <Text variant="secondary" className="leading-relaxed" size="sm">{tip}</Text>
                        </Row>
                      ))}
                    </Stack>
                  </Card>
                </Stack>
              )}

              {scammer.evidence.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} size="base" weight="semibold">Evidence</Heading>
                  <Row gap="sm" wrap>
                    {scammer.evidence.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-32 w-32 rounded-lg overflow-hidden border shadow-sm hover:opacity-90">
                        <MediaImage src={url} alt={`Evidence ${i + 1}`} size="thumbnail" />
                      </a>
                    ))}
                  </Row>
                </Stack>
              )}

              <ScammerIncidentsSection incidents={incidents} />
              <ScammerCommentsSection comments={comments} isAuthenticated={isAuthenticated} scammerId={scammer.id} />

              {relatedScammers.length > 0 && (
                <Stack gap="sm">
                  <Heading level={2} size="base" weight="semibold">Related Profiles</Heading>
                  <Stack gap="sm">
                    {relatedScammers.map((rel) => (
                      <Link key={rel.id} href={String(ROUTES.PUBLIC.SCAM_DETAIL(rel.id))} className="block">
                        <Card variant="outlined" padding="sm" className="hover:opacity-80 transition-opacity">
                          <Row gap="sm" align="center" justify="between">
                            <Stack gap="none">
                              <Text size="sm" weight="medium">{rel.displayNames[0]}</Text>
                              <Text variant="secondary" size="xs">
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
            <ScammerActionsColumn
              scammer={scammer}
              isAuthenticated={isAuthenticated}
              reportHref={reportHref}
              contestLoginHref={contestLoginHref}
            />
          </Grid>
        </Container>
      </Section>
    </Main>
  );
}