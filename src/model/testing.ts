import type { DataSource } from "@/model/DataSource";
import type { EntityManager } from "@/model/EntityManager";

class RollbackSignal extends Error {
  public constructor() {
    super("model:rollback-sentinel");
    this.name = "RollbackSignal";
  }
}

export async function withRolledBackTransaction(
  ds: DataSource,
  fn: (em: EntityManager) => Promise<void>,
): Promise<void> {
  try {
    await ds.transaction(async (em) => {
      await fn(em);
      throw new RollbackSignal();
    });
  } catch (err) {
    if (err instanceof RollbackSignal) return;
    throw err;
  }
}
