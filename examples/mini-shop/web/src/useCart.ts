import { useCallback, useMemo, useState } from "react";

import type { Product } from "./types";

export interface CartLine {
  product: Product;
  quantity: number;
}

export interface Cart {
  lines: CartLine[];
  totalCents: number;
  itemCount: number;
  add: (product: Product) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

export function useCart(): Cart {
  const [lines, setLines] = useState<CartLine[]>([]);

  const add = useCallback((product: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const nextQty = (existing?.quantity ?? 0) + 1;
      // Never let the cart exceed available stock.
      if (nextQty > product.stock) {
        return prev;
      }
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: nextQty } : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== productId) {
          return [l];
        }
        const clamped = Math.max(0, Math.min(quantity, l.product.stock));
        return clamped === 0 ? [] : [{ ...l, quantity: clamped }];
      }),
    );
  }, []);

  const remove = useCallback((productId: number) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalCents = useMemo(
    () => lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0),
    [lines],
  );

  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  return { lines, totalCents, itemCount, add, setQuantity, remove, clear };
}
