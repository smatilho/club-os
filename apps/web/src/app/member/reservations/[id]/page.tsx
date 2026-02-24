import { apiFetch } from "../../../../lib/api-client";
import { notFound } from "next/navigation";

interface ReservationDetail {
  id: string;
  resourceUnitId: string;
  holdId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  totalAmount: { currency: string; amount: number };
  source: string;
  createdAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;
  paymentTransactionId: string | null;
  version: number;
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

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await apiFetch<ReservationDetail>(
    `/api/reservations/${id}`,
  );

  if (!result.ok) {
    notFound();
  }

  const reservation = result.data;

  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem" }}>
      <a
        href="/member/reservations"
        style={{ fontSize: "0.8125rem", color: "#2563eb", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}
      >
        &larr; Back to Reservations
      </a>

      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #e9ecef",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Reservation
          </h1>
          <StatusBadge status={reservation.status} />
        </div>

        <div style={{ display: "grid", gap: "1rem", fontSize: "0.875rem" }}>
          <Row label="Check-in" value={new Date(reservation.startsAt).toLocaleString()} />
          <Row label="Check-out" value={new Date(reservation.endsAt).toLocaleString()} />
          <Row
            label="Amount"
            value={new Intl.NumberFormat("en-US", { style: "currency", currency: reservation.totalAmount.currency }).format(reservation.totalAmount.amount / 100)}
          />
          <Row label="Source" value={reservation.source.replace(/_/g, " ")} />
          <Row label="Created" value={new Date(reservation.createdAt).toLocaleString()} />
          {reservation.confirmedAt && (
            <Row label="Confirmed" value={new Date(reservation.confirmedAt).toLocaleString()} />
          )}
          {reservation.canceledAt && (
            <Row label="Canceled" value={new Date(reservation.canceledAt).toLocaleString()} />
          )}
          <Row label="ID" value={reservation.id} mono />
        </div>
      </div>
    </div>
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
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span
        style={{
          fontWeight: 500,
          ...(mono ? { fontFamily: "monospace", fontSize: "0.75rem" } : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}
