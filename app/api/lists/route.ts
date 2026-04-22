import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAuthError, requireAuthorizedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthorizedUser(req as Parameters<typeof requireAuthorizedUser>[0]);
    const lists = await prisma.taskList.findMany({
      where: { userId: user.id },
      orderBy: { position: "asc" },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json(lists);
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthorizedUser(req as Parameters<typeof requireAuthorizedUser>[0]);
    const body = await req.json();
    const { name, color } = body as { name: string; color?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const maxPos = await prisma.taskList.aggregate({
      where: { userId: user.id },
      _max: { position: true },
    });

    const list = await prisma.taskList.create({
      data: {
        userId: user.id,
        name: name.trim(),
        color: color ?? "#6366f1",
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}
