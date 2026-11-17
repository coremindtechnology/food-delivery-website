"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  paymentMethod: "razorpay" | "cod";
  totalAmount: number;
  cashOutstandingAmount: number;
  customerName: string;
  customerPhone: string;
  deliveryNotes?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
}

interface Assignment {
  _id: string;
  status: "assigned" | "picked_up" | "en_route" | "delivered" | "failed";
  assignedAt: string;
  failedReason?: string;
  orderId: DeliveryOrder;
  restaurantId: {
    name: string;
    phone: string;
    contactPhone: string;
    address: { street: string; city: string };
  };
}

export default function DeliveryPanelPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [cash, setCash] = useState<Record<string, string>>({});
  const [deliveryCodes, setDeliveryCodes] = useState<Record<string, string>>({});

  const loadAssignments = useCallback(async () => {
    try {
      const response = await fetch(`/api/delivery/assignments${history ? "?history=true" : ""}`);
      const data = await response.json();
      if (response.status === 401) {
        router.replace("/delivery/login");
        return;
      }
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load assigned deliveries.");
      setAssignments(data.data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load deliveries.");
    } finally {
      setLoading(false);
    }
  }, [history, router]);

  useEffect(() => {
    void loadAssignments();
    const timer = window.setInterval(() => void loadAssignments(), 20000);
    return () => window.clearInterval(timer);
  }, [loadAssignments]);

  async function updateAssignment(assignment: Assignment, action: string) {
    setWorkingId(assignment._id);
    setError("");
    try {
      const body: Record<string, unknown> = { action };
      if (action === "delivered") body.deliveryCode = deliveryCodes[assignment._id] || "";
      if (action === "delivered" && assignment.orderId.paymentMethod === "cod") {
        body.cashCollectedAmount = Number(cash[assignment._id] || 0);
      }
      if (action === "failed") {
        body.reason = reasons[assignment._id] || "";
      }
      const response = await fetch(`/api/delivery/assignments/${assignment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to update delivery.");
      await loadAssignments();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update delivery.");
    } finally {
      setWorkingId("");
    }
  }

  async function logout() {
    await fetch("/api/delivery/logout", { method: "POST" });
    router.replace("/delivery/login");
  }

  return (
    <main className="min-h-screen bg-cream-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Delivery personnel</p>
            <h1 className="text-2xl font-black text-charcoal-900">My deliveries</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistory((value) => !value)}>
              {history ? "Active deliveries" : "Delivery history"}
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
          </div>
        </header>

        <p className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
          Contact numbers are shown directly because no call-masking provider is configured. Use these numbers only for this assigned delivery.
        </p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-charcoal-500">Loading your deliveries…</p> : null}
        {!loading && assignments.length === 0 && (
          <div className="rounded-3xl border border-cream-200 bg-white p-8 text-center text-sm text-charcoal-500">
            {history ? "No completed deliveries yet." : "No active deliveries assigned."}
          </div>
        )}

        {assignments.map((assignment) => {
          const order = assignment.orderId;
          const restaurant = assignment.restaurantId;
          return (
            <article key={assignment._id} className="space-y-4 rounded-3xl border border-cream-200 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-primary-700">{order.orderNumber}</p>
                  <h2 className="text-lg font-extrabold text-charcoal-900">{restaurant.name}</h2>
                  <p className="text-xs text-charcoal-500">Assignment: {assignment.status.replace("_", " ")}</p>
                </div>
                <a className="text-sm font-bold text-primary-700 underline" href={`tel:${restaurant.contactPhone || restaurant.phone}`}>
                  Call restaurant
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-2xl bg-cream-100 p-4 text-sm">
                  <h3 className="mb-1 font-bold text-charcoal-900">Pickup</h3>
                  <p>{restaurant.address.street}, {restaurant.address.city}</p>
                  <a className="text-primary-700 underline" href={`tel:${restaurant.contactPhone || restaurant.phone}`}>
                    {restaurant.contactPhone || restaurant.phone}
                  </a>
                </section>
                <section className="rounded-2xl bg-cream-100 p-4 text-sm">
                  <h3 className="mb-1 font-bold text-charcoal-900">Delivery</h3>
                  <p>{order.customerName} · <a className="text-primary-700 underline" href={`tel:${order.customerPhone}`}>{order.customerPhone}</a></p>
                  <p>{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.pincode}</p>
                  {order.deliveryAddress.landmark && <p>Landmark: {order.deliveryAddress.landmark}</p>}
                  {order.deliveryNotes && <p className="mt-2 font-semibold">Instructions: {order.deliveryNotes}</p>}
                </section>
              </div>
              {order.paymentMethod === "cod" && assignment.status === "en_route" && (
                <label className="block text-sm font-semibold">
                  Cash collected (outstanding {formatCurrency(order.cashOutstandingAmount)})
                  <input
                    type="number"
                    min="0"
                    max={order.cashOutstandingAmount}
                    step="0.01"
                    value={cash[assignment._id] ?? order.cashOutstandingAmount}
                    onChange={(event) => setCash({ ...cash, [assignment._id]: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2"
                  />
                </label>
              )}
              {assignment.status === "en_route" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    Customer delivery code
                    <input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={deliveryCodes[assignment._id] || ""}
                      onChange={(event) => setDeliveryCodes({ ...deliveryCodes, [assignment._id]: event.target.value.replace(/\D/g, "").slice(0, 6) })}
                      className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2"
                      placeholder="6-digit SMS code"
                    />
                    <span className="mt-1 block text-[11px] text-charcoal-500">Ask the customer for the code sent to their verified phone before confirming delivery.</span>
                  </label>
                  <label className="block text-sm font-semibold">
                    Failed delivery reason (if needed)
                    <input
                      value={reasons[assignment._id] || ""}
                      onChange={(event) => setReasons({ ...reasons, [assignment._id]: event.target.value })}
                      className="mt-1 w-full rounded-xl border border-cream-300 px-3 py-2"
                      maxLength={300}
                      placeholder="Customer unavailable, address issue…"
                    />
                  </label>
                </div>
              )}
              {!history && (
                <div className="flex flex-wrap gap-2">
                  {assignment.status === "assigned" && (
                    <Button size="sm" isLoading={workingId === assignment._id} onClick={() => updateAssignment(assignment, "pickup_confirm")}>
                      Confirm pickup
                    </Button>
                  )}
                  {assignment.status === "picked_up" && (
                    <Button size="sm" isLoading={workingId === assignment._id} onClick={() => updateAssignment(assignment, "en_route")}>
                      Mark en route
                    </Button>
                  )}
                  {assignment.status === "en_route" && (
                    <>
                      <Button size="sm" disabled={(deliveryCodes[assignment._id] || "").length !== 6} isLoading={workingId === assignment._id} onClick={() => updateAssignment(assignment, "delivered")}>
                        Confirm delivery
                      </Button>
                      <Button size="sm" variant="outline" isLoading={workingId === assignment._id} onClick={() => updateAssignment(assignment, "en_route")}>
                        Send / resend customer code
                      </Button>
                      <Button variant="danger" size="sm" disabled={(reasons[assignment._id] || "").trim().length < 3} isLoading={workingId === assignment._id} onClick={() => updateAssignment(assignment, "failed")}>
                        Report failed delivery
                      </Button>
                    </>
                  )}
                  {assignment.status === "failed" && assignment.failedReason && (
                    <p className="text-xs text-red-700">Failed: {assignment.failedReason}</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
