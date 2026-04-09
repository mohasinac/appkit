// appkit/src/next/middleware/types.ts
import type { NextRequest, NextResponse } from "next/server";

export interface BaseRequestContext {
  traceId: string;
  ip: string;
  locale: string;
  startedAt: number;
}

export interface AuthRequestContext extends BaseRequestContext {
  user: {
    uid: string;
    roles: string[];
    permissions: Set<string>;
  };
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
}

export type Middleware<Ctx extends BaseRequestContext = BaseRequestContext> = (
  request: NextRequest,
  ctx: Ctx,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;
