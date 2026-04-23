import { Resend } from "resend";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { prisma } from "./prisma";
import { Priority } from "@prisma/client";
import { PRIORITY_CONFIG } from "./priority";

const TO_EMAIL = process.env.ALLOWED_EMAIL ?? "more.early@gmail.com";
const FROM_EMAIL = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

interface DigestTask {
  id: string;
  title: string;
  priority: Priority;
  deadline: Date | null;
  listName: string;
}

const OWNER_WHERE = { list: { user: { email: TO_EMAIL } } };

async function getOverdueTasks(): Promise<DigestTask[]> {
  const now = startOfDay(new Date());
  const rows = await prisma.task.findMany({
    where: { isCompleted: false, deadline: { lt: now }, ...OWNER_WHERE },
    include: { list: { select: { name: true } } },
    orderBy: { deadline: "asc" },
  });
  return rows.map((t) => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline, listName: t.list.name }));
}

async function getDueTodayTasks(): Promise<DigestTask[]> {
  const today = new Date();
  const rows = await prisma.task.findMany({
    where: { isCompleted: false, deadline: { gte: startOfDay(today), lte: endOfDay(today) }, ...OWNER_WHERE },
    include: { list: { select: { name: true } } },
    orderBy: { priority: "asc" },
  });
  return rows.map((t) => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline, listName: t.list.name }));
}

async function getDueSoonTasks(): Promise<DigestTask[]> {
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const threeDaysOut = endOfDay(addDays(new Date(), 3));
  const rows = await prisma.task.findMany({
    where: { isCompleted: false, deadline: { gte: tomorrow, lte: threeDaysOut }, ...OWNER_WHERE },
    include: { list: { select: { name: true } } },
    orderBy: { deadline: "asc" },
  });
  return rows.map((t) => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline, listName: t.list.name }));
}

async function getUrgentAnyTimeTasks(excludeIds: string[]): Promise<DigestTask[]> {
  const rows = await prisma.task.findMany({
    where: {
      isCompleted: false,
      priority: { in: ["URGENT", "HIGH"] },
      id: { notIn: excludeIds },
      ...OWNER_WHERE,
    },
    include: { list: { select: { name: true } } },
    orderBy: [{ priority: "asc" }, { deadline: "asc" }],
  });
  return rows.map((t) => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline, listName: t.list.name }));
}

function taskRow(task: DigestTask): string {
  const cfg = PRIORITY_CONFIG[task.priority];
  const due = task.deadline ? format(task.deadline, "MMM d, yyyy") : "No deadline";
  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cfg.hex};margin-right:8px;"></span>
        ${task.title}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">${task.listName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">
        <span style="background:${cfg.hex};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;">${cfg.label}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:13px;">${due}</td>
    </tr>`;
}

function section(title: string, color: string, tasks: DigestTask[]): string {
  if (!tasks.length) return "";
  return `
    <h2 style="color:${color};margin:24px 0 8px;font-size:16px;">${title} (${tasks.length})</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.07);">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#374151;">Task</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#374151;">List</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#374151;">Priority</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#374151;">Due</th>
        </tr>
      </thead>
      <tbody>${tasks.map(taskRow).join("")}</tbody>
    </table>`;
}

function buildHtml(
  overdue: DigestTask[],
  dueToday: DigestTask[],
  dueSoon: DigestTask[],
  urgent: DigestTask[]
): string {
  const total = overdue.length + dueToday.length + dueSoon.length + urgent.length;
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;padding:24px;margin:0;">
  <div style="max-width:680px;margin:0 auto;">
    <h1 style="font-size:22px;color:#111827;margin-bottom:4px;">Daily Task Digest</h1>
    <p style="color:#6b7280;margin-top:0;">${today} · ${total} item${total !== 1 ? "s" : ""} need attention</p>
    ${section("🔴 Overdue", "#ef4444", overdue)}
    ${section("📅 Due Today", "#f97316", dueToday)}
    ${section("⏳ Due in 3 Days", "#eab308", dueSoon)}
    ${section("⚡ Urgent / High Priority", "#6366f1", urgent)}
    ${total === 0 ? '<p style="color:#6b7280;text-align:center;padding:32px 0;">You\'re all caught up! No urgent tasks right now.</p>' : ""}
    <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;">TaskFlow · Sent daily at 8 AM ET</p>
  </div>
</body>
</html>`;
}

export async function sendDailyDigest(): Promise<void> {
  const [overdue, dueToday, dueSoon] = await Promise.all([
    getOverdueTasks(),
    getDueTodayTasks(),
    getDueSoonTasks(),
  ]);

  const coveredIds = [...overdue, ...dueToday, ...dueSoon].map((t) => t.id);
  const urgent = await getUrgentAnyTimeTasks(coveredIds);

  const html = buildHtml(overdue, dueToday, dueSoon, urgent);
  const total = overdue.length + dueToday.length + dueSoon.length + urgent.length;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `TaskFlow: ${total} task${total !== 1 ? "s" : ""} need attention · ${format(new Date(), "MMM d")}`,
    html,
  });
}
