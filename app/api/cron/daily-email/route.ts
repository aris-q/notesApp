import { NextRequest, NextResponse } from "next/server";
import { sendDailyDigest } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sendDailyDigest();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Daily digest failed:", err);
    return NextResponse.json({ error: "Failed to send digest" }, { status: 500 });
  }
}
