import { formatCents } from "../format";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  inCartQuantity: number;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, inCartQuantity, onAdd }: ProductCardProps) {
  const soldOut = product.stock <= 0;
  const remaining = product.stock - inCartQuantity;
  const canAdd = product.isActive && remaining > 0;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{product.name}</h3>
          <p className="font-mono text-xs text-slate-400">{product.sku}</p>
        </div>
        {!product.isActive && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            inactive
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <span className="text-lg font-bold text-slate-900">
          {formatCents(product.priceCents)}
        </span>
        <span
          className={`text-xs ${soldOut ? "text-rose-600" : "text-slate-500"}`}
        >
          {soldOut ? "sold out" : `${product.stock} in stock`}
        </span>
      </div>

      <button
        type="button"
        disabled={!canAdd}
        onClick={() => onAdd(product)}
        className="mt-4 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {inCartQuantity > 0 ? `In cart · ${inCartQuantity}` : "Add to cart"}
      </button>
    </div>
  );
}
