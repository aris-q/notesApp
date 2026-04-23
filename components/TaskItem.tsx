"use client";

import { useState } from "react";
import { Task, TaskList } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/priority";

// Utility helpers
function deadlineMeta(iso: string | null, isCompleted: boolean) {
  if (!iso) return null;
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  const isToday = d >= today && d < tomorrow;
  const isPast = hasTime ? d.getTime() < Date.now() : d < today;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const fmtTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!isCompleted && isPast && !isToday) return { text: `Overdue · ${fmt(d)}`, tone: "overdue" };
  if (isToday) return { text: hasTime ? `Today · ${fmtTime(d)}` : "Today", tone: "today" };
  return { text: fmt(d), tone: "future" };
}

function faviconColor(url: string) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 60% 60%)`;
}

interface Props {
  task: Task;
  list: TaskList;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string, isCompleted: boolean) => void;
  onRenameSubtask?: (task: Task, subtaskId: string, title: string) => void;
  justAdded?: boolean;
}

export default function TaskItem({ task, list, onToggle, onEdit, onDelete, onToggleSubtask, onRenameSubtask, justAdded }: Props) {
  const [popping, setPopping] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubValue, setEditSubValue] = useState("");
  const accent = list?.color || "#7c9dff";
  const dead = deadlineMeta(task.deadline, task.isCompleted);
  const cfg = PRIORITY_CONFIG[task.priority];

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.isCompleted) { setPopping(true); setTimeout(() => setPopping(false), 300); }
    onToggle(task);
  };

  const completedSubs = task.subtasks.filter(s => s.isCompleted).length;
  const hasMeta = dead || task.priority !== "LOW" || task.recurrenceType !== "NONE" || task.subtasks.length > 0;

  return (
    <div
      className="tf-task-row"
      style={{
        padding: "7px 10px 7px 12px", borderRadius: 8,
        transition: "background 160ms ease, opacity 260ms ease",
        opacity: task.isCompleted ? 0.42 : 1,
        position: "relative",
        animation: justAdded ? "tf-slideDown 320ms cubic-bezier(.2,.7,.2,1)" : undefined,
      }}
      onMouseEnter={e => { if (!task.isCompleted) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-row-hover)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <button
              onClick={() => onEdit(task)}
              className="tf-task-title"
              style={{
                background: "transparent", border: 0, padding: 0, textAlign: "left",
                fontSize: 13.5, fontWeight: 500, lineHeight: 1.3, letterSpacing: -0.05,
                color: task.isCompleted ? "var(--text-lo)" : "var(--text-hi)",
                cursor: "pointer", position: "relative",
                textDecoration: task.isCompleted ? "line-through" : "none",
                textDecorationColor: "var(--text-lo)", textDecorationThickness: "1px",
              }}
            >
              {task.title}
            </button>

            {task.priority !== "LOW" && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "1px 6px 1px 5px", borderRadius: 999,
                fontSize: 10, fontWeight: 500,
                color: cfg.hex, background: cfg.hex + "12", border: `1px solid ${cfg.hex}22`,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.hex }} />
                {cfg.label}
              </span>
            )}

            {task.recurrenceType !== "NONE" && (
              <span title="Recurring" style={{ color: "var(--text-mute)", display: "inline-flex" }}>
                <RepeatIcon />
              </span>
            )}
          </div>

          {/* Meta strip */}
          {hasMeta && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
              {dead && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 500,
                  color: dead.tone === "overdue" ? "var(--accent-overdue)" : dead.tone === "today" ? "var(--accent-today)" : "var(--accent-muted)",
                }}>
                  <CalendarIcon />
                  {dead.text}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span style={{ fontSize: 10.5, color: "var(--text-mute)", fontVariantNumeric: "tabular-nums" }}>
                  {completedSubs}/{task.subtasks.length} subtasks
                </span>
              )}
            </div>
          )}

          {task.description && (
            <div style={{ fontSize: 11.5, color: "var(--text-lo)", marginTop: 3, lineHeight: 1.4 }}>
              {task.description}
            </div>
          )}

          {/* Subtasks — always visible */}
          {task.subtasks.length > 0 && (
            <div style={{ marginTop: 6, paddingLeft: 10, position: "relative" }}>
              <div style={{
                position: "absolute", left: 2, top: 4, bottom: 12, width: 1,
                backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.14) 50%, transparent 50%)",
                backgroundSize: "1px 5px",
              }} />
              {task.subtasks.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    padding: "5px 8px 5px 4px", borderRadius: 6,
                    cursor: "pointer", position: "relative", transition: "background 140ms",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                >
                  <div style={{
                    position: "absolute", left: -8, top: 14, width: 8, height: 1,
                    backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.14) 50%, transparent 50%)",
                    backgroundSize: "4px 1px",
                  }} />
                  {editingSubId === sub.id ? (
                    <input
                      autoFocus
                      value={editSubValue}
                      onChange={e => setEditSubValue(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === "Enter") { onRenameSubtask?.(task, sub.id, editSubValue); setEditingSubId(null); }
                        if (e.key === "Escape") setEditingSubId(null);
                      }}
                      onBlur={() => { if (editSubValue.trim()) onRenameSubtask?.(task, sub.id, editSubValue); setEditingSubId(null); }}
                      style={{
                        flex: 1, background: "transparent", border: 0,
                        borderBottom: `1px solid ${accent}`,
                        padding: "0 0 1px", fontSize: 12.5, color: "var(--text-hi)",
                        outline: "none", minWidth: 0,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.35,
                        color: sub.isCompleted ? "var(--text-mute)" : "var(--text-md)",
                        textDecorationLine: sub.isCompleted ? "line-through" : "none",
                        textDecorationThickness: "1px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                      onDoubleClick={e => { e.stopPropagation(); setEditingSubId(sub.id); setEditSubValue(sub.title); }}
                    >{sub.title}</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onToggleSubtask(task, sub.id, !sub.isCompleted); }}
                    style={{
                      width: 13, height: 13, minWidth: 13, borderRadius: "50%",
                      border: `1.4px solid ${sub.isCompleted ? accent : accent + "70"}`,
                      background: sub.isCompleted ? accent : "transparent",
                      cursor: "pointer", padding: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 180ms",
                    }}
                  >
                    {sub.isCompleted && (
                      <svg width="7" height="7" viewBox="0 0 12 12" fill="none" stroke="#0b0d12" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2.5 6.2L5 8.5 9.5 3.8" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          {task.links.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {task.links.map(link => (
                <a
                  key={link.id} href={link.url} target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "1px 7px 1px 3px", borderRadius: 999,
                    fontSize: 10.5, fontWeight: 500,
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-md)", textDecoration: "none", transition: "all 160ms",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-hi)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-md)"; }}
                >
                  <span style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: faviconColor(link.url),
                    display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.5)",
                  }}>
                    <LinkIcon />
                  </span>
                  {link.title}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right-side checkbox + delete */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 2 }}>
          <button
            onClick={handleToggle}
            title={task.isCompleted ? "Mark incomplete" : "Complete"}
            style={{
              width: 15, height: 15, minWidth: 15, borderRadius: "50%",
              border: `1.5px solid ${task.isCompleted ? accent : accent + "80"}`,
              background: task.isCompleted ? accent : "transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              padding: 0, transition: "background 180ms, border-color 180ms",
              animation: popping ? "tf-checkPop 320ms cubic-bezier(.3,1.4,.5,1)" : undefined,
            }}
            onMouseEnter={e => { if (!task.isCompleted) { (e.currentTarget as HTMLButtonElement).style.background = accent + "22"; (e.currentTarget as HTMLButtonElement).style.borderColor = accent; } }}
            onMouseLeave={e => { if (!task.isCompleted) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.borderColor = accent + "80"; } }}
          >
            {task.isCompleted && (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#0b0d12" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6.2L5 8.5 9.5 3.8" />
              </svg>
            )}
          </button>

          <button
            className="tf-row-delete"
            onClick={e => { e.stopPropagation(); onDelete(task); }}
            style={{
              background: "transparent", border: 0, padding: 3, borderRadius: 5,
              color: "var(--text-mute)", cursor: "pointer",
              opacity: 0, transition: "opacity 160ms, color 160ms",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--accent-overdue)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--text-mute)"}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

const CalendarIcon = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const RepeatIcon = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>
);
const LinkIcon = () => (
  <svg width={7} height={7} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);
const TrashIcon = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
  </svg>
);
