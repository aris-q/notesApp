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

    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const maxPos = await prisma.subtask.aggregate({
      where: { taskId },
      _max: { position: true },
    });

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title: String(title).trim(),
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return NextResponse.json(subtask, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthorizedUser(req);
    const { id: taskId } = await params;
    if (!await verifyTaskOwnership(user.id, taskId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { subtaskId, isCompleted, title, position } = body;

    const subtask = await prisma.subtask.findFirst({ where: { id: subtaskId, taskId } });
    if (!subtask) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : undefined,
        title: title !== undefined ? String(title).trim() : undefined,
        position: position !== undefined ? Number(position) : undefined,
      },
    });
    return NextResponse.json(updated);
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
    const subtaskId = searchParams.get("subtaskId");
    if (!subtaskId) return NextResponse.json({ error: "subtaskId required" }, { status: 400 });

    await prisma.subtask.deleteMany({ where: { id: subtaskId, taskId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleAuthError(err);
  }
}
