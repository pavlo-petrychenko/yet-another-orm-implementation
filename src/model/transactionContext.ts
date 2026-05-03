import { AsyncLocalStorage } from "node:async_hooks";

import type { Driver } from "@/drivers/common/Driver";
import type { DataSource } from "@/model/DataSource";
import type { EntityManager } from "@/model/EntityManager";

export interface TxContext {
  readonly ds: DataSource;
  readonly tx: Driver;
  readonly em: EntityManager;
  readonly closed: { value: boolean };
}

const als = new AsyncLocalStorage<TxContext>();

/** @internal */
export function runInTx<R>(ctx: TxContext, fn: () => Promise<R>): Promise<R> {
  return als.run(ctx, fn);
}

/** @internal */
export function ambientContext(): TxContext | undefined {
  return als.getStore();
}

/** @internal */
export function ambientTxFor(ds: DataSource): Driver | undefined {
  const ctx = als.getStore();
  if (!ctx) return undefined;
  if (ctx.ds !== ds) return undefined;
  if (ctx.closed.value) return undefined;
  return ctx.tx;
}

/** @internal */
export function ambientEntityManagerFor(ds: DataSource): EntityManager | undefined {
  const ctx = als.getStore();
  if (!ctx) return undefined;
  if (ctx.ds !== ds) return undefined;
  if (ctx.closed.value) return undefined;
  return ctx.em;
}
