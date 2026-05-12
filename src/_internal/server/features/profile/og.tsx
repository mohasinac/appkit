import type { ReactElement } from "react";

export interface UserProfileOgData {
  displayName: string;
  photoURL?: string | null;
  roleLabel?: string | null;
}

export function renderPrivateProfileOgImage(siteName: string): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0f172a",
        fontFamily: "sans-serif",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 700, color: "#f1f5f9" }}>{siteName}</div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  seller: "Seller",
  buyer: "Buyer",
  user: "Member",
};

interface UserDocLike {
  displayName?: string | null;
  photoURL?: string | null;
  role?: string | null;
  publicProfile?: { isPublic?: boolean | null } | null;
}

/**
 * High-level OG renderer — accepts the raw user document from `getPublicUserProfile`.
 * Returns the private-profile fallback when the user is missing or has opted out.
 */
export function renderProfileOg(
  doc: UserDocLike | null | undefined,
  opts: { siteName: string; roleLabels?: Record<string, string>; memberLabel?: string },
): ReactElement {
  const isPublic = doc?.publicProfile?.isPublic !== false;
  if (!doc || !isPublic) return renderPrivateProfileOgImage(opts.siteName);
  const labels = { ...ROLE_LABEL, ...(opts.roleLabels ?? {}) };
  const memberLabel = opts.memberLabel ?? "Member";
  return renderUserProfileOgImage(
    {
      displayName: doc.displayName ?? `${opts.siteName} ${memberLabel}`,
      photoURL: doc.photoURL ?? null,
      roleLabel: labels[doc.role ?? "user"] ?? memberLabel,
    },
    opts.siteName,
  );
}

export function renderUserProfileOgImage(data: UserProfileOgData, siteName: string): ReactElement {
  const { displayName, photoURL, roleLabel } = data;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(20,184,166,0.08)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          padding: "60px",
          gap: "56px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
            border: "4px solid rgba(20,184,166,0.4)",
            background: "rgba(20,184,166,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ fontSize: 80, color: "#14b8a6" }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 16, color: "#14b8a6", fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>
              {siteName} · Profile
            </div>
            {roleLabel && (
              <div
                style={{
                  fontSize: 13,
                  color: "#5eead4",
                  fontWeight: 500,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  background: "rgba(20,184,166,0.12)",
                  padding: "3px 10px",
                  borderRadius: 100,
                }}
              >
                {roleLabel}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#f1f5f9",
              lineHeight: 1.1,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayName}
          </div>
        </div>
      </div>
    </div>
  );
}
