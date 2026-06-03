import path from "node:path";

import { defineConfig, DBType } from "@iriskaik/yaoi";

export default defineConfig({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5435),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "mini_shop",
    mode: "pool",
    pool: { min: 1, max: 4 },
  },
  migrationsDir: path.resolve(__dirname, "migrations"),
});
