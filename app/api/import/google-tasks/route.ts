import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAuthError, requireAuthorizedUser } from "@/lib/auth";

interface ImportTask {
  title: string;
  deadline: string | null;
  notes: string | null;
  recurrenceType?: string;
}

interface ImportList {
  name: string;
  tasks: ImportTask[];
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthorizedUser(req);
    const body = await req.json() as { lists: ImportList[] };

    if (!Array.isArray(body.lists) || body.lists.length === 0) {
      return NextResponse.json({ error: "No lists provided" }, { status: 400 });
    }

    const maxPos = await prisma.taskList.aggregate({
      where: { userId: user.id },
      _max: { position: true },
    });
    let position = (maxPos._max.position ?? -1) + 1;

    let totalTasks = 0;
    const createdLists: string[] = [];

    for (const importList of body.lists) {
      if (!importList.name?.trim() || !Array.isArray(importList.tasks)) continue;

      const list = await prisma.taskList.create({
        data: {
          userId: user.id,
          name: importList.name.trim(),
          color: "#6366f1",
          position: position++,
        },
      });
      createdLists.push(list.id);

      const validTasks = importList.tasks.filter(t => t.title?.trim());
      if (validTasks.length > 0) {
        await prisma.task.createMany({
          data: validTasks.map(t => ({
            listId: list.id,
            title: t.title.trim(),
            description: t.notes ?? null,
            deadline: t.deadline ? new Date(t.deadline) : null,
            priority: "MEDIUM",
            recurrenceType: t.recurrenceType ?? "NONE",
            recurrenceDays: [],
          })),
        });
        totalTasks += validTasks.length;
      }
    }

    return NextResponse.json({ lists: createdLists.length, tasks: totalTasks }, { status: 201 });
  } catch (err) {
    return handleAuthError(err);
  }
}
