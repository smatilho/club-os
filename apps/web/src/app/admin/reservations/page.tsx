import { apiFetch } from "../../../lib/api-client";

interface ReservationSummary {
  id: string;
  userId: string;
  resourceUnitId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  totalAmount: { currency: string; amount: number };
  source: string;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    confirmed: { bg: "rgba(80,180,100,0.12)", fg: "#50b464", border: "rgba(80,180,100,0.25)" },
    payment_pending: { bg: "rgba(200,165,90,0.12)", fg: "#c8a55a", border: "rgba(200,165,90,0.25)" },
    payment_failed: { bg: "rgba(220,60,60,0.08)", fg: "#dc3c3c", border: "rgba(220,60,60,0.2)" },
    canceled: { bg: "rgba(120,120,120,0.1)", fg: "#888", border: "rgba(120,120,120,0.2)" },
    held: { bg: "rgba(100,140,220,0.12)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" },
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
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function AdminReservationsPage() {
  let reservations: ReservationSummary[] = [];
  let error: string | null = null;

  try {
    const result = await apiFetch<ReservationSummary[]>(
      "/api/admin/reservations",
    );
    if (result.ok) {
      reservations = result.data;
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
            Reservations
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#666", margin: "0.25rem 0 0" }}>
            {reservations.length} reservation{reservations.length !== 1 ? "s" : ""}
          </p>
        </div>
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

      {reservations.length === 0 && !error ? (
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
            No reservations yet.
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
                {["User", "Dates", "Status", "Source", "Amount", ""].map(
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
              {reservations.map((res) => (
                <tr key={res.id} style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <td
                    style={{
                      padding: "0.75rem 1rem",
                      fontFamily: "'IBM Plex Mono', 'SF Mono', monospace",
                      fontSize: "0.75rem",
                      color: "#888",
                    }}
                  >
                    {res.userId}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem" }}>
                    {new Date(res.startsAt).toLocaleDateString()} — {new Date(res.endsAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <StatusBadge status={res.status} />
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#888" }}>
                    {res.source.replace(/_/g, " ")}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem" }}>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: res.totalAmount.currency }).format(res.totalAmount.amount / 100)}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <a
                      href={`/admin/reservations/${res.id}`}
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
