import { formatCents } from "../format";
import type { Cart as CartState } from "../useCart";

interface CartProps {
  cart: CartState;
  placing: boolean;
  error: string | null;
  onPlaceOrder: () => void;
}

function QtyButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export function Cart({ cart, placing, error, onPlaceOrder }: CartProps) {
  const empty = cart.lines.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Cart</h2>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      {empty ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Your cart is empty.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {cart.lines.map((line) => (
            <li key={line.product.id} className="flex items-center gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {line.product.name}
                </p>
                <p className="text-xs text-slate-400">
                  {formatCents(line.product.priceCents)} each
                </p>
              </div>
              <div className="flex items-center gap-1">
                <QtyButton
                  label="−"
                  onClick={() =>
                    cart.setQuantity(line.product.id, line.quantity - 1)
                  }
                />
                <span className="w-6 text-center text-sm tabular-nums">
                  {line.quantity}
                </span>
                <QtyButton
                  label="+"
                  disabled={line.quantity >= line.product.stock}
                  onClick={() =>
                    cart.setQuantity(line.product.id, line.quantity + 1)
                  }
                />
              </div>
              <span className="w-16 text-right text-sm font-medium tabular-nums text-slate-800">
                {formatCents(line.product.priceCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">Total</span>
        <span className="text-lg font-bold text-slate-900 tabular-nums">
          {formatCents(cart.totalCents)}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={empty || placing}
        onClick={onPlaceOrder}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {placing ? "Placing order…" : "Place order"}
      </button>
    </div>
  );
}
