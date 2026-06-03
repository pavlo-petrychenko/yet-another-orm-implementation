import "dotenv/config";

import { DataSource, DBType, setDataSource } from "@iriskaik/yaoi";

import "@/repositories/OrderRepository";

import { Order } from "@/entities/Order";
import { OrderItem } from "@/entities/OrderItem";
import { Product } from "@/entities/Product";
import { User } from "@/entities/User";

void [User, Product, Order, OrderItem];

export const dataSource = new DataSource({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "mini_shop",
    mode: "pool",
    pool: { min: 1, max: 4 },
  },
});

export async function bootstrap(): Promise<DataSource> {
  await dataSource.initialize();
  setDataSource(dataSource);
  return dataSource;
}
