import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

export const auth0 = new Auth0Client({
  async onCallback(error, ctx, _session) {
    const base = ctx.appBaseUrl ?? process.env.AUTH0_BASE_URL ?? "http://localhost:3000";
    if (error) {
      return NextResponse.redirect(new URL("/access-denied", base));
    }
    return NextResponse.redirect(new URL(ctx.returnTo ?? "/tasks", base));
  },
});
