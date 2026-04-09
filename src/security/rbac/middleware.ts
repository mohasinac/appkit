// appkit/src/security/rbac/middleware.ts
import type { RbacConfig, Permission } from "./types";
import { resolvePermissions, hasPermission } from "./resolver";

type NextRequest = {
  nextUrl: { pathname: string };
  headers: { get: (name: string) => string | null };
  cookies: { get: (name: string) => { value: string } | undefined };
  url: string;
};

type NextResponse = {
  redirect: (url: URL | string) => NextResponse;
  next: () => NextResponse;
};

type GetSessionUser = (
  request: NextRequest,
) => Promise<{ uid: string; roles: string[] } | null>;

function matchesRoute(pathname: string, pattern: string): boolean {
  // Convert route pattern like "/admin/:path*" to a testable form
  const escaped = pattern
    .replace(/\[.*?\]/g, "[^/]+")
    .replace(/:\w+\*/g, ".*")
    .replace(/:\w+/g, "[^/]+");
  return new RegExp(`^${escaped}(/|$)`).test(pathname);
}

/**
 * Factory that creates a Next.js middleware function for route-level RBAC.
 *
 * @example
 * // letitrip: middleware.ts
 * import { createRbacMiddleware } from "@mohasinac/appkit/security";
 * import { RBAC_CONFIG } from "@/constants/rbac";
 * import { ADMIN_PAGE_PERMISSIONS } from "@mohasinac/appkit/features/admin";
 * import { SELLER_PAGE_PERMISSIONS } from "@mohasinac/appkit/features/seller";
 * import { getSessionUser } from "@/lib/auth/session";
 *
 * export const middleware = createRbacMiddleware(
 *   RBAC_CONFIG,
 *   { ...ADMIN_PAGE_PERMISSIONS, ...SELLER_PAGE_PERMISSIONS },
 *   getSessionUser,
 *   { loginPath: "/auth/login", unauthorizedPath: "/unauthorized" }
 * );
 */
export function createRbacMiddleware(
  config: RbacConfig,
  pageMap: Record<string, Permission>,
  getSessionUser: GetSessionUser,
  options: {
    loginPath?: string;
    unauthorizedPath?: string;
    NextURL?: new (url: string, base: string) => URL;
    NextResponse?: NextResponse;
  } = {},
) {
  const loginPath = options.loginPath ?? "/auth/login";
  const unauthorizedPath = options.unauthorizedPath ?? "/unauthorized";

  return async function rbacMiddleware(
    request: NextRequest,
    NextResponseLib: {
      redirect: (url: URL | string) => NextResponse;
      next: () => NextResponse;
    },
  ): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Find the most specific matching route (longest match wins)
    const entry = Object.entries(pageMap)
      .filter(([route]) => matchesRoute(pathname, route))
      .sort((a, b) => b[0].length - a[0].length)[0];

    if (!entry) return NextResponseLib.next();

    const [, requiredPermission] = entry;
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponseLib.redirect(
        new URL(
          loginPath + `?from=${encodeURIComponent(pathname)}`,
          request.url,
        ),
      );
    }

    const perms = resolvePermissions(user.roles, config);
    if (!hasPermission(perms, requiredPermission)) {
      return NextResponseLib.redirect(
        new URL(
          unauthorizedPath +
            `?required=${encodeURIComponent(requiredPermission)}`,
          request.url,
        ),
      );
    }

    return NextResponseLib.next();
  };
}
