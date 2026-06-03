import { useEffect } from "react";

import { formatCents, formatDate } from "../format";
import type { Order } from "../types";
import { StatusBadge } from "./StatusBadge";

interface OrderDetailProps {
  order: Order | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function OrderDetail({ order, loading, error, onClose }: OrderDetailProps) {
  // Close on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && <p className="text-slate-500">Loading order…</p>}

        {error && <p className="text-rose-700">{error}</p>}

        {order && (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Order #{order.id}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(order.createdAt)}
                  {order.user ? ` · ${order.user.name}` : ""}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <ul className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
              {(order.items ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {item.product?.name ?? `Product #${item.productId}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.quantity} × {formatCents(item.priceAtPurchaseCents)}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-slate-800">
                    {formatCents(item.priceAtPurchaseCents * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Total</span>
              <span className="text-xl font-bold tabular-nums text-slate-900">
                {formatCents(order.totalCents)}
              </span>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
