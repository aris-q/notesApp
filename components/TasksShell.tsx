"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import TaskPanel from "./TaskPanel";
import TaskModal from "./TaskModal";
import { Task, TaskList } from "@/lib/types";

export default function TasksShell() {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterDue, setFilterDue] = useState<string>("ALL");

  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/lists");
    if (!res.ok) return;
    const data: TaskList[] = await res.json();
    setLists(data);
    if (data.length > 0 && !selectedListId) {
      setSelectedListId(data[0].id);
    }
  }, [selectedListId]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const fetchTasks = useCallback(async () => {
    if (!selectedListId) return;
    const params = new URLSearchParams({ listId: selectedListId });
    if (filterPriority !== "ALL") params.set("priority", filterPriority);
    if (filterDue === "OVERDUE") {
      params.set("dueBefore", new Date().toISOString());
    } else if (filterDue === "TODAY") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      params.set("dueAfter", start.toISOString());
      params.set("dueBefore", end.toISOString());
    } else if (filterDue === "THIS_WEEK") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      params.set("dueAfter", start.toISOString());
      params.set("dueBefore", end.toISOString());
    } else if (filterDue === "THIS_MONTH") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      params.set("dueAfter", start.toISOString());
      params.set("dueBefore", end.toISOString());
    }

    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (!res.ok) return;
    setTasks(await res.json());
  }, [selectedListId, filterPriority, filterDue]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreate = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    fetchTasks();
    fetchLists();
  };

  const handleToggleComplete = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });
    fetchTasks();
  };

  const handleDeleteTask = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    fetchTasks();
    fetchLists();
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string, isCompleted: boolean) => {
    await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId, isCompleted }),
    });
    fetchTasks();
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        lists={lists}
        selectedListId={selectedListId}
        onSelect={setSelectedListId}
        onListsChange={fetchLists}
      />
      <TaskPanel
        tasks={tasks}
        selectedListId={selectedListId}
        lists={lists}
        filterPriority={filterPriority}
        filterDue={filterDue}
        onFilterPriority={setFilterPriority}
        onFilterDue={setFilterDue}
        onCreateTask={openCreate}
        onEditTask={openEdit}
        onToggleComplete={handleToggleComplete}
        onDeleteTask={handleDeleteTask}
        onToggleSubtask={handleToggleSubtask}
      />
      {isModalOpen && (
        <TaskModal
          task={editingTask}
          listId={selectedListId}
          lists={lists}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
