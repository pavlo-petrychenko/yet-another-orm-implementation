import type { Driver } from "@/drivers/common/Driver";
import type { DataSource } from "@/model/DataSource";
import type { EntityManager } from "@/model/EntityManager";
import {
  ambientContext,
  ambientEntityManagerFor,
  ambientTxFor,
  runInTx,
  type TxContext,
} from "@/model/transactionContext";

const stubDriver = {} as Driver;
const stubEm = {} as EntityManager;

function makeCtx(ds: DataSource, closed = false): TxContext {
  return { ds, tx: stubDriver, em: stubEm, closed: { value: closed } };
}

describe("transactionContext (ALS)", () => {
  it("ambientContext is undefined outside any frame", () => {
    expect(ambientContext()).toBeUndefined();
  });

  it("ambientTxFor returns undefined for unrelated DataSource", async () => {
    const dsA = {} as DataSource;
    const dsB = {} as DataSource;

    await runInTx(makeCtx(dsA), () => {
      expect(ambientTxFor(dsA)).toBe(stubDriver);
      expect(ambientTxFor(dsB)).toBeUndefined();
      return Promise.resolve();
    });

    expect(ambientTxFor(dsA)).toBeUndefined();
  });

  it("ambientEntityManagerFor honors ds + closed flag", async () => {
    const ds = {} as DataSource;
    const ctx = makeCtx(ds);

    await runInTx(ctx, () => {
      expect(ambientEntityManagerFor(ds)).toBe(stubEm);
      ctx.closed.value = true;
      expect(ambientEntityManagerFor(ds)).toBeUndefined();
      expect(ambientTxFor(ds)).toBeUndefined();
      return Promise.resolve();
    });
  });

  it("two parallel runInTx frames are mutually invisible", async () => {
    const dsA = {} as DataSource;
    const dsB = {} as DataSource;
    const driverA = { id: "A" } as unknown as Driver;
    const driverB = { id: "B" } as unknown as Driver;

    const ctxA: TxContext = { ds: dsA, tx: driverA, em: stubEm, closed: { value: false } };
    const ctxB: TxContext = { ds: dsB, tx: driverB, em: stubEm, closed: { value: false } };

    await Promise.all([
      runInTx(ctxA, async () => {
        await new Promise<void>((r) => { setImmediate(() => { r(); }); });
        expect(ambientTxFor(dsA)).toBe(driverA);
        expect(ambientTxFor(dsB)).toBeUndefined();
      }),
      runInTx(ctxB, async () => {
        await new Promise<void>((r) => { setImmediate(() => { r(); }); });
        expect(ambientTxFor(dsB)).toBe(driverB);
        expect(ambientTxFor(dsA)).toBeUndefined();
      }),
    ]);
  });
});
