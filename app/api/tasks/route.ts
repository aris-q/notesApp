import { NextRequest, NextResponse } from "next/server";
import { Priority, RecurrenceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleAuthError, requireAuthorizedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthorizedUser(req);
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");
    const priority = searchParams.get("priority") as Priority | null;
    const dueBefore = searchParams.get("dueBefore");
    const dueAfter = searchParams.get("dueAfter");
    const completed = searchParams.get("completed");

    if (!listId) {
      return NextResponse.json({ error: "listId required" }, { status: 400 });
    }

    const tasks = await prisma.task.findMany({
      where: {
        listId,
        list: { userId: user.id },
        ...(priority ? { priority } : {}),
        ...(completed !== null ? { isCompleted: completed === "true" } : {}),
        ...(dueBefore || dueAfter
          ? {
              deadline: {
                ...(dueAfter ? { gte: new Date(dueAfter) } : {}),
                ...(dueBefore ? { lte: new Date(dueBefore) } : {}),
              },
            }
          : {}),
      },
      include: {
        subtasks: { orderBy: { position: "asc" } },
        links: true,
      },
      orderBy: [{ isCompleted: "asc" }, { deadline: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthorizedUser(req);
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get("listId");

    const listWhere = listId
      ? { id: listId, userId: user.id }
      : { userId: user.id };

    const lists = await prisma.taskList.findMany({ where: listWhere, select: { id: true } });
    const listIds = lists.map(l => l.id);

    if (listIds.length === 0) return new NextResponse(null, { status: 204 });

    await prisma.task.deleteMany({ where: { listId: { in: listIds } } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleAuthError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthorizedUser(req);
    const body = await req.json();
    const { listId, title, description, deadline, priority, recurrenceType,
            recurrenceInterval, recurrenceDays, recurrenceUnit, recurrenceEndDate } = body;

    if (!listId || !title?.trim()) {
      return NextResponse.json({ error: "listId and title required" }, { status: 400 });
    }

    // Verify list ownership
    const list = await prisma.taskList.findFirst({
      where: { id: listId, userId: user.id },
    });
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const task = await prisma.task.create({
      data: {
        listId,
        title: String(title).trim(),
        description: description ? String(description) : null,
        deadline: deadline ? new Date(deadline) : null,
        priority: (priority as Priority) ?? "MEDIUM",
        recurrenceType: (recurrenceType as RecurrenceType) ?? "NONE",
        recurrenceInterval: recurrenceInterval ? Number(recurrenceInterval) : null,
        recurrenceDays: Array.isArray(recurrenceDays) ? recurrenceDays : [],
        recurrenceUnit: recurrenceUnit ? String(recurrenceUnit) : null,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      },
      include: { subtasks: true, links: true },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}
