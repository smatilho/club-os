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
}

interface RSVP {
  id: string;
  eventId: string;
  userId: string;
  status: string;
}

function EventStatusBadge({ status }: { status: string }) {
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
  };
  const fallback = { bg: "rgba(100,140,220,0.12)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" };
  const c = colors[status] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        borderRadius: "2px",
        backgroundColor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDateRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  // Same day: show date once with time range
  if (start.toDateString() === end.toDateString()) {
    return `${start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} \u2013 ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  }
  return `${start.toLocaleDateString("en-US", opts)} \u2013 ${end.toLocaleDateString("en-US", opts)}`;
}

export default async function MemberEventsPage() {
  let events: ClubEvent[] = [];
  let rsvps: RSVP[] = [];
  let error: string | null = null;

  try {
    const [eventsResult, rsvpsResult] = await Promise.all([
      apiFetch<ClubEvent[]>("/api/events"),
      apiFetch<RSVP[]>("/api/events/my/rsvps"),
    ]);

    if (eventsResult.ok) {
      events = eventsResult.data;
    } else {
      error = eventsResult.error;
    }

    if (rsvpsResult.ok) {
      rsvps = rsvpsResult.data;
    }
  } catch {
    error = "Unable to connect to API";
  }

  const rsvpByEventId = new Map(rsvps.map((r) => [r.eventId, r]));

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem" }}>
      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            margin: 0,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: "#1a1a2e",
          }}
        >
          Upcoming Events
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#666",
            margin: "0.375rem 0 0",
            fontStyle: "italic",
          }}
        >
          {events.length === 0
            ? "See what\u2019s happening in your community"
            : `${events.length} event${events.length !== 1 ? "s" : ""} coming up`}
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "6px",
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
            padding: "3.5rem 2rem",
            textAlign: "center",
            backgroundColor: "#faf9f7",
            borderRadius: "12px",
            border: "1px solid #e8e4de",
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              marginBottom: "0.75rem",
              opacity: 0.6,
            }}
          >
            &#9734;
          </div>
          <p
            style={{
              color: "#888",
              fontSize: "0.9375rem",
              margin: 0,
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            No upcoming events.
          </p>
          <p
            style={{
              color: "#aaa",
              fontSize: "0.8125rem",
              margin: "0.5rem 0 0",
            }}
          >
            Check back soon for gatherings, classes, and community happenings.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {events.map((event) => {
            const rsvp = rsvpByEventId.get(event.id);
            const isCanceled = !!event.canceledAt;

            return (
              <a
                key={event.id}
                href={`/member/events/${event.id}`}
                style={{
                  display: "block",
                  padding: "1.25rem 1.5rem",
                  backgroundColor: isCanceled ? "#fafafa" : "#fff",
                  borderRadius: "10px",
                  border: `1px solid ${isCanceled ? "#e0e0e0" : "#e8e4de"}`,
                  textDecoration: "none",
                  color: "inherit",
                  opacity: isCanceled ? 0.65 : 1,
                  transition: "box-shadow 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "1.0625rem",
                        marginBottom: "0.3rem",
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                        color: "#1a1a2e",
                        textDecoration: isCanceled ? "line-through" : "none",
                      }}
                    >
                      {event.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "#777",
                        marginBottom: "0.375rem",
                      }}
                    >
                      {formatDateRange(event.startsAt, event.endsAt)}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.75rem",
                        color: "#999",
                      }}
                    >
                      {event.location && (
                        <span>&#9679; {event.location}</span>
                      )}
                      {event.capacity !== null && (
                        <span>&#9679; {event.capacity} spots</span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.375rem",
                      flexShrink: 0,
                    }}
                  >
                    {isCanceled && <EventStatusBadge status="canceled" />}
                    {rsvp && !isCanceled && (
                      <EventStatusBadge status={rsvp.status} />
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
