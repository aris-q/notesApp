"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Column from "./Column";
import TaskModal from "./TaskModal";
import CalendarView from "./CalendarView";
import ImportModal from "./ImportModal";
import { Task, TaskList } from "@/lib/types";

type View = "tasks" | "calendar";

function SkeletonColumns() {
  return (
    <>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ width: 420, flexShrink: 0, padding: "18px 10px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
              <div className="tf-skel" style={{ width: 8, height: 8, borderRadius: "50%" }} />
              <div className="tf-skel" style={{ height: 11, width: 110 }} />
              <div className="tf-skel" style={{ height: 11, width: 24, marginLeft: "auto" }} />
            </div>
            {[0, 1, 2, 3].map(j => (
              <div key={j} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div className="tf-skel" style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="tf-skel" style={{ height: 11, width: `${60 + (j * 13) % 30}%`, marginBottom: 6 }} />
                  <div className="tf-skel" style={{ height: 9, width: "38%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function TasksShell() {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [tasksByList, setTasksByList] = useState<Record<string, Task[]>>({});
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ listId: string | null; task: Task | null; defaultDate?: Date } | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState<Record<string, boolean>>({});
  const [confettiListId, setConfettiListId] = useState<string | null>(null);
  const [view, setView] = useState<View>("tasks");
  const [hiddenLists, setHiddenLists] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const visibleListsRef = useRef<typeof visibleLists>([]);

  const toggleHidden = (id: string) =>
    setHiddenLists(h => { const n = new Set(h); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── data fetching ──────────────────────────────────────────
  const fetchAllTasks = useCallback(async (listIds: string[]) => {
    const results = await Promise.all(
      listIds.map(async id => {
        const res = await fetch(`/api/tasks?listId=${id}`);
        if (!res.ok) return [id, []] as [string, Task[]];
        return [id, await res.json()] as [string, Task[]];
      })
    );
    setTasksByList(Object.fromEntries(results));
  }, []);

  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/lists");
    if (!res.ok) return;
    const data: TaskList[] = await res.json();
    setLists(data);
    if (data.length > 0) {
      if (!selectedListId) setSelectedListId(data[0].id);
      await fetchAllTasks(data.map(l => l.id));
    }
    setLoading(false);
  }, [fetchAllTasks, selectedListId]);

  useEffect(() => { fetchLists(); }, []); // eslint-disable-line

  const refresh = useCallback(async () => {
    const res = await fetch("/api/lists");
    if (!res.ok) return;
    const data: TaskList[] = await res.json();
    setLists(data);
    await fetchAllTasks(data.map(l => l.id));
  }, [fetchAllTasks]);

  // ── derived ────────────────────────────────────────────────
  const listsWithCounts = useMemo(
    () => lists.map(l => ({ ...l, count: (tasksByList[l.id] || []).filter(t => !t.isCompleted).length })),
    [lists, tasksByList]
  );
  const allTasks = useMemo(() => Object.values(tasksByList).flat(), [tasksByList]);
  const allCount = allTasks.filter(t => !t.isCompleted).length;
  const visibleLists = listsWithCounts.filter(l => !hiddenLists.has(l.id));
  visibleListsRef.current = visibleLists;

  // ── actions ────────────────────────────────────────────────
  const handleToggle = async (task: Task) => {
    const nowComplete = !task.isCompleted;
    // optimistic update
    setTasksByList(prev => ({
      ...prev,
      [task.listId]: (prev[task.listId] || []).map(t => t.id === task.id ? { ...t, isCompleted: nowComplete } : t),
    }));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: nowComplete }),
    });
    if (nowComplete) {
      const updated = (tasksByList[task.listId] || []).map(t => t.id === task.id ? { ...t, isCompleted: true } : t);
      if (updated.length > 0 && updated.every(t => t.isCompleted)) {
        setConfettiListId(task.listId);
        setTimeout(() => setConfettiListId(null), 1400);
      }
    }
    refresh();
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string, isCompleted: boolean) => {
    await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId, isCompleted }),
    });
    const res = await fetch(`/api/tasks?listId=${task.listId}`);
    if (res.ok) {
      const tasks: Task[] = await res.json();
      setTasksByList(prev => ({ ...prev, [task.listId]: tasks }));
    }
  };

  const handleDelete = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (modal?.task?.id === task.id) setModal(null);
    refresh();
  };

  const handleClearAllTasks = async () => {
    const total = allTasks.length;
    if (total === 0) return;
    if (!confirm(`Delete all ${total} task${total !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    await fetch("/api/tasks", { method: "DELETE" });
    refresh();
  };

  const handleDeleteAllLists = async () => {
    if (lists.length === 0) return;
    if (!confirm(`Delete all ${lists.length} list${lists.length !== 1 ? "s" : ""} and their tasks? This cannot be undone.`)) return;
    await fetch("/api/lists", { method: "DELETE" });
    setLists([]);
    setTasksByList({});
    setSelectedListId(null);
  };

  const openCreate = (listId: string | null, defaultDate?: Date) =>
    setModal({ listId: listId ?? selectedListId, task: null, defaultDate });

  const openEdit = (task: Task) => setModal({ listId: task.listId, task });

  const handleModalClose = async () => {
    // detect newly added task by refetching and comparing
    const before = Object.values(tasksByList).flat().map(t => t.id);
    setModal(null);
    await refresh();
    setTasksByList(cur => {
      const after = Object.values(cur).flat();
      const newTask = after.find(t => !before.includes(t.id));
      if (newTask) {
        setJustAddedId(newTask.id);
        setTimeout(() => setJustAddedId(null), 400);
      }
      return cur;
    });
  };

  const handleRenameSubtask = async (task: Task, subtaskId: string, title: string) => {
    if (!title.trim()) return;
    setTasksByList(prev => ({
      ...prev,
      [task.listId]: (prev[task.listId] || []).map(t =>
        t.id === task.id ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, title } : s) } : t
      ),
    }));
    await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId, title }),
    });
  };

  const handleRenameList = async (id: string, name: string) => {
    if (!name.trim()) return;
    setLists(prev => prev.map(l => l.id === id ? { ...l, name: name.trim() } : l));
    await fetch(`/api/lists/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
  };

  const handleDeleteList = async (listId: string) => {
    await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    const res = await fetch("/api/lists");
    if (!res.ok) return;
    const data: TaskList[] = await res.json();
    setLists(data);
    await fetchAllTasks(data.map(l => l.id));
    if (selectedListId === listId) {
      setSelectedListId(data.length > 0 ? data[0].id : null);
    }
  };

  const handleColumnsScroll = useCallback(() => {
    if (!columnsRef.current) return;
    const container = columnsRef.current;
    const centerX = container.scrollLeft + container.clientWidth / 2;
    let closestId: string | null = null;
    let closestDist = Infinity;
    visibleListsRef.current.forEach(list => {
      const el = container.querySelector(`[data-list-col="${list.id}"]`) as HTMLElement | null;
      if (el) {
        const colCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(colCenter - centerX);
        if (dist < closestDist) { closestDist = dist; closestId = list.id; }
      }
    });
    if (closestId) setSelectedListId(closestId);
  }, []);

  const createList = async (name: string, color: string) => {
    const res = await fetch("/api/lists", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const list = await res.json();
      await refresh();
      setSelectedListId(list.id);
    }
  };

  const onSelect = (id: string) => {
    setSelectedListId(id);
    setTimeout(() => {
      const el = document.querySelector(`[data-list-col="${id}"]`);
      if (el && columnsRef.current) {
        const r = el.getBoundingClientRect();
        const cr = columnsRef.current.getBoundingClientRect();
        const centerOffset = cr.width / 2 - r.width / 2;
        columnsRef.current.scrollTo({ left: columnsRef.current.scrollLeft + r.left - cr.left - centerOffset, behavior: "smooth" });
      }
    }, 30);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "transparent" }}>
      <Sidebar
        lists={listsWithCounts}
        selectedListId={selectedListId}
        onSelect={onSelect}
        onCreate={createList}
        onRename={handleRenameList}
        allCount={allCount}
        hiddenLists={hiddenLists}
        onToggleHidden={toggleHidden}
      />

      <main style={{ flex: 1, height: "100%", overflow: "hidden", background: "var(--bg-columns)", position: "relative" }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 22px", height: 52,
          borderBottom: "1px solid var(--border-softer)", position: "relative", zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-hi)", letterSpacing: -0.1 }}>My tasks</h1>
            <div style={{ display: "inline-flex", padding: 2, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>
              {([["tasks", "Tasks"], ["calendar", "Calendar"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setView(k)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 6,
                  background: view === k ? "rgba(255,255,255,0.08)" : "transparent",
                  color: view === k ? "var(--text-hi)" : "var(--text-lo)",
                  border: 0, fontSize: 11.5, fontWeight: 500, cursor: "pointer",
                  transition: "background 160ms, color 160ms",
                }}>{label}</button>
              ))}
            </div>
            <span style={{
              fontSize: 11, color: "var(--text-mute)", padding: "2px 8px", borderRadius: 999,
              background: "rgba(255,255,255,0.04)", fontVariantNumeric: "tabular-nums",
            }}>{allCount} open · {allTasks.filter(t => t.isCompleted).length} done</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setShowImport(true)}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-lo)", cursor: "pointer", padding: "4px 10px",
                borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 500, transition: "color 160ms, background 160ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-hi)"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-lo)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              title="Import from Google Tasks"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Import
            </button>
            <button
              onClick={handleClearAllTasks}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-lo)", cursor: "pointer", padding: "4px 10px",
                borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 500, transition: "color 160ms, background 160ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-lo)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              title="Clear all tasks"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              Clear all
            </button>
            <button
              onClick={handleDeleteAllLists}
              style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--text-lo)", cursor: "pointer", padding: "4px 10px",
                borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 500, transition: "color 160ms, background 160ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-lo)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              title="Delete all lists"
            >
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Delete all lists
            </button>
            <a href="/auth/logout" style={{
              background: "transparent", border: 0, color: "var(--text-lo)", cursor: "pointer",
              padding: 6, borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, textDecoration: "none", transition: "color 160ms",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-hi)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-lo)")}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
              </svg>
              Sign out
            </a>
          </div>
        </div>

        {view === "calendar" ? (
          <div style={{ height: "calc(100vh - 52px)", overflow: "hidden" }}>
            <CalendarView
              tasks={allTasks}
              lists={lists}
              onEditTask={openEdit}
              onAddTask={openCreate}
            />
          </div>
        ) : (
          <div
            ref={columnsRef}
            onScroll={handleColumnsScroll}
            style={{ height: "calc(100vh - 52px)", overflowX: "auto", overflowY: "hidden", display: "flex" }}
            className="tf-scroll"
          >
            {loading ? <SkeletonColumns /> : (
              <>
                {visibleLists.map(list => (
                  <div key={list.id} data-list-col={list.id} style={{ height: "100%", display: "flex" }}>
                    <Column
                      list={list}
                      tasks={tasksByList[list.id] || []}
                      selected={selectedListId === list.id}
                      onAddTask={id => openCreate(id)}
                      onToggle={handleToggle}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onToggleSubtask={handleToggleSubtask}
                      justAddedId={justAddedId}
                      completedOpen={completedOpen[list.id] ?? false}
                      onToggleCompletedOpen={id => setCompletedOpen(c => ({ ...c, [id]: !c[id] }))}
                      showConfetti={confettiListId === list.id}
                      onSelect={() => onSelect(list.id)}
                      onDeleteList={() => handleDeleteList(list.id)}
                      onRenameSubtask={handleRenameSubtask}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {modal && (
        <TaskModal
          task={modal.task}
          listId={modal.listId}
          lists={lists}
          onClose={handleModalClose}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={refresh}
        />
      )}
    </div>
  );
}
