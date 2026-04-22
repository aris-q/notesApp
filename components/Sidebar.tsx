"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { TaskList } from "@/lib/types";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f97316", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#eab308",
];

interface Props {
  lists: TaskList[];
  selectedListId: string | null;
  onSelect: (id: string) => void;
  onListsChange: () => void;
}

export default function Sidebar({ lists, selectedListId, onSelect, onListsChange }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      const list = await res.json();
      setCreating(false);
      setNewName("");
      onListsChange();
      onSelect(list.id);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    onListsChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this list and all its tasks?")) return;
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    onListsChange();
  };

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lists</span>
        <button
          onClick={() => setCreating(true)}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          title="New list"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {creating && (
        <div className="px-3 py-2 border-b border-gray-100">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setCreating(false); setNewName(""); }
            }}
            placeholder="List name…"
            className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-2 outline-none focus:border-indigo-400"
          />
          <div className="flex gap-1 flex-wrap mb-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{ background: c }}
                className={`w-5 h-5 rounded-full transition-transform ${newColor === c ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={handleCreate} className="flex-1 text-xs bg-indigo-600 text-white rounded py-1 hover:bg-indigo-700 transition-colors">
              Create
            </button>
            <button onClick={() => { setCreating(false); setNewName(""); }} className="text-xs px-2 text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {lists.map((list) => (
          <div
            key={list.id}
            className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
              selectedListId === list.id ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            onClick={() => onSelect(list.id)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: list.color }}
            />
            {editingId === list.id ? (
              <div className="flex-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(list.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 text-sm border border-gray-200 rounded px-1 outline-none focus:border-indigo-400"
                />
                <button onClick={() => handleRename(list.id)} className="text-green-600 hover:text-green-700">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm truncate font-medium text-gray-700">{list.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{list._count?.tasks ?? 0}</span>
                <div className="hidden group-hover:flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingId(list.id); setEditName(list.name); }}
                    className="p-0.5 text-gray-400 hover:text-gray-700 rounded"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {lists.length === 0 && !creating && (
          <p className="text-xs text-gray-400 text-center py-6 px-3">
            No lists yet. Click + to create one.
          </p>
        )}
      </div>
    </aside>
  );
}
