"use client";

import { Plus } from "lucide-react";
import FilterBar from "./FilterBar";
import TaskItem from "./TaskItem";
import { Task, TaskList } from "@/lib/types";

interface Props {
  tasks: Task[];
  selectedListId: string | null;
  lists: TaskList[];
  filterPriority: string;
  filterDue: string;
  onFilterPriority: (v: string) => void;
  onFilterDue: (v: string) => void;
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string, isCompleted: boolean) => void;
}

export default function TaskPanel({
  tasks, selectedListId, lists, filterPriority, filterDue,
  onFilterPriority, onFilterDue, onCreateTask, onEditTask,
  onToggleComplete, onDeleteTask, onToggleSubtask,
}: Props) {
  const selectedList = lists.find((l) => l.id === selectedListId);

  if (!selectedListId) {
    return (
      <main className="flex-1 flex items-center justify-center text-gray-400">
        Select or create a list to get started.
      </main>
    );
  }

  const incomplete = tasks.filter((t) => !t.isCompleted);
  const complete = tasks.filter((t) => t.isCompleted);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          {selectedList && (
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: selectedList.color }}
            />
          )}
          <h1 className="text-lg font-semibold text-gray-900">
            {selectedList?.name ?? "Tasks"}
          </h1>
          <span className="text-sm text-gray-400">{incomplete.length} remaining</span>
        </div>
        <button
          onClick={onCreateTask}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add task
        </button>
      </div>

      <FilterBar
        filterPriority={filterPriority}
        filterDue={filterDue}
        onFilterPriority={onFilterPriority}
        onFilterDue={onFilterDue}
      />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500 text-sm">No tasks here. Add one to get started!</p>
          </div>
        ) : (
          <>
            {incomplete.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                list={selectedList!}
                onToggle={onToggleComplete}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleSubtask={onToggleSubtask}
              />
            ))}
            {complete.length > 0 && (
              <>
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">Completed ({complete.length})</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                {complete.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    list={selectedList!}
                    onToggle={onToggleComplete}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onToggleSubtask={onToggleSubtask}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
