"use client";

import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/priority";

interface Props {
  filterPriority: string;
  filterDue: string;
  onFilterPriority: (v: string) => void;
  onFilterDue: (v: string) => void;
}

const DUE_OPTIONS = [
  { value: "ALL", label: "Any date" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
];

export default function FilterBar({ filterPriority, filterDue, onFilterPriority, onFilterDue }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100 text-sm">
      <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Filter:</span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onFilterPriority("ALL")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            filterPriority === "ALL"
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {PRIORITY_ORDER.map((p) => {
          const cfg = PRIORITY_CONFIG[p];
          return (
            <button
              key={p}
              onClick={() => onFilterPriority(filterPriority === p ? "ALL" : p)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                filterPriority === p
                  ? `${cfg.tailwindBg} text-white border-transparent`
                  : `${cfg.tailwindLight} hover:opacity-80`
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="w-px h-4 bg-gray-200" />

      <select
        value={filterDue}
        onChange={(e) => onFilterDue(e.target.value)}
        className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-white"
      >
        {DUE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
