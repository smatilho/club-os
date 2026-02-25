import { apiFetch } from "../../../lib/api-client";
import { MarkReadButton } from "./mark-read-button";

interface Notification {
  id: string;
  topic: string;
  title: string;
  body: string;
  status: string;
  readAt: string | null;
  createdAt: string;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function TopicBadge({ topic }: { topic: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    event: {
      bg: "rgba(200,120,80,0.1)",
      fg: "#c87850",
      border: "rgba(200,120,80,0.22)",
    },
    reservation: {
      bg: "rgba(100,140,220,0.1)",
      fg: "#648cdc",
      border: "rgba(100,140,220,0.22)",
    },
    community: {
      bg: "rgba(160,120,200,0.1)",
      fg: "#a078c8",
      border: "rgba(160,120,200,0.22)",
    },
    payment: {
      bg: "rgba(80,180,100,0.1)",
      fg: "#50b464",
      border: "rgba(80,180,100,0.22)",
    },
    system: {
      bg: "rgba(120,120,120,0.08)",
      fg: "#888",
      border: "rgba(120,120,120,0.18)",
    },
  };
  const fallback = { bg: "rgba(100,140,220,0.1)", fg: "#648cdc", border: "rgba(100,140,220,0.22)" };
  const c = colors[topic] ?? fallback;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.1rem 0.4rem",
        fontSize: "0.625rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        borderRadius: "2px",
        backgroundColor: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
      }}
    >
      {topic}
    </span>
  );
}

export default async function MemberNotificationsPage() {
  let notifications: Notification[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<Notification[]>("/api/notifications/my");
    if (result.ok) {
      notifications = result.data;
    } else {
      error = result.error;
    }
  } catch {
    error = "Unable to connect to API";
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            margin: 0,
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: "#1a1a2e",
          }}
        >
          Notifications
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#666",
            margin: "0.375rem 0 0",
            fontStyle: "italic",
          }}
        >
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "All caught up"}
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

      {notifications.length === 0 && !error ? (
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
            &#9993;
          </div>
          <p
            style={{
              color: "#888",
              fontSize: "0.9375rem",
              margin: 0,
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            No notifications.
          </p>
          <p
            style={{
              color: "#aaa",
              fontSize: "0.8125rem",
              margin: "0.5rem 0 0",
            }}
          >
            When something needs your attention, it will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notifications.map((notification) => {
            const isUnread = !notification.readAt;

            return (
              <div
                key={notification.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  backgroundColor: isUnread ? "#fffcf7" : "#fff",
                  borderRadius: "10px",
                  border: `1px solid ${isUnread ? "#e0c890" : "#e8e4de"}`,
                  borderLeft: isUnread
                    ? "3px solid #d4a340"
                    : "1px solid #e8e4de",
                }}
              >
                {/* Unread dot */}
                {isUnread && (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#d4a340",
                      flexShrink: 0,
                      marginTop: "0.4rem",
                    }}
                  />
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: isUnread ? 700 : 500,
                        color: "#1a1a2e",
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                      }}
                    >
                      {notification.title}
                    </span>
                    <TopicBadge topic={notification.topic} />
                  </div>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: isUnread ? "#555" : "#888",
                      margin: "0 0 0.5rem",
                      lineHeight: 1.5,
                      fontWeight: isUnread ? 500 : 400,
                    }}
                  >
                    {notification.body}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "#aaa",
                      }}
                    >
                      {formatTimestamp(notification.createdAt)}
                    </span>
                    {isUnread && <MarkReadButton notificationId={notification.id} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
