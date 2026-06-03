import type { FastifyInstance, FastifyPluginOptions } from "fastify";

import { Product } from "@/entities/Product";

interface ProductsListQuery {
  inStock?: string;
  activeOnly?: string;
}

interface ProductIdParams {
  id: string;
}

// Synchronous plugin (only registers routes), so it uses Fastify's done-callback
// signature rather than `async` — the routes' handlers are where the awaiting happens.
export function productRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void,
): void {
  app.get<{ Querystring: ProductsListQuery }>("/products", (req) => {
    const isInStock = req.query.inStock === "true";
    const isActiveOnly = req.query.activeOnly !== "false";

    return Product.find({
      where: {
        ...(isActiveOnly ? { isActive: true } : {}),
        ...(isInStock ? { stock: { $gt: 0 } } : {}),
      },
      orderBy: [{ name: "asc" }],
    });
  });

  app.get<{ Params: ProductIdParams }>("/products/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const product = await Product.findOne({ where: { id } });
    if (!product) {
      return reply.code(404).send({ error: "product_not_found", id });
    }
    return product;
  });

  done();
}
