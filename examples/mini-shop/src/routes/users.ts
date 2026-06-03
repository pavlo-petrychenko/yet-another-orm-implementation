import type { FastifyInstance, FastifyPluginOptions } from "fastify";

import type { OrderStatus } from "@/entities/Order";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";

interface UserIdParams {
  id: string;
}

interface UserOrdersQuery {
  status?: OrderStatus;
}

// Synchronous plugin (only registers routes), so it uses Fastify's done-callback
// signature rather than `async` — the routes' handlers are where the awaiting happens.
export function userRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void,
): void {
  app.get<{ Params: UserIdParams }>("/users/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id } });
    if (!user) {
      return reply.code(404).send({ error: "user_not_found", id });
    }
    return user;
  });

  app.get<{ Params: UserIdParams; Querystring: UserOrdersQuery }>(
    "/users/:id/orders",
    (req) => {
      const userId = Number(req.params.id);
      const status = req.query.status;

      return Order.find({
        where: {
          userId,
          ...(status ? { status } : {}),
        },
        include: { items: { include: { product: true } } },
        orderBy: [{ createdAt: "desc" }],
      });
    },
  );

  done();
}
