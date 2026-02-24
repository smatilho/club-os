"use client";

import { useState } from "react";

interface AvailabilityItem {
  resourceUnitId: string;
  code: string;
  name: string;
  kind: string;
  available: boolean;
  blockingReason: string | null;
}

type Step = "dates" | "select" | "confirm" | "result";

export default function NewBookingPage() {
  const [step, setStep] = useState<Step>("dates");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [selectedResource, setSelectedResource] =
    useState<AvailabilityItem | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function checkAvailability() {
    if (!startsAt || !endsAt) {
      setError("Please select both start and end dates");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/cms/reservations/availability?startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}`,
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to check availability");
        return;
      }
      setAvailability(json.data);
      setStep("select");
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  async function createHold(
    resource = selectedResource,
  ) {
    if (!resource) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/reservations/holds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          resourceUnitId: resource.resourceUnitId,
          startsAt,
          endsAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create hold");
        return;
      }
      setHoldId(json.data.id);
      setStep("confirm");
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking() {
    if (!holdId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          holdId,
          idempotencyKey: `booking_${holdId}_${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Booking failed");
        return;
      }
      setReservationId(json.data.id);
      setResultStatus(json.data.status);
      setStep("result");
    } catch {
      setError("Unable to connect");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("dates");
    setStartsAt("");
    setEndsAt("");
    setAvailability([]);
    setSelectedResource(null);
    setHoldId(null);
    setReservationId(null);
    setResultStatus(null);
    setError(null);
  }

  return (
    <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Book a Reservation
      </h1>
      <p style={{ fontSize: "0.8125rem", color: "#666", marginBottom: "2rem" }}>
        Bed selection mode — choose your dates, pick an available unit, and confirm.
      </p>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(220,60,60,0.08)",
            border: "1px solid rgba(220,60,60,0.2)",
            borderRadius: "6px",
            color: "#dc3c3c",
            fontSize: "0.8125rem",
            marginBottom: "1.5rem",
          }}
        >
          {error}
          {(step === "confirm" || step === "result") && (
            <button
              onClick={reset}
              style={{
                marginLeft: "0.75rem",
                padding: "0.25rem 0.75rem",
                fontSize: "0.75rem",
                backgroundColor: "transparent",
                border: "1px solid rgba(220,60,60,0.3)",
                borderRadius: "4px",
                color: "#dc3c3c",
                cursor: "pointer",
              }}
            >
              Start Over
            </button>
          )}
        </div>
      )}

      {/* Step 1: Date Selection */}
      {step === "dates" && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#333",
            }}
          >
            1. Choose Dates
          </h2>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
            <label style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
                Check-in
              </span>
              <input
                type="datetime-local"
                value={startsAt ? startsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setStartsAt(
                    e.target.value ? new Date(e.target.value).toISOString() : "",
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                }}
              />
            </label>
            <label style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "0.75rem", color: "#666", marginBottom: "0.25rem" }}>
                Check-out
              </span>
              <input
                type="datetime-local"
                value={endsAt ? endsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setEndsAt(
                    e.target.value ? new Date(e.target.value).toISOString() : "",
                  )
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                }}
              />
            </label>
          </div>
          <button
            onClick={checkAvailability}
            disabled={loading}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#2563eb",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Checking..." : "Check Availability"}
          </button>
        </div>
      )}

      {/* Step 2: Resource Selection */}
      {step === "select" && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              color: "#333",
            }}
          >
            2. Select a Unit
          </h2>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#666",
              marginBottom: "1rem",
            }}
          >
            {new Date(startsAt).toLocaleDateString()} — {new Date(endsAt).toLocaleDateString()}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {availability.map((item) => (
              <button
                key={item.resourceUnitId}
                onClick={() => {
                  if (item.available) {
                    setSelectedResource(item);
                    void createHold(item);
                  }
                }}
                disabled={!item.available || loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  backgroundColor: item.available ? "#f8f9fa" : "#f1f1f1",
                  border: `1px solid ${item.available ? "#dee2e6" : "#e9ecef"}`,
                  borderRadius: "6px",
                  cursor: item.available && !loading ? "pointer" : "not-allowed",
                  opacity: item.available ? 1 : 0.5,
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div>
                  <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                    {item.name}
                  </span>
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "0.6875rem",
                      color: "#888",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.kind} / {item.code}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    color: item.available ? "#50b464" : "#dc3c3c",
                  }}
                >
                  {item.available
                    ? "Available"
                    : item.blockingReason === "confirmed_reservation"
                      ? "Reserved"
                      : "On Hold"}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("dates")}
            style={{
              marginTop: "1rem",
              padding: "0.375rem 0.75rem",
              fontSize: "0.75rem",
              backgroundColor: "transparent",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              cursor: "pointer",
              color: "#666",
            }}
          >
            Back
          </button>
        </div>
      )}

      {/* Step 3: Confirm + Pay */}
      {step === "confirm" && selectedResource && (
        <div
          style={{
            padding: "1.5rem",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#333",
            }}
          >
            3. Confirm & Pay
          </h2>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              marginBottom: "1.25rem",
              fontSize: "0.875rem",
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: "0.5rem" }}>
              {selectedResource.name}{" "}
              <span style={{ color: "#888", fontSize: "0.75rem" }}>
                ({selectedResource.code})
              </span>
            </div>
            <div style={{ color: "#666", fontSize: "0.8125rem" }}>
              {new Date(startsAt).toLocaleString()} — {new Date(endsAt).toLocaleString()}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontWeight: 600,
                fontSize: "1.125rem",
              }}
            >
              $50.00
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={confirmBooking}
              disabled={loading}
              style={{
                padding: "0.5rem 1.5rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#2563eb",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "wait" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Processing..." : "Confirm Booking"}
            </button>
            <button
              onClick={() => setStep("select")}
              disabled={loading}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8125rem",
                backgroundColor: "transparent",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                cursor: "pointer",
                color: "#666",
              }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === "result" && (
        <div
          style={{
            padding: "2rem",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
            textAlign: "center",
          }}
        >
          {resultStatus === "confirmed" ? (
            <>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  backgroundColor: "rgba(80,180,100,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  fontSize: "1.5rem",
                  color: "#50b464",
                }}
              >
                &#10003;
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Booking Confirmed
              </h2>
              <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Your reservation has been confirmed and payment processed.
              </p>
            </>
          ) : (
            <>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  backgroundColor: "rgba(220,60,60,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  fontSize: "1.5rem",
                  color: "#dc3c3c",
                }}
              >
                !
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Payment {resultStatus === "payment_failed" ? "Failed" : "Pending"}
              </h2>
              <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                {resultStatus === "payment_failed"
                  ? "Your payment could not be processed. Please try again."
                  : "Your booking is being processed."}
              </p>
            </>
          )}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            {reservationId && (
              <a
                href={`/member/reservations/${reservationId}`}
                style={{
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#fff",
                  backgroundColor: "#2563eb",
                  borderRadius: "6px",
                  textDecoration: "none",
                }}
              >
                View Reservation
              </a>
            )}
            <a
              href="/member/reservations"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8125rem",
                color: "#666",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              All Reservations
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
