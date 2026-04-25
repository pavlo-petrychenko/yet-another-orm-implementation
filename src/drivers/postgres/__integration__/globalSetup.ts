import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface GlobalWithContainer {
  yaoiPgContainer?: StartedPostgreSqlContainer;
}

const PG_PORT = 5432;

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("yaoi_it")
    .withUsername("test")
    .withPassword("test")
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(PG_PORT);
  const user = container.getUsername();
  const password = container.getPassword();
  const database = container.getDatabase();

  process.env.YAOI_IT_PG_HOST = host;
  process.env.YAOI_IT_PG_PORT = String(port);
  process.env.YAOI_IT_PG_USER = user;
  process.env.YAOI_IT_PG_PASSWORD = password;
  process.env.YAOI_IT_PG_DATABASE = database;

  const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  const client = new Client({ host, port, user, password, database });
  await client.connect();
  await client.query(schema);
  await client.end();

  (globalThis as GlobalWithContainer).yaoiPgContainer = container;
}
