import type { FastifyInstance, FastifyPluginOptions } from "fastify";

import { makeRepository } from "@iriskaik/yaoi";

import { Order } from "@/entities/Order";
import { DomainError } from "@/errors";
import type { OrderRepository } from "@/repositories/OrderRepository";

interface CreateOrderBody {
  userId: number;
  items: Array<{ productId: number; quantity: number }>;
}

interface OrderIdParams {
  id: string;
}

// Synchronous plugin (only registers routes), so it uses Fastify's done-callback
// signature rather than `async` — the routes' handlers are where the awaiting happens.
export function orderRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void,
): void {
  app.post<{ Body: CreateOrderBody }>("/orders", async (req, reply) => {
    const orders = makeRepository(Order) as OrderRepository;
    try {
      const order = await orders.placeOrder(req.body.userId, req.body.items);
      return reply.code(201).send(order);
    } catch (err) {
      if (err instanceof DomainError) {
        return reply.code(400).send({ error: err.code, message: err.message });
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
      return reply.code(404).send({ error: "order_not_found", id });
    }
    return order;
  });

  done();
}
