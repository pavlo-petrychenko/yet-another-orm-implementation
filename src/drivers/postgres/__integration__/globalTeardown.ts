import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

interface GlobalWithContainer {
  yaoiPgContainer?: StartedPostgreSqlContainer;
}

export default async function globalTeardown(): Promise<void> {
  const container = (globalThis as GlobalWithContainer).yaoiPgContainer;
  if (container) {
    await container.stop();
  }
}
