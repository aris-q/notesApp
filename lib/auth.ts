import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./auth0";
import { prisma } from "./prisma";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? "more.early@gmail.com";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

// Cache the resolved user record in memory — single-user app, safe to hold indefinitely.
const userCache = new Map<string, { id: string; auth0Sub: string; email: string }>();

export async function requireAuthorizedUser(req?: NextRequest) {
  const session = req ? await auth0.getSession(req as Parameters<typeof auth0.getSession>[0]) : await auth0.getSession();

  if (!session) {
    throw new AuthError(401, "Unauthorized");
  }

  if (session.user.email !== ALLOWED_EMAIL) {
    throw new AuthError(403, "Forbidden");
  }

  const cached = userCache.get(session.user.sub);
  if (cached) return cached;

  const user = await prisma.user.upsert({
    where: { auth0Sub: session.user.sub },
    update: {},
    create: {
      auth0Sub: session.user.sub,
      email: session.user.email,
    },
  });

  userCache.set(session.user.sub, user);
  return user;
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function handleAuthError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
