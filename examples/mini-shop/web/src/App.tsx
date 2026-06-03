import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiRequestError,
  getOrder,
  listProducts,
  listUserOrders,
  placeOrder,
} from "./api";
import { Cart } from "./components/Cart";
import { Header } from "./components/Header";
import { OrderDetail } from "./components/OrderDetail";
import { OrdersPanel } from "./components/OrdersPanel";
import { ProductGrid } from "./components/ProductGrid";
import type { Order, OrderStatus, Product } from "./types";
import { useCart } from "./useCart";

function messageFor(err: unknown): string {
  if (err instanceof ApiRequestError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unexpected error";
}

export default function App() {
  const [currentUserId, setCurrentUserId] = useState(1);

  // Products + filters.
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [inStock, setInStock] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);

  // Cart + order placement.
  const cart = useCart();
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  // Orders list + filter.
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  // Order detail modal.
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      setProducts(await listProducts({ inStock, activeOnly }));
    } catch (err) {
      setProductsError(messageFor(err));
    } finally {
      setProductsLoading(false);
    }
  }, [inStock, activeOnly]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const status = statusFilter === "all" ? undefined : statusFilter;
      setOrders(await listUserOrders(currentUserId, status));
    } catch (err) {
      setOrdersError(messageFor(err));
    } finally {
      setOrdersLoading(false);
    }
  }, [currentUserId, statusFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Fetch the nested order whenever the selection changes.
  useEffect(() => {
    if (selectedOrderId === null) {
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    setOrderDetail(null);
    getOrder(selectedOrderId)
      .then((order) => {
        if (!cancelled) {
          setOrderDetail(order);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(messageFor(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedOrderId]);

  const cartQuantities = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of cart.lines) {
      map.set(line.product.id, line.quantity);
    }
    return map;
  }, [cart.lines]);

  const handlePlaceOrder = useCallback(async () => {
    setPlacing(true);
    setPlaceError(null);
    try {
      const items = cart.lines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
      }));
      const created = await placeOrder(currentUserId, items);
      cart.clear();
      // Stock and the orders list both changed; refresh and reveal the order.
      await Promise.all([loadProducts(), loadOrders()]);
      setSelectedOrderId(created.id);
    } catch (err) {
      setPlaceError(messageFor(err));
    } finally {
      setPlacing(false);
    }
  }, [cart, currentUserId, loadProducts, loadOrders]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header currentUserId={currentUserId} onChangeUser={setCurrentUserId} />

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductGrid
            products={products}
            loading={productsLoading}
            error={productsError}
            inStock={inStock}
            activeOnly={activeOnly}
            cartQuantities={cartQuantities}
            onToggleInStock={setInStock}
            onToggleActiveOnly={setActiveOnly}
            onAdd={cart.add}
          />
        </div>

        <div className="space-y-6">
          <Cart
            cart={cart}
            placing={placing}
            error={placeError}
            onPlaceOrder={handlePlaceOrder}
          />
          <OrdersPanel
            orders={orders}
            loading={ordersLoading}
            error={ordersError}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onSelect={setSelectedOrderId}
          />
        </div>
      </main>

      {selectedOrderId !== null && (
        <OrderDetail
          order={orderDetail}
          loading={detailLoading}
          error={detailError}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}
