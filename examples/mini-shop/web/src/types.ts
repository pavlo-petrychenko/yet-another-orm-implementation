// Mirrors the entity shapes returned by the mini-shop Fastify API.

export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export interface Product {
  id: number;
  sku: string;
  name: string;
  priceCents: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  priceAtPurchaseCents: number;
  product?: Product;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  user?: User;
  items?: OrderItem[];
}

// POST /orders error payload: { error: code, message }.
export interface ApiError {
  error: string;
  message?: string;
}
