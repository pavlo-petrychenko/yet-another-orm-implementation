import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  inStock: boolean;
  activeOnly: boolean;
  cartQuantities: Map<number, number>;
  onToggleInStock: (value: boolean) => void;
  onToggleActiveOnly: (value: boolean) => void;
  onAdd: (product: Product) => void;
}

function FilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}

export function ProductGrid({
  products,
  loading,
  error,
  inStock,
  activeOnly,
  cartQuantities,
  onToggleInStock,
  onToggleActiveOnly,
  onAdd,
}: ProductGridProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Products</h2>
        <div className="flex items-center gap-4 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
          <FilterToggle
            label="In stock only"
            checked={inStock}
            onChange={onToggleInStock}
          />
          <FilterToggle
            label="Active only"
            checked={activeOnly}
            onChange={onToggleActiveOnly}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No products match the current filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inCartQuantity={cartQuantities.get(product.id) ?? 0}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </section>
  );
}
