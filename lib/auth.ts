import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "./auth0";
import { prisma } from "./prisma";

export const OWNER_EMAIL = process.env.ALLOWED_EMAIL ?? "more.early@gmail.com";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function requireAuthorizedUser(req?: NextRequest) {
  const session = req ? await auth0.getSession(req as Parameters<typeof auth0.getSession>[0]) : await auth0.getSession();

  if (!session) {
    throw new AuthError(401, "Unauthorized");
  }

  const user = await prisma.user.upsert({
    where: { auth0Sub: session.user.sub },
    update: { lastActiveAt: new Date() },
    create: {
      auth0Sub: session.user.sub,
      email: session.user.email ?? session.user.sub,
      lastActiveAt: new Date(),
    },
  });

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
