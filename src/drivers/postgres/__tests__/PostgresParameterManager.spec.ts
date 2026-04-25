import { PostgresParameterManager } from "@/drivers/postgres/dialect/PostgresParameterManager";

describe("PostgresParameterManager", () => {
  it("returns sequential $N placeholders", () => {
    const pm = new PostgresParameterManager();
    expect(pm.add("a")).toBe("$1");
    expect(pm.add("b")).toBe("$2");
    expect(pm.add(42)).toBe("$3");
  });

  it("getParams returns values in insertion order", () => {
    const pm = new PostgresParameterManager();
    pm.add("a");
    pm.add(null);
    pm.add(7);
    expect(pm.getParams()).toEqual(["a", null, 7]);
  });

  it("each instance starts numbering at $1", () => {
    const a = new PostgresParameterManager();
    const b = new PostgresParameterManager();
    a.add("first");
    a.add("second");
    expect(b.add("first")).toBe("$1");
  });

  it("preserves null and undefined values", () => {
    const pm = new PostgresParameterManager();
    pm.add(null);
    pm.add(undefined);
    expect(pm.getParams()).toEqual([null, undefined]);
  });
});
