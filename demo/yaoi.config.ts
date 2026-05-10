import { defineConfig, DBType } from "@iriskaik/yaoi";

export default defineConfig({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5433),
    user: process.env.PGUSER ?? "yaoi",
    password: process.env.PGPASSWORD ?? "yaoi",
    database: process.env.PGDATABASE ?? "yaoi_demo",
    mode: "pool",
  },
  migrationsDir: "./src/migrations",
});
