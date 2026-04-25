import { PostgresDialectUtils } from "@/drivers/postgres/dialect/PostgresDialectUtils";

describe("PostgresDialectUtils", () => {
  const utils = new PostgresDialectUtils();

  describe("escapeIdentifier", () => {
    it("wraps in double quotes", () => {
      expect(utils.escapeIdentifier("users")).toBe(`"users"`);
    });

    it("doubles embedded double quotes", () => {
      expect(utils.escapeIdentifier(`weird"name`)).toBe(`"weird""name"`);
    });
  });

  describe("qualifyTable", () => {
    it("returns the escaped name when no alias", () => {
      expect(utils.qualifyTable({ name: "users" })).toBe(`"users"`);
    });

    it("appends AS alias when present", () => {
      expect(utils.qualifyTable({ name: "users", alias: "u" })).toBe(`"users" AS "u"`);
    });
  });

  describe("qualifyColumn", () => {
    it("returns just the column when no table qualifier", () => {
      expect(utils.qualifyColumn({ name: "id" })).toBe(`"id"`);
    });

    it("prefixes the table when present", () => {
      expect(utils.qualifyColumn({ name: "id", table: "u" })).toBe(`"u"."id"`);
    });

    it("does not append AS alias (alias is caller's concern)", () => {
      expect(utils.qualifyColumn({ name: "id", alias: "user_id" })).toBe(`"id"`);
    });
  });
});
