import { apiFetch } from "../../../lib/api-client";

interface ClubEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  capacity: number | null;
  status: string;
  createdByUserId: string;
  publishedAt: string | null;
  canceledAt: string | null;
  rsvpCount?: number;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    draft: { bg: "rgba(200,165,90,0.12)", fg: "#c8a55a", border: "rgba(200,165,90,0.25)" },
    published: { bg: "rgba(80,180,100,0.12)", fg: "#50b464", border: "rgba(80,180,100,0.25)" },
    canceled: { bg: "rgba(220,60,60,0.08)", fg: "#dc3c3c", border: "rgba(220,60,60,0.2)" },
    completed: { bg: "rgba(120,120,120,0.1)", fg: "#888", border: "rgba(120,120,120,0.2)" },
  };
  const fallback = { bg: "rgba(100,140,220,0.12)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" };
  const c = colors[status] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        fontSize: "0.6875rem",
        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        fontWeight: 500,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "2px",
        backgroundColor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
      }}
    >
      {status}
    </span>
  );
}

export default async function AdminEventsPage() {
  let events: ClubEvent[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ClubEvent[]>("/api/admin/events");
    if (result.ok) {
      events = result.data;
    } else {
      error = result.error;
    }
  } catch {
    error = "Unable to connect to API";
  }

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, color: "#e0ddd5" }}>
            Events
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#666", margin: "0.25rem 0 0" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/admin/events/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "#0d0d0d",
            backgroundColor: "#c8a55a",
            border: "none",
            borderRadius: "4px",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          + New Event
        </a>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "4px",
            color: "#dc3c3c",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {events.length === 0 && !error ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
          }}
        >
          <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
            No events yet. Create your first event to get started.
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "#161616",
            borderRadius: "6px",
            border: "1px solid #2a2a2a",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                {["Title", "Date", "Status", "RSVPs", ""].map(
                  (header) => (
                    <th
                      key={header || "actions"}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                        fontSize: "0.6875rem",
                        fontWeight: 500,
                        color: "#666",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>
                    {event.title}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem" }}>
                    {new Date(event.startsAt).toLocaleDateString()}
                    {event.location && (
                      <span style={{ color: "#555", marginLeft: "0.5rem" }}>
                        {event.location}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <StatusBadge status={event.status} />
                  </td>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                      fontSize: "0.75rem",
                      color: "#888",
                    }}
                  >
                    {event.rsvpCount != null ? event.rsvpCount : "--"}
                    {event.capacity != null && (
                      <span style={{ color: "#555" }}> / {event.capacity}</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <a
                      href={`/admin/events/${event.id}`}
                      style={{ color: "#c8a55a", textDecoration: "none", fontSize: "0.8125rem" }}
                    >
                      Detail
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
