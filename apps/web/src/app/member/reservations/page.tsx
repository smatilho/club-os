import { apiFetch } from "../../../lib/api-client";

interface ReservationSummary {
  id: string;
  resourceUnitId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  totalAmount: { currency: string; amount: number };
  source: string;
  createdAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    confirmed: {
      bg: "rgba(80,180,100,0.12)",
      fg: "#50b464",
      border: "rgba(80,180,100,0.25)",
    },
    payment_pending: {
      bg: "rgba(200,165,90,0.12)",
      fg: "#c8a55a",
      border: "rgba(200,165,90,0.25)",
    },
    payment_failed: {
      bg: "rgba(220,60,60,0.08)",
      fg: "#dc3c3c",
      border: "rgba(220,60,60,0.2)",
    },
    canceled: {
      bg: "rgba(120,120,120,0.1)",
      fg: "#888",
      border: "rgba(120,120,120,0.2)",
    },
    held: {
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
        padding: "0.125rem 0.5rem",
        fontSize: "0.6875rem",
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export default async function MemberReservationsPage() {
  let reservations: ReservationSummary[] = [];
  let error: string | null = null;

  try {
    const result =
      await apiFetch<ReservationSummary[]>("/api/reservations/my");
    if (result.ok) {
      reservations = result.data;
    } else {
      error = result.error;
    }
  } catch {
    error = "Unable to connect to API";
  }

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            My Reservations
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#666", margin: "0.25rem 0 0" }}>
            {reservations.length} reservation{reservations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/member/reservations/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1.25rem",
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#2563eb",
            border: "none",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          + New Booking
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

      {reservations.length === 0 && !error ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <p style={{ color: "#666", fontSize: "0.875rem", margin: 0 }}>
            No reservations yet. Book your first stay to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reservations.map((res) => (
            <a
              key={res.id}
              href={`/member/reservations/${res.id}`}
              style={{
                display: "block",
                padding: "1rem 1.25rem",
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {new Date(res.startsAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {" — "}
                    {new Date(res.endsAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>
                    {formatCurrency(res.totalAmount.amount, res.totalAmount.currency)}
                  </div>
                </div>
                <StatusBadge status={res.status} />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
