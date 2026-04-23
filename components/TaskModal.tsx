"use client";

import { useEffect, useRef, useState } from "react";
import { Priority, RecurrenceType } from "@prisma/client";
import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/priority";
import { Task, TaskList, Subtask, TaskLink } from "@/lib/types";

interface Props {
  task: Task | null;
  listId: string | null;
  lists: TaskList[];
  onClose: () => void;
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  NONE: "Does not repeat", DAILY: "Daily", WEEKLY: "Weekly",
  MONTHLY: "Monthly", YEARLY: "Yearly",
  CUSTOM_INTERVAL: "Custom interval", CUSTOM_DAYS: "Specific days",
};
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function uid() { return Math.random().toString(36).slice(2, 10); }
function faviconColor(url: string) {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 60% 60%)`;
}
function domainFromUrl(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function TaskModal({ task, listId, lists, onClose }: Props) {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const existingDeadline = task?.deadline ? new Date(task.deadline) : null;
  const [deadlineDate, setDeadlineDate] = useState(
    existingDeadline ? existingDeadline.toLocaleDateString("sv") : ""
  );
  const [deadlineTime, setDeadlineTime] = useState(
    existingDeadline && (existingDeadline.getHours() !== 0 || existingDeadline.getMinutes() !== 0)
      ? existingDeadline.toTimeString().slice(0, 5)
      : ""
  );
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [selectedListId, setSelectedListId] = useState(task?.listId ?? listId ?? lists[0]?.id ?? "");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task?.recurrenceType ?? "NONE");
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrenceInterval?.toString() ?? "1");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(task?.recurrenceDays ?? []);
  const [recurrenceUnit, setRecurrenceUnit] = useState(task?.recurrenceUnit ?? "day");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    task?.recurrenceEndDate ? new Date(task.recurrenceEndDate).toISOString().slice(0, 10) : ""
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);
  const [newSub, setNewSub] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubValue, setEditSubValue] = useState("");
  const [links, setLinks] = useState<TaskLink[]>(task?.links ?? []);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [focusField, setFocusField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const descRef = useRef<HTMLTextAreaElement>(null);

  const currentList = lists.find(l => l.id === selectedListId) || lists[0];
  const listColor = currentList?.color || "#7c9dff";

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const toggleDay = (day: string) =>
    setRecurrenceDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day]);

  const submit = async () => {
    if (!title.trim() || !selectedListId) return;
    setSaving(true);
    const body = {
      listId: selectedListId, title: title.trim(),
      description: description || null,
      deadline: deadlineDate
        ? new Date(deadlineTime ? `${deadlineDate}T${deadlineTime}` : `${deadlineDate}T00:00:00`).toISOString()
        : null,
      priority, recurrenceType,
      recurrenceInterval: recurrenceType === "CUSTOM_INTERVAL" ? Number(recurrenceInterval) : null,
      recurrenceDays: recurrenceType === "CUSTOM_DAYS" ? recurrenceDays : [],
      recurrenceUnit: recurrenceType === "CUSTOM_INTERVAL" ? recurrenceUnit : null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
    };

    let savedId = task?.id;
    if (isEditing && task) {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) { const created = await res.json(); savedId = created.id; }
    }

    if (!isEditing && savedId) {
      for (const sub of subtasks) {
        await fetch(`/api/tasks/${savedId}/subtasks`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: sub.title }),
        });
      }
      for (const link of links) {
        await fetch(`/api/tasks/${savedId}/links`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: link.title, url: link.url }),
        });
      }
    }
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onClose();
  };

  const addSub = async () => {
    if (!newSub.trim()) return;
    if (isEditing && task) {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newSub.trim() }),
      });
      if (res.ok) { const s = await res.json(); setSubtasks(prev => [...prev, s]); }
    } else {
      setSubtasks(s => [...s, { id: uid(), taskId: "", title: newSub.trim(), isCompleted: false, position: s.length }]);
    }
    setNewSub("");
  };

  const removeSub = async (id: string) => {
    if (isEditing && task) {
      await fetch(`/api/tasks/${task.id}/subtasks?subtaskId=${id}`, { method: "DELETE" });
    }
    setSubtasks(s => s.filter(x => x.id !== id));
  };

  const toggleSubLocal = (id: string) =>
    setSubtasks(s => s.map(x => x.id === id ? { ...x, isCompleted: !x.isCompleted } : x));

  const renameSubLocal = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSubtasks(s => s.map(x => x.id === id ? { ...x, title: newTitle.trim() } : x));
    if (isEditing && task) {
      await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskId: id, title: newTitle.trim() }),
      });
    }
  };

  const addLink = async () => {
    if (!newLinkUrl.trim()) return;
    const url = newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`;
    const linkTitle = domainFromUrl(url);
    if (isEditing && task) {
      const res = await fetch(`/api/tasks/${task.id}/links`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: linkTitle, url }),
      });
      if (res.ok) { const l = await res.json(); setLinks(prev => [...prev, l]); }
    } else {
      setLinks(l => [...l, { id: uid(), taskId: "", title: linkTitle, url }]);
    }
    setNewLinkUrl("");
  };

  const removeLink = async (id: string) => {
    if (isEditing && task) {
      await fetch(`/api/tasks/${task.id}/links?linkId=${id}`, { method: "DELETE" });
    }
    setLinks(l => l.filter(x => x.id !== id));
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
    textTransform: "uppercase", color: "var(--text-mute)", marginBottom: 6,
  };

  const fieldBase = (name: string): React.CSSProperties => ({
    width: "100%", background: "transparent", border: 0,
    borderBottom: `1px solid ${focusField === name ? listColor : "rgba(255,255,255,0.08)"}`,
    padding: "8px 0", fontSize: 14, color: "var(--text-hi)", outline: "none",
    transition: "border-color 200ms",
    boxShadow: focusField === name ? `0 1px 0 0 ${listColor}` : "none",
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(10,12,16,0.3)",
        backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        animation: "tf-backdropIn 200ms ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 820, maxWidth: "94vw", maxHeight: "88vh",
          background: "var(--bg-modal)", borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: `0 24px 64px -12px rgba(0,0,0,0.7), 0 0 40px -10px ${listColor}33`,
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "tf-modalIn 260ms cubic-bezier(.3,1.1,.4,1)",
        }}
      >
        {/* Accent glow line */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${listColor}, transparent)`, opacity: 0.6 }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: listColor, boxShadow: `0 0 10px ${listColor}` }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-md)" }}>
              {isEditing ? "Edit task" : "New task"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "var(--text-lo)", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
            <XIcon />
          </button>
        </div>

        {/* Body — two columns */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

          {/* Left: main fields */}
          <div className="tf-scroll" style={{ flex: 1, overflowY: "auto", padding: "6px 22px 18px", minWidth: 0 }}>
            {/* Title */}
            <input
              autoFocus value={title} onChange={e => setTitle(e.target.value)}
              onFocus={() => setFocusField("title")} onBlur={() => setFocusField(null)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); descRef.current?.focus(); } }}
              placeholder="Task title"
              style={{ ...fieldBase("title"), fontSize: 19, fontWeight: 500, padding: "10px 0" }}
            />
            {/* Description — flows below title on Enter */}
            <textarea
              ref={descRef}
              value={description} onChange={e => setDescription(e.target.value)}
              onFocus={() => setFocusField("desc")} onBlur={() => setFocusField(null)}
              placeholder="Add a note…"
              rows={2}
              style={{
                width: "100%", background: "transparent", border: 0,
                borderBottom: `1px solid ${focusField === "desc" ? listColor : "transparent"}`,
                padding: "3px 0", fontSize: 13, color: "var(--text-md)", outline: "none",
                resize: "none", transition: "border-color 200ms", lineHeight: 1.5,
                marginTop: 2, display: "block",
              }}
            />

            {/* List + Deadline */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 22 }}>
              <div>
                <label style={labelStyle}>List</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {lists.map(l => (
                    <button key={l.id} onClick={() => setSelectedListId(l.id)} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "4px 10px 4px 8px", borderRadius: 999,
                      background: selectedListId === l.id ? l.color + "22" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selectedListId === l.id ? l.color + "66" : "rgba(255,255,255,0.05)"}`,
                      color: selectedListId === l.id ? "var(--text-hi)" : "var(--text-md)",
                      fontSize: 11.5, cursor: "pointer", transition: "all 160ms",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: l.color }} />
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Deadline</label>
                <input
                  type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                  onFocus={() => setFocusField("deadline")} onBlur={() => setFocusField(null)}
                  style={{ ...fieldBase("deadline"), fontSize: 12.5, colorScheme: "dark", padding: "6px 0", width: "100%" }}
                />
                {deadlineTime !== null && deadlineTime !== "" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <input
                      type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
                      onFocus={() => setFocusField("deadlineTime")} onBlur={() => setFocusField(null)}
                      style={{ ...fieldBase("deadlineTime"), fontSize: 12, colorScheme: "dark", padding: "4px 0", flex: 1 }}
                    />
                    <button
                      onClick={() => setDeadlineTime("")}
                      style={{ background: "none", border: 0, color: "var(--text-mute)", fontSize: 11, cursor: "pointer", padding: "2px 4px", flexShrink: 0, whiteSpace: "nowrap" }}
                    >Remove time</button>
                  </div>
                ) : deadlineDate ? (
                  <button
                    onClick={() => setDeadlineTime("09:00")}
                    style={{ background: "none", border: 0, color: "var(--text-mute)", fontSize: 11, cursor: "pointer", padding: "4px 0", display: "block" }}
                  >+ Add time</button>
                ) : null}
              </div>
            </div>

            {/* Priority */}
            <div style={{ marginTop: 22 }}>
              <label style={labelStyle}>Priority</label>
              <div style={{ display: "flex", gap: 6 }}>
                {PRIORITY_ORDER.map(p => {
                  const c = PRIORITY_CONFIG[p].hex;
                  const active = priority === p;
                  return (
                    <button key={p} onClick={() => setPriority(p)} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 11px", borderRadius: 7,
                      background: active ? c + "22" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? c + "66" : "rgba(255,255,255,0.05)"}`,
                      color: active ? c : "var(--text-md)",
                      fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 160ms",
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c, boxShadow: active ? `0 0 6px ${c}` : "none" }} />
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recurrence */}
            <div style={{ marginTop: 22 }}>
              <label style={labelStyle}>Repeat</label>
              <select
                value={recurrenceType} onChange={e => setRecurrenceType(e.target.value as RecurrenceType)}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 7, padding: "7px 10px", fontSize: 12.5, color: "var(--text-hi)",
                  outline: "none", cursor: "pointer", colorScheme: "dark",
                }}
              >
                {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map(r => (
                  <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                ))}
              </select>
              {recurrenceType === "CUSTOM_INTERVAL" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-md)" }}>Every</span>
                  <input type="number" min={1} value={recurrenceInterval} onChange={e => setRecurrenceInterval(e.target.value)}
                    style={{ width: 56, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "var(--text-hi)", outline: "none", colorScheme: "dark" }} />
                  <select value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "var(--text-hi)", outline: "none", colorScheme: "dark" }}>
                    <option value="day">day(s)</option>
                    <option value="week">week(s)</option>
                  </select>
                </div>
              )}
              {recurrenceType === "CUSTOM_DAYS" && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {DAYS.map(day => (
                    <button key={day} onClick={() => toggleDay(day)} style={{
                      padding: "4px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 500, cursor: "pointer",
                      background: recurrenceDays.includes(day) ? listColor + "22" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${recurrenceDays.includes(day) ? listColor + "66" : "rgba(255,255,255,0.08)"}`,
                      color: recurrenceDays.includes(day) ? listColor : "var(--text-md)",
                    }}>{day}</button>
                  ))}
                </div>
              )}
              {recurrenceType !== "NONE" && (
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-mute)", marginRight: 8 }}>End date (optional)</span>
                  <input type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "var(--text-hi)", outline: "none", colorScheme: "dark" }} />
                </div>
              )}
            </div>
          </div>

          {/* Right: subtasks + links */}
          <div style={{
            width: 230, flexShrink: 0,
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div className="tf-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 16px 18px" }}>

              {/* Subtasks */}
              <div>
                <label style={labelStyle}>
                  Subtasks{subtasks.length > 0 && <span style={{ color: listColor + "cc", marginLeft: 4 }}>· {subtasks.filter(s => s.isCompleted).length}/{subtasks.length}</span>}
                </label>
                {subtasks.map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <button onClick={() => toggleSubLocal(s.id)} style={{
                      width: 14, height: 14, minWidth: 14, borderRadius: "50%",
                      border: `1.4px solid ${s.isCompleted ? listColor : listColor + "80"}`,
                      background: s.isCompleted ? listColor : "transparent", cursor: "pointer",
                      padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {s.isCompleted && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#0b0d12" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2L5 8.5 9.5 3.8" /></svg>}
                    </button>
                    {editingSubId === s.id ? (
                      <input
                        autoFocus
                        value={editSubValue}
                        onChange={e => setEditSubValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { renameSubLocal(s.id, editSubValue); setEditingSubId(null); }
                          if (e.key === "Escape") setEditingSubId(null);
                        }}
                        onBlur={() => { if (editSubValue.trim()) renameSubLocal(s.id, editSubValue); setEditingSubId(null); }}
                        style={{
                          flex: 1, background: "transparent", border: 0,
                          borderBottom: `1px solid ${listColor}`,
                          padding: "0 0 1px", fontSize: 13, color: "var(--text-hi)",
                          outline: "none", minWidth: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{ flex: 1, fontSize: 13, color: s.isCompleted ? "var(--text-lo)" : "var(--text-md)", textDecoration: s.isCompleted ? "line-through" : "none", cursor: "text" }}
                        onDoubleClick={() => { setEditingSubId(s.id); setEditSubValue(s.title); }}
                      >{s.title}</span>
                    )}
                    <button onClick={() => removeSub(s.id)} style={{ background: "transparent", border: 0, color: "var(--text-mute)", cursor: "pointer", padding: 2, borderRadius: 4, display: "flex", flexShrink: 0 }}>
                      <XIcon size={11} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1.4px dashed rgba(255,255,255,0.15)", flexShrink: 0 }} />
                  <input
                    value={newSub} onChange={e => setNewSub(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }}
                    onFocus={() => setFocusField("sub")} onBlur={() => setFocusField(null)}
                    placeholder="Add subtask…"
                    style={{
                      flex: 1, background: "transparent", border: 0,
                      borderBottom: `1px solid ${focusField === "sub" ? listColor : "rgba(255,255,255,0.08)"}`,
                      padding: "4px 0", fontSize: 13, color: "var(--text-hi)", outline: "none",
                      transition: "border-color 200ms",
                    }}
                  />
                </div>
              </div>

              {/* Links */}
              <div style={{ marginTop: 22 }}>
                <label style={labelStyle}>Links{links.length > 0 && ` · ${links.length}`}</label>
                {links.map(lk => (
                  <div key={lk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                    <span style={{ width: 15, height: 15, borderRadius: 4, background: faviconColor(lk.url), display: "inline-flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.5)", flexShrink: 0 }}>
                      <LinkIcon />
                    </span>
                    <a href={lk.url} target="_blank" rel="noreferrer" style={{
                      flex: 1, fontSize: 12, color: "var(--text-md)", textDecoration: "none",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-hi)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-md)")}
                    >{lk.title}</a>
                    <button onClick={() => removeLink(lk.id)} style={{ background: "transparent", border: 0, color: "var(--text-mute)", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}>
                      <XIcon size={11} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                  <input
                    value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
                    onFocus={() => setFocusField("lu")} onBlur={() => setFocusField(null)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                    placeholder="Paste URL…"
                    style={{
                      flex: 1, background: "transparent", border: 0,
                      borderBottom: `1px solid ${focusField === "lu" ? listColor : "rgba(255,255,255,0.08)"}`,
                      padding: "4px 0", fontSize: 12.5, color: "var(--text-hi)", outline: "none",
                      transition: "border-color 200ms",
                    }}
                  />
                  <button onClick={addLink} style={{ padding: "4px 8px", background: "transparent", border: 0, color: listColor, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Add</button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 22px", borderTop: "1px solid rgba(255,255,255,0.04)",
          background: "rgba(255,255,255,0.01)",
        }}>
          <div>
            {isEditing && (
              <button onClick={handleDelete} style={{
                background: "transparent", border: 0, color: "var(--text-lo)", fontSize: 12, cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, transition: "color 160ms",
              }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--accent-overdue)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-lo)")}
              >
                <TrashIcon /> Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onClose} style={{ background: "transparent", border: 0, color: "var(--text-md)", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={submit} disabled={saving || !title.trim()} style={{
              background: title.trim() ? listColor : "rgba(255,255,255,0.06)",
              color: title.trim() ? "#0b0d12" : "var(--text-mute)",
              border: 0, padding: "8px 16px", borderRadius: 8,
              fontSize: 12.5, fontWeight: 600, cursor: title.trim() ? "pointer" : "not-allowed",
              boxShadow: title.trim() ? `0 4px 16px ${listColor}55` : "none",
              transition: "all 180ms",
            }}>
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const XIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const TrashIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
  </svg>
);
const LinkIcon = () => (
  <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);
