"use client";

import { useRef, useState } from "react";
import { Task, TaskList } from "@/lib/types";
import TaskItem from "./TaskItem";

interface Props {
  list: TaskList & { count: number };
  tasks: Task[];
  selected: boolean;
  onAddTask: (listId: string) => void;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleSubtask: (task: Task, subtaskId: string, isCompleted: boolean) => void;
  justAddedId: string | null;
  completedOpen: boolean;
  onToggleCompletedOpen: (listId: string) => void;
  showConfetti: boolean;
}

export default function Column({
  list, tasks, selected, onAddTask, onToggle, onEdit, onDelete,
  onToggleSubtask, justAddedId, completedOpen, onToggleCompletedOpen, showConfetti,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [addHover, setAddHover] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const accent = list.color;

  const incomplete = tasks.filter(t => !t.isCompleted);
  const complete = tasks.filter(t => t.isCompleted);

  return (
    <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", padding: "18px 10px 20px" }}>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 14,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden", position: "relative",
        boxShadow: selected
          ? `0 0 0 1px ${accent}44, 0 20px 40px -20px rgba(0,0,0,0.6)`
          : "0 8px 24px -12px rgba(0,0,0,0.5)",
        transition: "box-shadow 260ms",
      }}>
        {/* Sticky header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          background: scrolled ? "rgba(20,24,36,0.82)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          transition: "background 220ms",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 14px" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}`, flexShrink: 0 }} />
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: -0.3, color: "var(--text-hi)", flex: 1 }}>
              {list.name}
            </h3>
            <span style={{
              fontSize: 11, color: "var(--text-mute)", fontVariantNumeric: "tabular-nums",
              padding: "2px 8px", borderRadius: 999, background: "rgba(255,255,255,0.04)",
            }}>{incomplete.length}</span>
          </div>

          <button
            onClick={() => onAddTask(list.id)}
            onMouseEnter={() => setAddHover(true)}
            onMouseLeave={() => setAddHover(false)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "9px 18px",
              background: addHover ? `linear-gradient(90deg, ${accent}14 0%, transparent 60%)` : "transparent",
              border: 0, borderTop: "1px solid rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              color: addHover ? "var(--text-hi)" : "var(--text-lo)",
              fontSize: 12.5, fontWeight: 500, cursor: "pointer", textAlign: "left",
              transition: "all 180ms", position: "relative", overflow: "hidden",
            }}
          >
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
              background: accent, opacity: addHover ? 1 : 0,
              boxShadow: `0 0 12px ${accent}`,
              transition: "opacity 200ms",
            }} />
            <PlusIcon />
            Add a task
          </button>
        </div>

        {/* Scroll area */}
        <div
          ref={scrollRef}
          className="tf-scroll"
          onScroll={e => setScrolled((e.currentTarget as HTMLDivElement).scrollTop > 4)}
          style={{ flex: 1, overflowY: "auto", padding: "8px 6px 14px", scrollBehavior: "smooth" }}
        >
          {incomplete.length === 0 && complete.length === 0 && (
            <EmptyState accent={accent} onAdd={() => onAddTask(list.id)} />
          )}

          {incomplete.map(t => (
            <TaskItem
              key={t.id} task={t} list={list}
              onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
              onToggleSubtask={onToggleSubtask}
              justAdded={t.id === justAddedId}
            />
          ))}

          {complete.length > 0 && (
            <div style={{ marginTop: 10, padding: "0 8px" }}>
              <button
                onClick={() => onToggleCompletedOpen(list.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7, width: "100%",
                  padding: "7px 4px", background: "transparent", border: 0,
                  color: "var(--text-mute)", fontSize: 10.5, fontWeight: 600,
                  letterSpacing: 1.2, textTransform: "uppercase", cursor: "pointer",
                }}
              >
                <span style={{ display: "inline-flex", transform: completedOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 220ms" }}>
                  <ChevronRIcon />
                </span>
                <span>Completed</span>
                <span style={{
                  padding: "0 6px", borderRadius: 999,
                  background: accent + "18", color: accent + "cc",
                  fontSize: 10, fontVariantNumeric: "tabular-nums",
                }}>{complete.length}</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)", marginLeft: 2 }} />
              </button>
              <div style={{
                maxHeight: completedOpen ? complete.length * 80 + 40 : 0,
                opacity: completedOpen ? 1 : 0,
                overflow: "hidden",
                transition: "max-height 320ms ease, opacity 220ms",
              }}>
                {complete.map(t => (
                  <TaskItem
                    key={t.id} task={t} list={list}
                    onToggle={onToggle} onEdit={onEdit} onDelete={onDelete}
                    onToggleSubtask={onToggleSubtask}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {showConfetti && <ConfettiBurst accent={accent} />}
      </div>
    </div>
  );
}

function EmptyState({ accent, onAdd }: { accent: string; onAdd: () => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", textAlign: "center", minHeight: 240,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: `linear-gradient(135deg, ${accent}30, ${accent}08)`,
        border: `1px solid ${accent}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, marginBottom: 14, boxShadow: `0 0 24px ${accent}22`,
      }}>
        <SparklesIcon />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-hi)", marginBottom: 4 }}>No tasks yet</div>
      <div style={{ fontSize: 12, color: "var(--text-lo)", marginBottom: 14, lineHeight: 1.45 }}>
        A blank canvas. Capture what&apos;s on your mind.
      </div>
      <button
        onClick={onAdd}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          background: "transparent", border: `1px solid ${accent}40`,
          color: accent, fontSize: 12, fontWeight: 500, cursor: "pointer",
          transition: "all 180ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = accent + "15"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <PlusIcon /> Add your first task
      </button>
    </div>
  );
}

function ConfettiBurst({ accent }: { accent: string }) {
  const parts = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2;
    const dist = 80 + Math.random() * 60;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 30;
    const hue = [accent, "#f5c847", "#4fd6a5", "#a78bfa", "#ec5b9c"][i % 5];
    return { dx, dy, hue, delay: Math.random() * 80, size: 4 + Math.random() * 4 };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {parts.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: p.size, height: p.size, borderRadius: "50%",
          background: p.hue, boxShadow: `0 0 8px ${p.hue}`,
          animation: `tf-particleRise 1200ms ${p.delay}ms cubic-bezier(.2,.6,.3,1) forwards`,
          ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`,
        }} />
      ))}
    </div>
  );
}

const PlusIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ChevronRIcon = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const SparklesIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
  </svg>
);
