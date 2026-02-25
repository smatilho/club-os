import { apiFetch } from "../../../../lib/api-client";
import { notFound } from "next/navigation";
import { RsvpButton } from "./rsvp-button";

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

interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    going: {
      bg: "rgba(80,180,100,0.12)",
      fg: "#50b464",
      border: "rgba(80,180,100,0.25)",
    },
    waitlist: {
      bg: "rgba(200,165,90,0.12)",
      fg: "#c8a55a",
      border: "rgba(200,165,90,0.25)",
    },
    canceled: {
      bg: "rgba(120,120,120,0.1)",
      fg: "#888",
      border: "rgba(120,120,120,0.2)",
    },
    published: {
      bg: "rgba(100,140,220,0.12)",
      fg: "#648cdc",
      border: "rgba(100,140,220,0.25)",
    },
  };
  const fallback = { bg: "rgba(100,140,220,0.12)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" };
  const c = colors[status] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "4px",
        backgroundColor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
      <span style={{ color: "#888", fontSize: "0.8125rem" }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          fontSize: "0.875rem",
          color: "#333",
          ...(mono ? { fontFamily: "monospace", fontSize: "0.75rem" } : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [eventResult, rsvpsResult] = await Promise.all([
    apiFetch<ClubEvent>(`/api/events/${id}`),
    apiFetch<RSVP[]>("/api/events/my/rsvps"),
  ]);

  if (!eventResult.ok) {
    notFound();
  }

  const event = eventResult.data;
  const rsvp = rsvpsResult.ok
    ? rsvpsResult.data.find((r) => r.eventId === id) ?? null
    : null;

  const isCanceled = !!event.canceledAt;

  const startDate = new Date(event.startsAt);
  const endDate = new Date(event.endsAt);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "2rem" }}>
      <a
        href="/member/events"
        style={{
          fontSize: "0.8125rem",
          color: "#648cdc",
          textDecoration: "none",
          marginBottom: "1.25rem",
          display: "inline-block",
        }}
      >
        &larr; Back to Events
      </a>

      {isCanceled && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            backgroundColor: "rgba(220,60,60,0.06)",
            border: "1px solid rgba(220,60,60,0.18)",
            borderRadius: "8px",
            color: "#c44",
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "1.25rem",
            fontFamily: "'Georgia', 'Times New Roman', serif",
          }}
        >
          This event has been canceled.
        </div>
      )}

      <div
        style={{
          padding: "2rem",
          backgroundColor: "#fff",
          borderRadius: "12px",
          border: "1px solid #e8e4de",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            gap: "1rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              color: "#1a1a2e",
              textDecoration: isCanceled ? "line-through" : "none",
              opacity: isCanceled ? 0.6 : 1,
            }}
          >
            {event.title}
          </h1>
          {rsvp && <StatusBadge status={rsvp.status} />}
        </div>

        {/* Description */}
        {event.description && (
          <p
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.65,
              color: "#444",
              marginBottom: "1.75rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {event.description}
          </p>
        )}

        {/* Details grid */}
        <div
          style={{
            borderTop: "1px solid #eee",
            paddingTop: "1rem",
            display: "grid",
            gap: "0.125rem",
          }}
        >
          <Row
            label="Starts"
            value={startDate.toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          />
          <Row
            label="Ends"
            value={
              sameDay
                ? endDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : endDate.toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
            }
          />
          {event.location && <Row label="Location" value={event.location} />}
          {event.capacity !== null && (
            <Row label="Capacity" value={`${event.capacity} spots`} />
          )}
        </div>

        {/* RSVP action area */}
        {!isCanceled && (
          <div style={{ marginTop: "1.75rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
            <RsvpButton eventId={event.id} currentStatus={rsvp?.status ?? null} />
          </div>
        )}
      </div>
    </div>
  );
}
