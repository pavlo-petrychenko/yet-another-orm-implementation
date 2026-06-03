import type { Order, OrderStatus, Product } from "./types";

// Vite proxies /api/* to the Fastify API (see vite.config.ts), stripping the
// prefix, so /api/products reaches the server as /products.
const BASE = "/api";

export class ApiRequestError extends Error {
  public readonly code: string;
  public readonly status: number;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (body ?? {}) as { error?: string; message?: string };
    throw new ApiRequestError(
      res.status,
      err.error ?? "request_failed",
      err.message ?? `Request to ${path} failed with ${res.status}`,
    );
  }

  return body as T;
}

export interface ProductFilters {
  inStock?: boolean;
  activeOnly?: boolean;
}

export function listProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters.inStock) {
    params.set("inStock", "true");
  }
  // The API treats activeOnly as on unless explicitly "false".
  if (filters.activeOnly === false) {
    params.set("activeOnly", "false");
  }
  const qs = params.toString();
  return request<Product[]>(`/products${qs ? `?${qs}` : ""}`);
}

export interface PlaceOrderLine {
  productId: number;
  quantity: number;
}

export function placeOrder(
  userId: number,
  items: PlaceOrderLine[],
): Promise<Order> {
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({ userId, items }),
  });
}

export function getOrder(id: number): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export function listUserOrders(
  userId: number,
  status?: OrderStatus,
): Promise<Order[]> {
  const qs = status ? `?status=${status}` : "";
  return request<Order[]>(`/users/${userId}/orders${qs}`);
}
