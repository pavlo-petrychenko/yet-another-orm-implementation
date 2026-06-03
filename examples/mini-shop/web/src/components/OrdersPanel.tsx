import { formatCents, formatDate } from "../format";
import type { Order, OrderStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

const STATUS_FILTERS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
];

interface OrdersPanelProps {
  orders: Order[];
  loading: boolean;
  error: string | null;
  statusFilter: OrderStatus | "all";
  onStatusFilter: (value: OrderStatus | "all") => void;
  onSelect: (orderId: number) => void;
}

export function OrdersPanel({
  orders,
  loading,
  error,
  statusFilter,
  onStatusFilter,
  onSelect,
}: OrdersPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Orders</h2>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onStatusFilter(f.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === f.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => onSelect(order.id)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      Order #{order.id}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatDate(order.createdAt)}
                    {order.items ? ` · ${order.items.length} line(s)` : ""}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums text-slate-800">
                  {formatCents(order.totalCents)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
