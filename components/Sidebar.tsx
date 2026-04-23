"use client";

import { useEffect, useRef, useState } from "react";
import { TaskList } from "@/lib/types";

const PRESET_COLORS = [
  "#7c9dff", "#ec5b9c", "#f5884a", "#4fd6a5",
  "#5bb5ef", "#a78bfa", "#ef5b6a", "#f5c847",
];

interface Props {
  lists: (TaskList & { count: number })[];
  selectedListId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, color: string) => void;
  allCount: number;
  hiddenLists: Set<string>;
  onToggleHidden: (id: string) => void;
}

export default function Sidebar({ lists, selectedListId, onSelect, onCreate, allCount, hiddenLists, onToggleHidden }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState({ top: 0, color: "#7c9dff", visible: false });
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedListId) { setIndicator(i => ({ ...i, visible: false })); return; }
    const el = itemRefs.current[selectedListId];
    if (el && listRef.current) {
      const cRect = listRef.current.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const list = lists.find(l => l.id === selectedListId);
      setIndicator({ top: r.top - cRect.top + 6, color: list?.color || "#7c9dff", visible: true });
    }
  }, [selectedListId, lists]);

  const submit = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newColor);
    setNewName(""); setCreating(false);
  };

  const topItem = (id: string, icon: React.ReactNode, label: string, count?: number) => {
    const active = selectedListId === id;
    return (
      <div
        ref={el => { itemRefs.current[id] = el; }}
        onClick={() => onSelect(id)}
        onMouseEnter={() => setHoverId(id)}
        onMouseLeave={() => setHoverId(null)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "7px 14px 7px 18px", cursor: "pointer",
          color: active ? "var(--text-hi)" : "var(--text-md)",
          fontSize: 13, fontWeight: 500, transition: "color 160ms",
        }}
      >
        <span style={{ color: active ? "var(--text-hi)" : "var(--text-lo)", display: "inline-flex" }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {count != null && (
          <span style={{ fontSize: 11, color: "var(--text-mute)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
        )}
      </div>
    );
  };

  return (
    <aside style={{
      width: 220, flexShrink: 0, height: "100%",
      background: "var(--bg-sidebar)",
      display: "flex", flexDirection: "column", position: "relative",
    }}>
      {/* Brand */}
      <div style={{ padding: "18px 18px 14px", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 7,
          background: "linear-gradient(135deg, #7c9dff, #a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(124,157,255,0.35)",
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.2L5 8.5 9.5 3.8" />
          </svg>
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.1 }}>TaskFlow</span>
      </div>

      {/* Top items */}
      <div style={{ paddingBottom: 8 }}>
        {topItem("__all", <InboxIcon />, "All tasks", allCount)}
        {topItem("__starred", <StarIcon />, "Starred")}
      </div>

      {/* Lists header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 6px" }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.4, color: "var(--text-mute)", textTransform: "uppercase" }}>Lists</span>
        <button
          onClick={() => setCreating(true)}
          style={{ background: "transparent", border: 0, padding: 2, borderRadius: 4, color: "var(--text-lo)", cursor: "pointer", display: "flex", transition: "color 140ms" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-hi)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-lo)")}
        >
          <PlusIcon />
        </button>
      </div>

      {/* List items + sliding indicator */}
      <div ref={listRef} className="tf-scroll" style={{ flex: 1, overflowY: "auto", position: "relative", paddingBottom: 10 }}>
        {/* Sliding bar */}
        <div style={{
          position: "absolute", left: 0, top: indicator.top, width: 3, height: 18,
          borderRadius: "0 2px 2px 0",
          background: indicator.color,
          boxShadow: `0 0 12px ${indicator.color}99`,
          transition: "top 280ms cubic-bezier(.3,.7,.2,1), background 220ms",
          opacity: indicator.visible ? 1 : 0,
          pointerEvents: "none",
        }} />

        {lists.map(list => {
          const active = selectedListId === list.id;
          const hover = hoverId === list.id;
          const hidden = hiddenLists.has(list.id);
          return (
            <div
              key={list.id}
              ref={el => { itemRefs.current[list.id] = el; }}
              onClick={() => onSelect(list.id)}
              onMouseEnter={() => setHoverId(list.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 14px 7px 18px", cursor: "pointer",
                color: active ? "var(--text-hi)" : "var(--text-md)",
                fontSize: 13, fontWeight: 500,
                opacity: hidden ? 0.45 : 1,
                transition: "color 160ms, opacity 160ms",
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: list.color,
                boxShadow: active && !hidden ? `0 0 8px ${list.color}` : "none",
                transition: "box-shadow 220ms", flexShrink: 0,
              }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: hidden ? "line-through" : "none", textDecorationColor: "var(--text-mute)" }}>
                {list.name}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onToggleHidden(list.id); }}
                title={hidden ? "Show list" : "Hide list"}
                style={{
                  background: "transparent", border: 0, padding: 3, borderRadius: 4,
                  color: hidden ? list.color : "var(--text-mute)",
                  cursor: "pointer", display: "flex",
                  opacity: hover || hidden ? 1 : 0,
                  transition: "opacity 140ms, color 140ms",
                }}
              >
                {hidden ? <EyeOffIcon /> : <EyeIcon />}
              </button>
              <span style={{
                fontSize: 11, color: "var(--text-mute)", fontVariantNumeric: "tabular-nums",
                opacity: hover ? 0 : 1, transition: "opacity 140ms", minWidth: 14, textAlign: "right",
              }}>{list.count}</span>
            </div>
          );
        })}

        {/* Inline create */}
        {creating && (
          <div style={{ padding: "10px 14px 4px 18px", animation: "tf-slideDown 220ms ease" }}>
            <input
              autoFocus value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setCreating(false); setNewName(""); } }}
              placeholder="List name…"
              style={{
                width: "100%", background: "transparent", border: 0,
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                padding: "4px 0", fontSize: 13, color: "var(--text-hi)", outline: "none",
              }}
              onFocus={e => (e.currentTarget.style.borderBottomColor = newColor)}
              onBlur={e => (e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.12)")}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)} style={{
                  width: 16, height: 16, borderRadius: "50%", background: c,
                  border: 0, cursor: "pointer", padding: 0,
                  transform: newColor === c ? "scale(1.18)" : "scale(1)",
                  boxShadow: newColor === c ? `0 0 0 1.5px var(--bg-sidebar), 0 0 0 2.5px ${c}` : "none",
                  transition: "transform 180ms, box-shadow 180ms",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              <button onClick={submit} style={{
                background: newColor, color: "#0b0d12", border: 0,
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>Create</button>
              <button onClick={() => { setCreating(false); setNewName(""); }} style={{
                background: "transparent", border: 0, color: "var(--text-lo)",
                padding: "4px 8px", fontSize: 11, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Create new list (ghost) */}
      {!creating && (
        <button
          onClick={() => setCreating(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", margin: "0 0 6px",
            background: "transparent", border: 0,
            color: "var(--text-lo)", fontSize: 12.5, fontWeight: 500,
            cursor: "pointer", textAlign: "left", transition: "color 140ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-hi)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-lo)")}
        >
          <PlusIcon /> Create new list
        </button>
      )}

      {/* Logout */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 9, borderTop: "1px solid var(--border-softer)" }}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: "linear-gradient(135deg, #f5884a, #ec5b9c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 11, fontWeight: 600,
        }}>A</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--text-hi)", fontWeight: 500, lineHeight: 1.2 }}>My Tasks</div>
          <div style={{ fontSize: 10.5, color: "var(--text-mute)", lineHeight: 1.2, marginTop: 1 }}>Personal</div>
        </div>
        <a href="/auth/logout" style={{
          background: "transparent", border: 0, color: "var(--text-mute)",
          cursor: "pointer", padding: 4, borderRadius: 4, display: "flex", textDecoration: "none",
          transition: "color 140ms",
        }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-hi)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-mute)")}
        >
          <LogOutIcon />
        </a>
      </div>
    </aside>
  );
}

// Inline icons (matching prototype style)
const I = ({ d, d2 }: { d: string; d2?: string }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={d} />{d2 && <path d={d2} />}
  </svg>
);
const PlusIcon = () => <I d="M12 5v14M5 12h14" />;
const InboxIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);
const StarIcon = () => <I d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const EyeIcon = () => <I d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" d2="M9.09 9a3 3 0 015.82 1c0 2-3 3-3 3" />;
const EyeOffIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12A3 3 0 1110 9.88" /><path d="M1 1l22 22" />
  </svg>
);
const LogOutIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
  </svg>
);
