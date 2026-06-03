import type { OrderStatus } from "../types";

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-600/20",
  paid: "bg-sky-100 text-sky-800 ring-sky-600/20",
  shipped: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-600/20",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
