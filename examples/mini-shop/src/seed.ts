import { bootstrap, dataSource } from "@/datasource";
import { Product } from "@/entities/Product";
import { User } from "@/entities/User";

async function main(): Promise<void> {
  await bootstrap();
  try {
    const usersCount = await User.count();
    if (usersCount === 0) {
      await User.insertMany([
        { email: "alice@example.com", name: "Alice", createdAt: new Date() },
        { email: "bob@example.com", name: "Bob", createdAt: new Date() },
      ]);
    }

    const productsCount = await Product.count();
    if (productsCount === 0) {
      await Product.insertMany([
        { sku: "BOOK-001", name: "TypeScript Deep Dive", priceCents: 2999, stock: 10, isActive: true, createdAt: new Date() },
        { sku: "BOOK-002", name: "Postgres Up & Running", priceCents: 3499, stock: 5, isActive: true, createdAt: new Date() },
        { sku: "MUG-001", name: "yaoi logo mug", priceCents: 1299, stock: 50, isActive: true, createdAt: new Date() },
        { sku: "OLD-001", name: "Discontinued widget", priceCents: 199, stock: 0, isActive: false, createdAt: new Date() },
      ]);
    }

    console.log("Seed completed.");
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
