import type { FastifyInstance } from "fastify";

import type { OrderStatus } from "@/entities/Order";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";

interface UserIdParams {
  id: string;
}

interface UserOrdersQuery {
  status?: OrderStatus;
}

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: UserIdParams }>("/users/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const user = await User.findOne({ where: { id } });
    if (!user) {
      reply.code(404);
      return { error: "user_not_found", id };
    }
    return user;
  });

  app.get<{ Params: UserIdParams; Querystring: UserOrdersQuery }>(
    "/users/:id/orders",
    async (req) => {
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
}
