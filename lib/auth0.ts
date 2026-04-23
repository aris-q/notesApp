import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? "more.early@gmail.com";

export const auth0 = new Auth0Client({
  async onCallback(error, ctx, session) {
    const base = ctx.appBaseUrl ?? process.env.AUTH0_BASE_URL ?? "http://localhost:3000";
    if (error) {
      return NextResponse.redirect(new URL("/access-denied", base));
    }
    if (!session?.user?.email || session.user.email !== ALLOWED_EMAIL) {
      return NextResponse.redirect(new URL("/access-denied", base));
    }
    return NextResponse.redirect(new URL(ctx.returnTo ?? "/tasks", base));
  },
});
