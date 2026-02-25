"use client";

import { useState, useEffect } from "react";

const statuses = ["all", "open", "triaged", "resolved", "dismissed"] as const;

export function ReportStatusFilter() {
  const [active, setActive] = useState<string>("all");

  useEffect(() => {
    const table = document.getElementById("reports-table");
    if (!table) return;
    const rows = table.querySelectorAll<HTMLElement>("tbody tr[data-status]");
    rows.forEach((row) => {
      const status = row.getAttribute("data-status");
      row.style.display =
        active === "all" || status === active ? "" : "none";
    });
  }, [active]);

  return (
    <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1rem" }}>
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => setActive(s)}
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.75rem",
            fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
            fontWeight: 500,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            borderRadius: "3px",
            border: `1px solid ${active === s ? "#c8a55a" : "#2a2a2a"}`,
            backgroundColor: active === s ? "rgba(200,165,90,0.12)" : "transparent",
            color: active === s ? "#c8a55a" : "#666",
            cursor: "pointer",
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
