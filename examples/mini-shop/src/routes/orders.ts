import type { FastifyInstance } from "fastify";

import { makeRepository } from "@iriskaik/yaoi";

import { Order } from "@/entities/Order";
import { DomainError } from "@/errors";
import { OrderRepository } from "@/repositories/OrderRepository";

interface CreateOrderBody {
  userId: number;
  items: Array<{ productId: number; quantity: number }>;
}

interface OrderIdParams {
  id: string;
}

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: CreateOrderBody }>("/orders", async (req, reply) => {
    const orders = makeRepository(Order) as OrderRepository;
    try {
      const order = await orders.placeOrder(req.body.userId, req.body.items);
      reply.code(201);
      return order;
    } catch (err) {
      if (err instanceof DomainError) {
        reply.code(400);
        return { error: err.code, message: err.message };
      }
      throw err;
    }
  });

  app.get<{ Params: OrderIdParams }>("/orders/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const order = await Order.findOne({
      where: { id },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });
    if (!order) {
      reply.code(404);
      return { error: "order_not_found", id };
    }
    return order;
  });
}
