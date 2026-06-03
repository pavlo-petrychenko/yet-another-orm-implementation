import Fastify from "fastify";

import { bootstrap, dataSource } from "@/datasource";
import { orderRoutes } from "@/routes/orders";
import { productRoutes } from "@/routes/products";
import { userRoutes } from "@/routes/users";

async function main(): Promise<void> {
  await bootstrap();

  const app = Fastify({ logger: true });

  await app.register(productRoutes);
  await app.register(orderRoutes);
  await app.register(userRoutes);

  app.get("/health", () => ({ ok: true }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });

  const shutdown = async (): Promise<void> => {
    await app.close();
    await dataSource.destroy();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
