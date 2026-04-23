import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OWNER_EMAIL } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const { count } = await prisma.user.deleteMany({
    where: {
      email: { not: OWNER_EMAIL },
      lastActiveAt: { lt: cutoff },
    },
  });

  return NextResponse.json({ deleted: count });
}
