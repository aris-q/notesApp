"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg } from "@fullcalendar/core";
import { addDays } from "date-fns";
import { PRIORITY_CONFIG } from "@/lib/priority";
import { expandRecurrence } from "@/lib/recurrence";
import { Task, TaskList } from "@/lib/types";
import { RecurrenceType } from "@prisma/client";
import TaskModal from "./TaskModal";

export default function CalendarView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const fetchAll = useCallback(async () => {
    const listsRes = await fetch("/api/lists");
    if (!listsRes.ok) return;
    const fetchedLists: TaskList[] = await listsRes.json();
    setLists(fetchedLists);

    const allTasks: Task[] = [];
    for (const list of fetchedLists) {
      const res = await fetch(`/api/tasks?listId=${list.id}`);
      if (res.ok) {
        const lt: Task[] = await res.json();
        allTasks.push(...lt);
      }
    }
    setTasks(allTasks);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const events: EventInput[] = [];

  for (const task of tasks) {
    if (!task.deadline) continue;
    const cfg = PRIORITY_CONFIG[task.priority];
    const base: EventInput = {
      id: task.id,
      title: task.title,
      start: task.deadline,
      color: cfg.hex,
      extendedProps: { taskId: task.id },
      classNames: task.isCompleted ? ["opacity-50", "line-through"] : [],
    };
    events.push(base);

    // Expand recurrences up to 90 days
    const expandedDates = expandRecurrence(
      {
        deadline: new Date(task.deadline),
        recurrenceType: task.recurrenceType as RecurrenceType,
        recurrenceInterval: task.recurrenceInterval,
        recurrenceDays: task.recurrenceDays,
        recurrenceUnit: task.recurrenceUnit,
        recurrenceEndDate: task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null,
      },
      addDays(new Date(), 90)
    );
    for (const date of expandedDates) {
      events.push({
        ...base,
        id: `${task.id}-${date.toISOString()}`,
        start: date.toISOString(),
        extendedProps: { taskId: task.id },
      });
    }
  }

  const handleEventClick = (info: EventClickArg) => {
    const taskId = info.event.extendedProps.taskId as string;
    const found = tasks.find((t) => t.id === taskId);
    if (found) setEditingTask(found);
  };

  return (
    <div className="h-full bg-white rounded-xl border border-gray-200 p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        eventClick={handleEventClick}
        height="100%"
        eventDisplay="block"
        eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
      />
      {editingTask && (
        <TaskModal
          task={editingTask}
          listId={editingTask.listId}
          lists={lists}
          onClose={() => { setEditingTask(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
