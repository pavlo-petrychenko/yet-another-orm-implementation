import type { FastifyInstance } from "fastify";

import { Product } from "@/entities/Product";

interface ProductsListQuery {
  inStock?: string;
  activeOnly?: string;
}

interface ProductIdParams {
  id: string;
}

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: ProductsListQuery }>("/products", async (req) => {
    const inStock = req.query.inStock === "true";
    const activeOnly = req.query.activeOnly !== "false";

    return Product.find({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(inStock ? { stock: { $gt: 0 } } : {}),
      },
      orderBy: [{ name: "asc" }],
    });
  });

  app.get<{ Params: ProductIdParams }>("/products/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const product = await Product.findOne({ where: { id } });
    if (!product) {
      reply.code(404);
      return { error: "product_not_found", id };
    }
    return product;
  });
}
