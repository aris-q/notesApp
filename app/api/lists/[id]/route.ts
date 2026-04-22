import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleAuthError, requireAuthorizedUser } from "@/lib/auth";

async function getOwnedList(userId: string, id: string) {
  const list = await prisma.taskList.findFirst({ where: { id, userId } });
  if (!list) return null;
  return list;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthorizedUser(req);
    const { id } = await params;
    const list = await getOwnedList(user.id, id);
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.taskList.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        color: body.color !== undefined ? String(body.color) : undefined,
        position: body.position !== undefined ? Number(body.position) : undefined,
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
    const { id } = await params;
    const list = await getOwnedList(user.id, id);
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.taskList.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleAuthError(err);
  }
}
