"use client";

import { useRef, useState } from "react";

interface ImportTask {
  title: string;
  deadline: string | null;
  notes: string | null;
  recurrenceType: string;
}

interface ImportList {
  name: string;
  tasks: ImportTask[];
}

function parseGoogleDate(str: string): string | null {
  const s = str.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (s === "yesterday") {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }
  if (s === "today") return today.toISOString().split("T")[0];
  if (s === "tomorrow") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // "Mon, Apr 27" or "Apr 27"
  const shortMatch = str.match(/^(?:[A-Za-z]+,\s*)?([A-Za-z]+ \d+)$/);
  if (shortMatch) {
    const d = new Date(`${shortMatch[1]}, ${today.getFullYear()}`);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function extractHtmlFromMhtml(mhtml: string): string {
  const boundaryMatch = mhtml.match(/boundary="([^"]+)"/);
  if (!boundaryMatch) return mhtml;
  const boundary = "--" + boundaryMatch[1];
  const parts = mhtml.split(boundary);
  for (const part of parts) {
    if (/Content-Type:\s*text\/html/i.test(part)) {
      const bodyStart = part.indexOf("\r\n\r\n");
      const body = bodyStart !== -1 ? part.slice(bodyStart + 4) : part;
      const isQP = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
      return isQP ? decodeQuotedPrintable(body) : body;
    }
  }
  return mhtml;
}

function parseGoogleTasksHTML(html: string): ImportList[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Build listId → name from sidebar nav entries
  const listNameMap = new Map<string, string>();
  doc.querySelectorAll("[data-task-list-id]").forEach(el => {
    const label = el.getAttribute("aria-label") ?? "";
    const match = label.match(/^(.+?)\.\s*\d+\s+active tasks\.?$/i);
    if (match) {
      listNameMap.set(el.getAttribute("data-task-list-id")!, match[1].trim());
    }
  });

  const result: ImportList[] = [];
  const seen = new Set<string>();

  // Panels are elements with both data-task-list-id and data-num-completed
  doc.querySelectorAll("[data-task-list-id][data-num-completed]").forEach(panelEl => {
    const listId = panelEl.getAttribute("data-task-list-id")!;
    if (seen.has(listId)) return;
    seen.add(listId);

    const listName = listNameMap.get(listId) ?? "Imported";
    const tasks: ImportTask[] = [];

    panelEl.querySelectorAll("[data-task-id]").forEach(taskEl => {
      const label = taskEl.getAttribute("aria-label") ?? "";
      if (!label) return;
      // skip completed tasks (label ends with "completed on <date>")
      if (/completed on .+$/i.test(label)) return;
      if (label.includes("Press enter") || label.toLowerCase().startsWith("mark completed")) return;

      let title: string | null = null;
      let deadline: string | null = null;
      const isRepeating = /,\s*repeating$/i.test(label);
      const recurrenceType = isRepeating ? "DAILY" : "NONE";

      const deadlineMatch = label.match(/^(.+?)\s+with deadline Due (.+)$/);
      const dateMatch = label.match(/^(.+?)\s+with date ([^,]+)/);
      if (deadlineMatch) {
        title = deadlineMatch[1].trim();
        deadline = parseGoogleDate(deadlineMatch[2].replace(/,\s*repeating$/i, "").trim());
      } else if (dateMatch) {
        title = dateMatch[1].trim();
        deadline = parseGoogleDate(dateMatch[2].trim());
      } else {
        title = label.replace(/\s+with date .+$/, "").trim();
      }

      if (title) tasks.push({ title, deadline, notes: null, recurrenceType });
    });

    result.push({ name: listName, tasks });
  });

  return result;
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportModal({ onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ImportList[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const raw = ev.target?.result as string;
        const html = file.name.endsWith(".mhtml") || file.name.endsWith(".mht")
          ? extractHtmlFromMhtml(raw)
          : raw;
        const lists = parseGoogleTasksHTML(html);
        if (lists.length === 0) {
          setError("No task lists found. Make sure this is a saved Google Tasks page.");
          return;
        }
        setParsed(lists);
      } catch {
        setError("Failed to parse file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/import/google-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lists: parsed }),
      });
      if (!res.ok) throw new Error("Import failed");
      onImported();
      onClose();
    } catch {
      setError("Import failed. Try again.");
      setLoading(false);
    }
  };

  const totalTasks = parsed?.reduce((s, l) => s + l.tasks.length, 0) ?? 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-card, #1c1c1e)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw",
          color: "var(--text-hi, #fff)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Import from Google Tasks</h2>
          <button onClick={onClose} style={{ background: "none", border: 0, color: "var(--text-lo, #888)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "var(--text-mute, #666)", lineHeight: 1.5 }}>
          In Google Tasks, press <strong>Ctrl+S</strong> (or File → Save Page As) and save as <strong>Webpage, Single File (.mhtml)</strong>,
          then upload that file here.
        </p>

        {!parsed ? (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.03)", color: "var(--text-lo, #888)", cursor: "pointer",
              fontSize: 13, transition: "background 160ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
          >
            Choose MHTML file
          </button>
        ) : (
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Found {parsed.length} list{parsed.length !== 1 ? "s" : ""}, {totalTasks} task{totalTasks !== 1 ? "s" : ""}
            </div>
            {parsed.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-lo, #888)", marginTop: 4 }}>
                {l.name} — {l.tasks.length} task{l.tasks.length !== 1 ? "s" : ""}
              </div>
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept=".mhtml,.mht,.html,.htm" style={{ display: "none" }} onChange={handleFile} />

        {error && (
          <p style={{ color: "#f87171", fontSize: 12, margin: "10px 0 0" }}>{error}</p>
        )}

        {parsed && (
          <button
            onClick={handleImport}
            disabled={loading}
            style={{
              marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 8,
              background: "#6366f1", border: 0, color: "#fff",
              fontSize: 13, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Importing…" : `Import ${totalTasks} tasks`}
          </button>
        )}
      </div>
    </div>
  );
}
