"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X, Plus, Trash2, ExternalLink } from "lucide-react";
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
  NONE: "Does not repeat",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  CUSTOM_INTERVAL: "Custom interval",
  CUSTOM_DAYS: "Specific days",
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function TaskModal({ task, listId, lists, onClose }: Props) {
  const isEditing = !!task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [deadline, setDeadline] = useState(
    task?.deadline ? format(new Date(task.deadline), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task?.recurrenceType ?? "NONE");
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrenceInterval?.toString() ?? "1");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(task?.recurrenceDays ?? []);
  const [recurrenceUnit, setRecurrenceUnit] = useState(task?.recurrenceUnit ?? "day");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    task?.recurrenceEndDate ? format(new Date(task.recurrenceEndDate), "yyyy-MM-dd") : ""
  );
  const [selectedListId, setSelectedListId] = useState(task?.listId ?? listId ?? "");

  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState("");
  const [links, setLinks] = useState<TaskLink[]>(task?.links ?? []);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "subtasks" | "links">("details");

  const handleSubmit = async () => {
    if (!title.trim() || !selectedListId) return;
    setSaving(true);

    const body = {
      listId: selectedListId,
      title: title.trim(),
      description: description || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      priority,
      recurrenceType,
      recurrenceInterval: recurrenceType === "CUSTOM_INTERVAL" ? Number(recurrenceInterval) : null,
      recurrenceDays: recurrenceType === "CUSTOM_DAYS" ? recurrenceDays : [],
      recurrenceUnit: recurrenceType === "CUSTOM_INTERVAL" ? recurrenceUnit : null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : null,
    };

    let savedTaskId = task?.id;

    if (isEditing && task) {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        savedTaskId = created.id;
      }
    }

    // Sync subtasks for new tasks
    if (!isEditing && savedTaskId) {
      for (const sub of subtasks) {
        await fetch(`/api/tasks/${savedTaskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: sub.title }),
        });
      }
      for (const link of links) {
        await fetch(`/api/tasks/${savedTaskId}/links`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: link.title, url: link.url }),
        });
      }
    }

    setSaving(false);
    onClose();
  };

  const addSubtask = async () => {
    if (!newSubtask.trim()) return;
    if (isEditing && task) {
      const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtask.trim() }),
      });
      if (res.ok) {
        const sub = await res.json();
        setSubtasks((prev) => [...prev, sub]);
      }
    } else {
      setSubtasks((prev) => [...prev, {
        id: `temp-${Date.now()}`, taskId: "", title: newSubtask.trim(), isCompleted: false, position: prev.length,
      }]);
    }
    setNewSubtask("");
  };

  const removeSubtask = async (subtaskId: string) => {
    if (isEditing && task && !subtaskId.startsWith("temp-")) {
      await fetch(`/api/tasks/${task.id}/subtasks?subtaskId=${subtaskId}`, { method: "DELETE" });
    }
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
  };

  const addLink = async () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    const url = newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`;
    if (isEditing && task) {
      const res = await fetch(`/api/tasks/${task.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newLinkTitle.trim(), url }),
      });
      if (res.ok) {
        const link = await res.json();
        setLinks((prev) => [...prev, link]);
      }
    } else {
      setLinks((prev) => [...prev, {
        id: `temp-${Date.now()}`, taskId: "", title: newLinkTitle.trim(), url,
      }]);
    }
    setNewLinkTitle("");
    setNewLinkUrl("");
  };

  const removeLink = async (linkId: string) => {
    if (isEditing && task && !linkId.startsWith("temp-")) {
      await fetch(`/api/tasks/${task.id}/links?linkId=${linkId}`, { method: "DELETE" });
    }
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  const toggleDay = (day: string) => {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEditing ? "Edit task" : "New task"}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(["details", "subtasks", "links"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {tab === "subtasks" && subtasks.length > 0 && (
                <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {subtasks.length}
                </span>
              )}
              {tab === "links" && links.length > 0 && (
                <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {links.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === "details" && (
            <>
              <div>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full text-base font-medium border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
              </div>

              {/* List */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">List</label>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 bg-white"
                >
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Priority</label>
                <div className="flex gap-2 flex-wrap">
                  {PRIORITY_ORDER.map((p) => {
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          priority === p ? `${cfg.tailwindBg} text-white border-transparent` : `${cfg.tailwindLight} hover:opacity-80`
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Deadline</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 bg-white"
                />
              </div>

              {/* Recurrence */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Repeat</label>
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 bg-white mb-2"
                >
                  {(Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((r) => (
                    <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                  ))}
                </select>

                {recurrenceType === "CUSTOM_INTERVAL" && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-600">Every</span>
                    <input
                      type="number"
                      min={1}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(e.target.value)}
                      className="w-16 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                    />
                    <select
                      value={recurrenceUnit}
                      onChange={(e) => setRecurrenceUnit(e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="day">day(s)</option>
                      <option value="week">week(s)</option>
                    </select>
                  </div>
                )}

                {recurrenceType === "CUSTOM_DAYS" && (
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          recurrenceDays.includes(day)
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {recurrenceType !== "NONE" && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 block mb-1">End date (optional)</label>
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-white"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "subtasks" && (
            <div>
              <div className="space-y-2 mb-3">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 group">
                    <input type="checkbox" checked={sub.isCompleted} readOnly className="rounded border-gray-300 accent-indigo-600" />
                    <span className={`flex-1 text-sm ${sub.isCompleted ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {sub.title}
                    </span>
                    <button
                      onClick={() => removeSubtask(sub.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No subtasks yet.</p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
                  placeholder="Add subtask…"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                />
                <button
                  onClick={addSubtask}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div>
              <div className="space-y-2 mb-3">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center gap-2 group bg-gray-50 rounded-lg px-3 py-2">
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-indigo-700 hover:underline truncate"
                    >
                      {link.title}
                    </a>
                    <button
                      onClick={() => removeLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {links.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No links yet.</p>
                )}
              </div>
              <div className="space-y-2">
                <input
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Link title (e.g. PR #42)"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                />
                <div className="flex gap-2">
                  <input
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
                    placeholder="https://…"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={addLink}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}
