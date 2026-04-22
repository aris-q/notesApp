import { NextRequest, NextResponse } from "next/server";
import { Priority, RecurrenceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleAuthError, requireAuthorizedUser } from "@/lib/auth";

async function getOwnedTask(userId: string, taskId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      list: { userId },
    },
    include: { subtasks: { orderBy: { position: "asc" } }, links: true },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthorizedUser(req);
    const { id } = await params;
    const task = await getOwnedTask(user.id, id);
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
        priority: body.priority !== undefined ? (body.priority as Priority) : undefined,
        isCompleted: body.isCompleted !== undefined ? Boolean(body.isCompleted) : undefined,
        recurrenceType: body.recurrenceType !== undefined ? (body.recurrenceType as RecurrenceType) : undefined,
        recurrenceInterval: body.recurrenceInterval !== undefined ? (body.recurrenceInterval ? Number(body.recurrenceInterval) : null) : undefined,
        recurrenceDays: body.recurrenceDays !== undefined ? (Array.isArray(body.recurrenceDays) ? body.recurrenceDays : []) : undefined,
        recurrenceUnit: body.recurrenceUnit !== undefined ? (body.recurrenceUnit ? String(body.recurrenceUnit) : null) : undefined,
        recurrenceEndDate: body.recurrenceEndDate !== undefined ? (body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null) : undefined,
        listId: body.listId !== undefined ? String(body.listId) : undefined,
      },
      include: { subtasks: { orderBy: { position: "asc" } }, links: true },
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
    const { id } = await params;
    const task = await getOwnedTask(user.id, id);
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.task.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleAuthError(err);
  }
}
