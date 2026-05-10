import { AlterTableBuilder } from "@/schema-builder/builders/AlterTableBuilder";
import { DdlQueryType } from "@/schema-builder/types/DdlQuery";

describe("AlterTableBuilder", () => {
  it("collects operations in order", () => {
    const ab = new AlterTableBuilder("users");
    ab.addColumn("nickname", { kind: "varchar", length: 50 }).notNull();
    ab.dropColumn("legacy", { ifExists: true });
    ab.renameColumn("display_name", "fullName");
    ab.alterColumn("email", (c) => c.setNotNull(true).setType({ kind: "text" }));
    ab.addIndex(["email"], { name: "idx_users_email", unique: true });
    ab.dropIndex("idx_users_old");
    ab.addForeignKey({
      columns: ["org_id"],
      references: { table: "orgs", columns: ["id"] },
      onDelete: "set null",
      name: "fk_users_org",
    });
    ab.dropConstraint("fk_users_legacy");

    const q = ab.build();
    expect(q.type).toBe(DdlQueryType.ALTER_TABLE);
    expect(q.table).toEqual({ name: "users" });
    expect(q.operations).toHaveLength(8);
    expect(q.operations[0]).toEqual({
      kind: "addColumn",
      spec: expect.objectContaining({ name: "nickname", notNull: true }),
    });
    expect(q.operations[1]).toEqual({ kind: "dropColumn", name: "legacy", ifExists: true });
    expect(q.operations[2]).toEqual({ kind: "renameColumn", from: "display_name", to: "fullName" });
    expect(q.operations[3]).toEqual({
      kind: "alterColumn",
      name: "email",
      changes: { setNotNull: true, setType: { kind: "text" } },
    });
    expect(q.operations[4]).toEqual({
      kind: "addIndex",
      spec: { name: "idx_users_email", columns: ["email"], unique: true },
    });
    expect(q.operations[5]).toEqual({ kind: "dropIndex", name: "idx_users_old" });
    expect(q.operations[6].kind).toBe("addForeignKey");
    expect(q.operations[7]).toEqual({ kind: "dropConstraint", name: "fk_users_legacy" });
  });

  it("alterColumn dropDefault yields setDefault: null", () => {
    const ab = new AlterTableBuilder("users");
    ab.alterColumn("created_at", (c) => c.dropDefault());
    const op = ab.build().operations[0];
    expect(op.kind).toBe("alterColumn");
    if (op.kind === "alterColumn") {
      expect(op.changes.setDefault).toBeNull();
    }
  });
});
