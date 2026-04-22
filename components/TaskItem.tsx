"use client";

import { format, isPast, isToday } from "date-fns";
import { Link2, ChevronDown, ChevronUp, Pencil, Trash2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { PRIORITY_CONFIG } from "@/lib/priority";
import { Task } from "@/lib/types";

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string, isCompleted: boolean) => void;
}

export default function TaskItem({ task, onEdit, onDelete, onToggleComplete, onToggleSubtask }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[task.priority];

  const deadlineLabel = task.deadline
    ? (() => {
        const d = new Date(task.deadline);
        if (!task.isCompleted && isPast(d) && !isToday(d)) return { text: `Overdue · ${format(d, "MMM d")}`, cls: "text-red-600 font-medium" };
        if (isToday(d)) return { text: "Today", cls: "text-orange-600 font-medium" };
        return { text: format(d, "MMM d, yyyy"), cls: "text-gray-400" };
      })()
    : null;

  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;
  const hasExtras = task.subtasks.length > 0 || task.links.length > 0 || task.description;

  return (
    <div className={`group bg-white border rounded-lg mb-2 transition-all ${task.isCompleted ? "opacity-60" : ""} border-gray-200 hover:border-gray-300 hover:shadow-sm`}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task)}
          className={`mt-0.5 w-4.5 h-4.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
            task.isCompleted ? `${cfg.tailwindBg} border-transparent` : `${cfg.tailwindBorder} bg-white hover:bg-gray-50`
          }`}
          style={{ width: 18, height: 18, minWidth: 18 }}
        >
          {task.isCompleted && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path d="M2 6l3 3 5-5" /></svg>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${task.isCompleted ? "line-through text-gray-400" : "text-gray-900"}`}>
              {task.title}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.tailwindLight}`}>
              {cfg.label}
            </span>
            {task.recurrenceType !== "NONE" && (
              <span className="text-gray-400" title="Recurring"><RotateCcw className="w-3 h-3" /></span>
            )}
          </div>
          {deadlineLabel && (
            <p className={`text-xs mt-0.5 ${deadlineLabel.cls}`}>{deadlineLabel.text}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {task.subtasks.length > 0 && (
              <span className="text-xs text-gray-400">{completedSubtasks}/{task.subtasks.length} subtasks</span>
            )}
            {task.links.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Link2 className="w-3 h-3" />{task.links.length}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasExtras && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => onEdit(task)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-2 ml-7">
          {task.description && (
            <p className="text-sm text-gray-500 mb-2 whitespace-pre-wrap">{task.description}</p>
          )}
          {task.subtasks.length > 0 && (
            <div className="space-y-1 mb-2">
              {task.subtasks.map((sub) => (
                <label key={sub.id} className="flex items-center gap-2 cursor-pointer group/sub">
                  <input
                    type="checkbox"
                    checked={sub.isCompleted}
                    onChange={() => onToggleSubtask(task, sub.id, !sub.isCompleted)}
                    className="rounded border-gray-300 accent-indigo-600"
                  />
                  <span className={`text-sm ${sub.isCompleted ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {sub.title}
                  </span>
                </label>
              ))}
            </div>
          )}
          {task.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                  <Link2 className="w-3 h-3" />
                  {link.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
