import { apiFetch } from "../../../../lib/api-client";
import { notFound } from "next/navigation";
import { EventActions } from "./actions";

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
}

interface Rsvp {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
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
        padding: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
        fontWeight: 600,
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

function RsvpStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    confirmed: { bg: "rgba(80,180,100,0.12)", fg: "#50b464", border: "rgba(80,180,100,0.25)" },
    waitlisted: { bg: "rgba(200,165,90,0.12)", fg: "#c8a55a", border: "rgba(200,165,90,0.25)" },
    canceled: { bg: "rgba(120,120,120,0.1)", fg: "#888", border: "rgba(120,120,120,0.2)" },
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

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await apiFetch<ClubEvent>(`/api/admin/events/${id}`);

  if (!result.ok) {
    notFound();
  }

  const event = result.data;

  // Load RSVPs
  let rsvps: Rsvp[] = [];
  const rsvpResult = await apiFetch<Rsvp[]>(`/api/admin/events/${id}/rsvps`);
  if (rsvpResult.ok) {
    rsvps = rsvpResult.data;
  }

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <a
        href="/admin/events"
        style={{ fontSize: "0.8125rem", color: "#c8a55a", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}
      >
        &larr; Back to Events
      </a>

      {/* Event details */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#161616",
          borderRadius: "6px",
          border: "1px solid #2a2a2a",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0, color: "#e0ddd5" }}>
            {event.title}
          </h1>
          <StatusBadge status={event.status} />
        </div>

        {event.description && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#0d0d0d",
              borderRadius: "4px",
              border: "1px solid #2a2a2a",
              fontSize: "0.8125rem",
              color: "#aaa",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              marginBottom: "1.25rem",
            }}
          >
            {event.description}
          </div>
        )}

        <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.8125rem" }}>
          <Row label="Starts" value={new Date(event.startsAt).toLocaleString()} />
          <Row label="Ends" value={new Date(event.endsAt).toLocaleString()} />
          {event.location && <Row label="Location" value={event.location} />}
          <Row label="Capacity" value={event.capacity != null ? String(event.capacity) : "Unlimited"} />
          <Row label="Created By" value={event.createdByUserId} mono />
          {event.publishedAt && (
            <Row label="Published" value={new Date(event.publishedAt).toLocaleString()} />
          )}
          {event.canceledAt && (
            <Row label="Canceled" value={new Date(event.canceledAt).toLocaleString()} />
          )}
          <Row label="Event ID" value={event.id} mono />
        </div>
      </div>

      {/* Actions */}
      <EventActions eventId={event.id} status={event.status} />

      {/* RSVP list */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#161616",
          borderRadius: "6px",
          border: "1px solid #2a2a2a",
        }}
      >
        <h2
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#e0ddd5",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
          }}
        >
          RSVPs ({rsvps.length})
        </h2>

        {rsvps.length === 0 ? (
          <p style={{ color: "#666", fontSize: "0.8125rem", margin: 0 }}>
            No RSVPs yet.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                {["User", "Status", "Date"].map((header) => (
                  <th
                    key={header}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
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
                ))}
              </tr>
            </thead>
            <tbody>
              {rsvps.map((rsvp) => (
                <tr key={rsvp.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <td
                    style={{
                      padding: "0.5rem 0.75rem",
                      fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                      fontSize: "0.75rem",
                      color: "#888",
                    }}
                  >
                    {rsvp.userId.slice(0, 8)}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <RsvpStatusBadge status={rsvp.status} />
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "#666", fontSize: "0.75rem" }}>
                    {new Date(rsvp.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span
        style={{
          color: "#e0ddd5",
          fontWeight: 500,
          ...(mono ? { fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", fontSize: "0.75rem" } : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}
