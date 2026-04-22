import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAuthError, requireAuthorizedUser } from "@/lib/auth";

async function verifyTaskOwnership(userId: string, taskId: string) {
  return prisma.task.findFirst({ where: { id: taskId, list: { userId } } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthorizedUser(req);
    const { id: taskId } = await params;
    if (!await verifyTaskOwnership(user.id, taskId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { title, url } = await req.json();
    if (!title?.trim() || !url?.trim()) {
      return NextResponse.json({ error: "title and url required" }, { status: 400 });
    }

    const link = await prisma.taskLink.create({
      data: { taskId, title: String(title).trim(), url: String(url).trim() },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthorizedUser(req);
    const { id: taskId } = await params;
    if (!await verifyTaskOwnership(user.id, taskId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const linkId = searchParams.get("linkId");
    if (!linkId) return NextResponse.json({ error: "linkId required" }, { status: 400 });

    await prisma.taskLink.deleteMany({ where: { id: linkId, taskId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleAuthError(err);
  }
}
