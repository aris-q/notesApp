import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? "more.early@gmail.com";

export async function proxy(request: Request) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Public: access-denied page
  if (pathname === "/access-denied") {
    return NextResponse.next();
  }

  const authResponse = await auth0.middleware(request as Parameters<typeof auth0.middleware>[0]);

  // If Auth0 redirected (e.g. to login), honour it
  if (authResponse.status !== 200) {
    return authResponse;
  }

  // Check session and enforce access rules
  const session = await auth0.getSession();

  if (!session) {
    // Not logged in — redirect to Auth0 login
    return NextResponse.redirect(
      new URL(`/auth/login?returnTo=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  if (session.user.email !== ALLOWED_EMAIL) {
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }

  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
