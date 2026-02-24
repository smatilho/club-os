import { apiFetch } from "../../../../lib/api-client";
import { notFound } from "next/navigation";
import { AdminPaymentActions } from "./actions";

interface PaymentDetail {
  id: string;
  reservationId: string;
  organizationId: string;
  userId: string;
  amount: { currency: string; amount: number };
  status: string;
  providerTransactionId: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    succeeded: { bg: "rgba(80,180,100,0.12)", fg: "#50b464", border: "rgba(80,180,100,0.25)" },
    pending: { bg: "rgba(200,165,90,0.12)", fg: "#c8a55a", border: "rgba(200,165,90,0.25)" },
    failed: { bg: "rgba(220,60,60,0.08)", fg: "#dc3c3c", border: "rgba(220,60,60,0.2)" },
    refunded: { bg: "rgba(100,140,220,0.12)", fg: "#648cdc", border: "rgba(100,140,220,0.25)" },
  };
  const fallback = { bg: "rgba(200,165,90,0.12)", fg: "#c8a55a", border: "rgba(200,165,90,0.25)" };
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

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await apiFetch<PaymentDetail>(
    `/api/payments/transactions/${id}`,
  );

  if (!result.ok) {
    notFound();
  }

  const txn = result.data;

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <a
        href="/admin/payments"
        style={{ fontSize: "0.8125rem", color: "#c8a55a", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}
      >
        &larr; Back to Payments
      </a>

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
            Payment Detail
          </h1>
          <StatusBadge status={txn.status} />
        </div>

        <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.8125rem" }}>
          <Row label="User" value={txn.userId} mono />
          <Row
            label="Amount"
            value={new Intl.NumberFormat("en-US", { style: "currency", currency: txn.amount.currency }).format(txn.amount.amount / 100)}
          />
          <Row label="Status" value={txn.status} />
          <Row label="Reservation" value={txn.reservationId} mono link={`/admin/reservations/${txn.reservationId}`} />
          {txn.providerTransactionId && (
            <Row label="Provider Ref" value={txn.providerTransactionId} mono />
          )}
          <Row label="Created" value={new Date(txn.createdAt).toLocaleString()} />
          <Row label="Updated" value={new Date(txn.updatedAt).toLocaleString()} />
          <Row label="Transaction ID" value={txn.id} mono />
          <Row label="Idempotency Key" value={txn.idempotencyKey} mono />
        </div>
      </div>

      <AdminPaymentActions
        transactionId={txn.id}
        status={txn.status}
      />
    </div>
  );
}

function Row({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  const style = {
    color: "#e0ddd5",
    fontWeight: 500 as const,
    ...(mono ? { fontFamily: "'IBM Plex Mono', 'SF Mono', monospace", fontSize: "0.75rem" } : {}),
  };
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#666" }}>{label}</span>
      {link ? (
        <a href={link} style={{ ...style, color: "#c8a55a", textDecoration: "none" }}>
          {value}
        </a>
      ) : (
        <span style={style}>{value}</span>
      )}
    </div>
  );
}
