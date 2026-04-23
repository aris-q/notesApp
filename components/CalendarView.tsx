"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Task, TaskList } from "@/lib/types";
import { addDays } from "date-fns";
import { expandRecurrence } from "@/lib/recurrence";
import { RecurrenceType } from "@prisma/client";

interface Props {
  tasks: Task[];
  lists: TaskList[];
  hiddenLists?: Set<string>;
  onEditTask: (task: Task) => void;
  onAddTask: (listId: string | null, date?: Date) => void;
}

function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x;
}

export default function CalendarView({ tasks, lists, hiddenLists, onEditTask, onAddTask }: Props) {
  const [mode, setMode] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });

  const listById = useMemo(() => Object.fromEntries(lists.map(l => [l.id, l])), [lists]);

  // Expand recurrences into tasksByDay (respects hiddenLists)
  const tasksByDay = useMemo(() => {
    const m: Record<string, Task[]> = {};
    const horizon = addDays(new Date(), 90);
    for (const t of tasks) {
      if (!t.deadline) continue;
      if (hiddenLists?.has(t.listId)) continue;
      const add = (d: Date) => { const k = dayKey(d); (m[k] = m[k] || []).push(t); };
      add(new Date(t.deadline));
      const expanded = expandRecurrence(
        { deadline: new Date(t.deadline), recurrenceType: t.recurrenceType as RecurrenceType, recurrenceInterval: t.recurrenceInterval, recurrenceDays: t.recurrenceDays, recurrenceUnit: t.recurrenceUnit, recurrenceEndDate: t.recurrenceEndDate ? new Date(t.recurrenceEndDate) : null },
        horizon
      );
      for (const d of expanded) add(d);
    }
    return m;
  }, [tasks, hiddenLists]);

  const go = useCallback((delta: number) => {
    setCursor(prev => {
      const d = new Date(prev);
      if (mode === "month") d.setMonth(d.getMonth() + delta);
      else if (mode === "week") d.setDate(d.getDate() + delta * 7);
      else d.setDate(d.getDate() + delta);
      if (mode === "day") { const sd = new Date(d); sd.setHours(0,0,0,0); setSelectedDay(sd); }
      return d;
    });
  }, [mode]);

  const goToday = () => {
    const t = new Date(); setCursor(t);
    const sd = new Date(t); sd.setHours(0,0,0,0); setSelectedDay(sd);
  };

  const headerLabel = (() => {
    if (mode === "month") return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (mode === "week") {
      const ws = startOfWeek(cursor); const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return ws.getMonth() === we.getMonth()
        ? `${ws.toLocaleDateString(undefined, { month: "long" })} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`
        : `${ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${we.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  })();

  const handleDayClick = (date: Date) => {
    const sd = new Date(date); sd.setHours(0,0,0,0); setSelectedDay(sd); setCursor(date);
  };

  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (wheelTimerRef.current) return;
    wheelTimerRef.current = setTimeout(() => { wheelTimerRef.current = null; }, 400);
    go(e.deltaY > 0 ? 1 : -1);
  }, [go]);

  return (
    <div
      style={{ padding: 18, height: "100%", display: "flex", flexDirection: "column" }}
      onWheel={handleWheel}
    >
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden", boxShadow: "0 8px 24px -12px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 14px", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => go(-1)} style={navBtn}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(180deg)" }}><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: -0.2, color: "var(--text-hi)" }}>{headerLabel}</h2>
            <button onClick={() => go(1)} style={navBtn}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <button onClick={goToday} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              color: "var(--text-md)", padding: "4px 11px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", marginLeft: 4,
            }}>Today</button>
          </div>
          <div style={{ display: "inline-flex", padding: 2, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>
            {(["month", "week", "day"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: "4px 12px", borderRadius: 6,
                background: mode === m ? "rgba(255,255,255,0.08)" : "transparent",
                color: mode === m ? "var(--text-hi)" : "var(--text-lo)",
                border: 0, fontSize: 11.5, fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
              }}>{m}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {mode === "month" && <MonthGrid cursor={cursor} tasksByDay={tasksByDay} listById={listById} onEditTask={onEditTask} selectedDay={selectedDay} onDayClick={handleDayClick} onAddTask={onAddTask} />}
          {mode === "week" && <WeekGrid cursor={cursor} tasksByDay={tasksByDay} listById={listById} onEditTask={onEditTask} selectedDay={selectedDay} onDayClick={handleDayClick} onAddTask={onAddTask} />}
          {mode === "day" && <DayView cursor={cursor} tasksByDay={tasksByDay} listById={listById} onEditTask={onEditTask} onAddTask={onAddTask} />}
        </div>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
  color: "var(--text-md)", width: 26, height: 26, borderRadius: 6,
  cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
};

/* ─── Month ─── */
function MonthGrid({ cursor, tasksByDay, listById, onEditTask, selectedDay, onDayClick, onAddTask }: {
  cursor: Date; tasksByDay: Record<string, Task[]>; listById: Record<string, TaskList>;
  onEditTask: (t: Task) => void; selectedDay: Date; onDayClick: (d: Date) => void;
  onAddTask: (id: string | null, d?: Date) => void;
}) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells: { day: number; inMonth: boolean; date: Date }[] = [];
  for (let i = 0; i < startWeekday; i++)
    cells.push({ day: prevMonthDays - startWeekday + 1 + i, inMonth: false, date: new Date(year, month - 1, prevMonthDays - startWeekday + 1 + i) });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last); next.setDate(last.getDate() + 1);
    cells.push({ day: next.getDate(), inMonth: false, date: next });
    if (cells.length >= 42) break;
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 12px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => (
          <div key={d} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: "var(--text-mute)", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridTemplateRows: "repeat(6, 1fr)", padding: 12, gap: 4, overflow: "hidden" }}>
        {cells.map((c, i) => {
          const k = dayKey(c.date);
          const dayTasks = tasksByDay[k] || [];
          const tdy = sameDay(c.date, today);
          const isSel = sameDay(c.date, selectedDay);
          return (
            <div key={i} className="tf-cal-day"
              onClick={() => onDayClick(c.date)}
              onDoubleClick={() => onAddTask(null, c.date)}
              style={{
                minHeight: 0, borderRadius: 8, cursor: "pointer",
                background: isSel ? "rgba(124,157,255,0.10)" : tdy ? "rgba(124,157,255,0.05)" : "rgba(255,255,255,0.015)",
                border: isSel ? "1px solid rgba(124,157,255,0.5)" : tdy ? "1px solid rgba(124,157,255,0.3)" : "1px solid rgba(255,255,255,0.03)",
                padding: 8, display: "flex", flexDirection: "column",
                opacity: c.inMonth ? 1 : 0.45, position: "relative", overflow: "hidden",
                transition: "background 160ms, border-color 160ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{
                  fontSize: 11.5, fontWeight: tdy ? 700 : 500,
                  color: tdy ? "#7c9dff" : c.inMonth ? "var(--text-md)" : "var(--text-mute)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minWidth: 18, height: 18, borderRadius: "50%",
                  background: tdy ? "rgba(124,157,255,0.18)" : "transparent",
                  padding: tdy ? "0 5px" : 0, fontVariantNumeric: "tabular-nums",
                }}>{c.day}</span>
                <button className="tf-cal-day-add"
                  onClick={e => { e.stopPropagation(); onAddTask(null, c.date); }}
                  style={{ background: "transparent", border: 0, width: 16, height: 16, borderRadius: "50%", color: "var(--text-mute)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 140ms" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#7c9dff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,157,255,0.15)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-mute)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                {dayTasks.slice(0, 3).map(t => {
                  const list = listById[t.listId]; const color = list?.color || "#7c9dff";
                  return <CalChip key={t.id} task={t} color={color} onClick={e => { e.stopPropagation(); onEditTask(t); }} dimmed={t.recurrenceType === "DAILY"} />;
                })}
                {dayTasks.length > 3 && <span style={{ fontSize: 9.5, color: "var(--text-mute)", fontVariantNumeric: "tabular-nums" }}>+{dayTasks.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── Week ─── */
function WeekGrid({ cursor, tasksByDay, listById, onEditTask, selectedDay, onDayClick, onAddTask }: {
  cursor: Date; tasksByDay: Record<string, Task[]>; listById: Record<string, TaskList>;
  onEditTask: (t: Task) => void; selectedDay: Date; onDayClick: (d: Date) => void;
  onAddTask: (id: string | null, d?: Date) => void;
}) {
  const ws = startOfWeek(cursor);
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d; });

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: 12, gap: 8, overflow: "hidden" }}>
      {days.map((d, i) => {
        const k = dayKey(d); const dayTasks = tasksByDay[k] || [];
        const tdy = sameDay(d, today); const isSel = sameDay(d, selectedDay);
        return (
          <div key={i} className="tf-cal-day"
            onClick={() => onDayClick(d)} onDoubleClick={() => onAddTask(null, d)}
            style={{
              borderRadius: 10, padding: 10, cursor: "pointer",
              background: isSel ? "rgba(124,157,255,0.10)" : tdy ? "rgba(124,157,255,0.05)" : "rgba(255,255,255,0.015)",
              border: isSel ? "1px solid rgba(124,157,255,0.5)" : tdy ? "1px solid rgba(124,157,255,0.3)" : "1px solid rgba(255,255,255,0.03)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              transition: "background 160ms, border-color 160ms",
            }}
          >
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: "var(--text-mute)", textTransform: "uppercase" }}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: tdy ? "#7c9dff" : "var(--text-hi)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                  {d.getDate()}
                </div>
              </div>
              <button className="tf-cal-day-add"
                onClick={e => { e.stopPropagation(); onAddTask(null, d); }}
                style={{ background: "transparent", border: 0, width: 18, height: 18, borderRadius: "50%", color: "var(--text-mute)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 140ms" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#7c9dff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,157,255,0.15)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-mute)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
              {dayTasks.map(t => {
                const list = listById[t.listId]; const color = list?.color || "#7c9dff";
                return <CalChip key={t.id} task={t} color={color} onClick={e => { e.stopPropagation(); onEditTask(t); }} showTime dimmed={t.recurrenceType === "DAILY"} />;
              })}
              {dayTasks.length === 0 && <div style={{ fontSize: 11, color: "var(--text-mute)", fontStyle: "italic" }}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Day ─── */
const HOUR_H = 56;

function DayView({ cursor, tasksByDay, listById, onEditTask, onAddTask }: {
  cursor: Date; tasksByDay: Record<string, Task[]>; listById: Record<string, TaskList>;
  onEditTask: (t: Task) => void; onAddTask: (id: string | null, d?: Date) => void;
}) {
  const k = dayKey(cursor);
  const dayTasks = (tasksByDay[k] || []).slice().sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const [activeId, setActiveId] = useState<string | null>(dayTasks[0]?.id ?? null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const isTodayView = sameDay(cursor, new Date());

  useEffect(() => { setActiveId(dayTasks[0]?.id ?? null); }, [k]); // eslint-disable-line
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const el = scrollerRef.current; if (!el) return;
    const firstTask = dayTasks[0];
    let targetHour = 8;
    if (firstTask?.deadline) targetHour = Math.max(0, new Date(firstTask.deadline).getHours() - 1);
    else if (isTodayView) targetHour = Math.max(0, now.getHours() - 1);
    el.scrollTop = targetHour * HOUR_H;
  }, [k]); // eslint-disable-line

  const active = dayTasks.find(t => t.id === activeId) || dayTasks[0];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const nowTop = (now.getHours() + now.getMinutes() / 60) * HOUR_H;

  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 340px", minHeight: 0, overflow: "hidden" }}>
      <div ref={scrollerRef} className="tf-scroll" style={{ overflowY: "auto", overflowX: "hidden", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", position: "relative" }}>
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
            {hours.map(h => (
              <div key={h} style={{ height: HOUR_H, padding: "4px 10px 0", fontSize: 10, color: "var(--text-mute)", letterSpacing: 0.5, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {h === 0 ? "12 am" : h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`}
              </div>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            {hours.map(h => (
              <div key={h} onClick={() => { const d = new Date(cursor); d.setHours(h, 0, 0, 0); onAddTask(null, d); }}
                style={{ height: HOUR_H, borderBottom: "1px solid rgba(255,255,255,0.03)", position: "relative", cursor: "pointer", transition: "background 140ms" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(124,157,255,0.035)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              />
            ))}
            {isTodayView && (
              <div style={{ position: "absolute", left: 0, right: 0, top: nowTop, height: 0, borderTop: "1px solid #ff6d6d", pointerEvents: "none", zIndex: 4 }}>
                <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#ff6d6d", boxShadow: "0 0 8px #ff6d6d" }} />
              </div>
            )}
            {dayTasks.map(t => {
              if (!t.deadline) return null;
              const d = new Date(t.deadline); const hh = d.getHours() + d.getMinutes() / 60;
              const list = listById[t.listId]; const color = list?.color || "#7c9dff";
              const isActive = t.id === active?.id;
              return (
                <button key={t.id}
                  onClick={e => { e.stopPropagation(); setActiveId(t.id); }}
                  onDoubleClick={e => { e.stopPropagation(); onEditTask(t); }}
                  style={{
                    position: "absolute", left: 10, right: 12, top: hh * HOUR_H, minHeight: 54,
                    background: isActive ? color + "26" : color + "14",
                    border: `1px solid ${color}${isActive ? "55" : "2a"}`, borderLeft: `3px solid ${color}`,
                    borderRadius: 8, padding: "8px 12px", textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 3,
                    color: t.isCompleted ? "var(--text-lo)" : "var(--text-hi)",
                    boxShadow: isActive ? `0 6px 20px -10px ${color}` : "none",
                    transition: "background 160ms, border-color 160ms, box-shadow 180ms", zIndex: isActive ? 3 : 2,
                  }}
                >
                  <div style={{ fontSize: 10.5, color, fontWeight: 600, letterSpacing: 0.2, fontVariantNumeric: "tabular-nums" }}>
                    {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, textDecoration: t.isCompleted ? "line-through" : "none" }}>{t.title}</div>
                  {list && <div style={{ fontSize: 10.5, color: "var(--text-lo)" }}>{list.name}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day details sidebar */}
      <aside style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", padding: 20, display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.015)", overflow: "hidden" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: "var(--text-mute)", textTransform: "uppercase" }}>
            {cursor.toLocaleDateString(undefined, { weekday: "long" })}
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.8, color: "var(--text-hi)", fontVariantNumeric: "tabular-nums", lineHeight: 1, marginTop: 4 }}>
            {cursor.getDate()}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 6 }}>{dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"} scheduled</div>
        </div>
        <button onClick={() => onAddTask(null, cursor)} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-md)", fontSize: 12, fontWeight: 500, cursor: "pointer", marginBottom: 18,
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,157,255,0.10)"; (e.currentTarget as HTMLButtonElement).style.color = "#9bb6ff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,157,255,0.3)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-md)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          New task on this day
        </button>
        <div className="tf-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {active ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: "var(--text-mute)", textTransform: "uppercase", marginBottom: 8 }}>Selected</div>
              {(() => {
                const list = listById[active.listId]; const color = list?.color || "#7c9dff";
                const d = active.deadline ? new Date(active.deadline) : null;
                return (
                  <div style={{ padding: 14, borderRadius: 10, background: color + "10", border: `1px solid ${color}22`, borderLeft: `3px solid ${color}`, marginBottom: 14 }}>
                    {d && <div style={{ fontSize: 11, color, fontWeight: 600, letterSpacing: 0.3, fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>{d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>}
                    <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35, color: active.isCompleted ? "var(--text-lo)" : "var(--text-hi)", textDecoration: active.isCompleted ? "line-through" : "none", marginBottom: 8 }}>{active.title}</div>
                    {list && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--text-md)", padding: "2px 7px 2px 6px", borderRadius: 999, background: "rgba(255,255,255,0.04)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{list.name}
                    </div>}
                    {active.description && <div style={{ fontSize: 12, color: "var(--text-md)", marginTop: 10, lineHeight: 1.5 }}>{active.description}</div>}
                  </div>
                );
              })()}
              <button onClick={() => onEditTask(active)} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 12px", borderRadius: 8, background: listById[active.listId]?.color || "#7c9dff",
                color: "#0b0d12", border: 0, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
              }}>Open task</button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "30px 10px", color: "var(--text-mute)", fontSize: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,157,255,0.08)", border: "1px solid rgba(124,157,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c9dff", marginBottom: 10 }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </div>
              <div style={{ color: "var(--text-md)", fontWeight: 500, marginBottom: 4 }}>No tasks today</div>
              <div style={{ lineHeight: 1.5 }}>Click an hour or the button above to add one.</div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function CalChip({ task, color, onClick, showTime, dimmed }: { task: Task; color: string; onClick: (e: React.MouseEvent) => void; showTime?: boolean; dimmed?: boolean }) {
  const d = task.deadline ? new Date(task.deadline) : null;
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: showTime ? "column" : "row", alignItems: showTime ? "stretch" : "center", gap: showTime ? 2 : 5,
      padding: "4px 7px 4px 6px",
      background: dimmed ? color + "08" : color + "14",
      border: `1px solid ${dimmed ? color + "14" : color + "22"}`,
      borderLeft: `2px solid ${dimmed ? color + "50" : color}`,
      borderRadius: 5,
      color: task.isCompleted || dimmed ? "var(--text-lo)" : "var(--text-hi)",
      textDecoration: task.isCompleted ? "line-through" : "none",
      fontSize: 10.5, fontWeight: dimmed ? 400 : 500, textAlign: "left", cursor: "pointer", minWidth: 0,
      opacity: dimmed ? 0.55 : 1,
    }}>
      {showTime && d && <span style={{ color: dimmed ? color + "99" : color, fontVariantNumeric: "tabular-nums", fontSize: 9.5, letterSpacing: 0.2 }}>{d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, lineHeight: 1.3 }}>{task.title}</span>
    </button>
  );
}
