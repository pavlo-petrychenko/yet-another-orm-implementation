import { setupSchemaBuilder } from "./helpers";

// Verifies that the e2e harness's 001_init.sql shape can be reproduced by
// SchemaBuilder calls. Both versions land in the same DB under different
// prefixes (sql_e2e_* vs ts_e2e_*); we then diff information_schema rows
// between the two with the prefix stripped.

const SQL_INIT = `
CREATE TABLE sql_e2e_users (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sql_e2e_profiles (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES sql_e2e_users(id) ON DELETE CASCADE,
  bio     TEXT NULL
);

CREATE TABLE sql_e2e_orders (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES sql_e2e_users(id) ON DELETE CASCADE,
  total      NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sql_e2e_order_items (
  id       SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES sql_e2e_orders(id) ON DELETE CASCADE,
  sku      TEXT NOT NULL,
  qty      INTEGER NOT NULL,
  price    NUMERIC(10,2) NOT NULL
);

CREATE TABLE sql_e2e_posts (
  id           SERIAL PRIMARY KEY,
  author_id    INTEGER NOT NULL REFERENCES sql_e2e_users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  published_at TIMESTAMPTZ NULL
);

CREATE TABLE sql_e2e_tags (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE sql_e2e_post_tags (
  post_id INTEGER NOT NULL REFERENCES sql_e2e_posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES sql_e2e_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
`;

const TABLE_NAMES = [
  "users",
  "profiles",
  "orders",
  "order_items",
  "posts",
  "tags",
  "post_tags",
];

describe("e2e parity: SQL vs SchemaBuilder (integration)", () => {
  const fx = setupSchemaBuilder();

  const dropAll = async (): Promise<void> => {
    for (const prefix of ["sql_e2e_", "ts_e2e_"]) {
      await fx.dropTables(...TABLE_NAMES.map((n) => `${prefix}${n}`).reverse());
    }
  };

  beforeEach(dropAll);

  it("produces identical column + constraint metadata", async () => {
    const schema = fx.getSchema();

    await fx.rawQuery(SQL_INIT);

    await schema.createTable("ts_e2e_users", (t) => {
      t.id();
      t.text("email").notNull().unique();
      t.text("display_name").notNull();
      t.boolean("is_active").notNull().defaultRaw("TRUE");
      t.timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultRaw("NOW()");
    });
    await schema.createTable("ts_e2e_profiles", (t) => {
      t.id();
      t.integer("user_id")
        .notNull()
        .unique()
        .references("ts_e2e_users")
        .onDelete("cascade");
      t.text("bio").nullable();
    });
    await schema.createTable("ts_e2e_orders", (t) => {
      t.id();
      t.integer("user_id").notNull().references("ts_e2e_users").onDelete("cascade");
      t.decimal("total", 10, 2).notNull().defaultRaw("0");
      t.timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultRaw("NOW()");
    });
    await schema.createTable("ts_e2e_order_items", (t) => {
      t.id();
      t.integer("order_id").notNull().references("ts_e2e_orders").onDelete("cascade");
      t.text("sku").notNull();
      t.integer("qty").notNull();
      t.decimal("price", 10, 2).notNull();
    });
    await schema.createTable("ts_e2e_posts", (t) => {
      t.id();
      t.integer("author_id").notNull().references("ts_e2e_users").onDelete("cascade");
      t.text("title").notNull();
      t.text("body").notNull();
      t.timestamp("published_at", { withTimezone: true }).nullable();
    });
    await schema.createTable("ts_e2e_tags", (t) => {
      t.id();
      t.text("name").notNull().unique();
    });
    await schema.createTable("ts_e2e_post_tags", (t) => {
      t.integer("post_id").notNull();
      t.integer("tag_id").notNull();
      t.primary(["post_id", "tag_id"]);
      t.foreign("post_id").references("ts_e2e_posts").onDelete("cascade");
      t.foreign("tag_id").references("ts_e2e_tags").onDelete("cascade");
    });

    for (const name of TABLE_NAMES) {
      const sqlCols = await fetchColumns(fx.rawQuery, `sql_e2e_${name}`);
      const tsCols = await fetchColumns(fx.rawQuery, `ts_e2e_${name}`);
      expect(tsCols).toEqual(sqlCols);

      const sqlPk = await fetchPrimaryKey(fx.rawQuery, `sql_e2e_${name}`);
      const tsPk = await fetchPrimaryKey(fx.rawQuery, `ts_e2e_${name}`);
      expect(tsPk).toEqual(sqlPk);

      const sqlFk = await fetchForeignKeys(fx.rawQuery, `sql_e2e_${name}`, "sql_e2e_");
      const tsFk = await fetchForeignKeys(fx.rawQuery, `ts_e2e_${name}`, "ts_e2e_");
      expect(tsFk).toEqual(sqlFk);
    }
  });
});

interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function fetchColumns(
  raw: <T>(sql: string, params?: readonly unknown[]) => Promise<T[]>,
  table: string,
): Promise<ColumnRow[]> {
  const rows = await raw<ColumnRow>(
    "SELECT column_name, data_type, is_nullable, column_default "
      + "FROM information_schema.columns WHERE table_name = $1 "
      + "AND table_schema = current_schema() ORDER BY ordinal_position",
    [table],
  );
  // Strip prefix from sequence names embedded in defaults so they compare equal.
  return rows.map((r) => ({
    ...r,
    column_default: normalizeSeqDefault(r.column_default, table),
  }));
}

function normalizeSeqDefault(value: string | null, table: string): string | null {
  if (!value) return value;
  // SERIAL columns produce defaults like nextval('sql_e2e_users_id_seq'::regclass).
  // Strip the prefix from both sides so they compare cleanly.
  const stripped = table.replace(/^(sql_e2e_|ts_e2e_)/, "");
  return value.replace(/(sql_e2e_|ts_e2e_)/g, "").replace(stripped, "<table>");
}

interface PkRow {
  column_name: string;
  ordinal_position: number;
}

async function fetchPrimaryKey(
  raw: <T>(sql: string, params?: readonly unknown[]) => Promise<T[]>,
  table: string,
): Promise<string[]> {
  const rows = await raw<PkRow>(
    "SELECT kcu.column_name, kcu.ordinal_position "
      + "FROM information_schema.table_constraints tc "
      + "JOIN information_schema.key_column_usage kcu "
      + "  ON tc.constraint_name = kcu.constraint_name "
      + " AND tc.constraint_schema = kcu.constraint_schema "
      + "WHERE tc.constraint_type = 'PRIMARY KEY' "
      + "  AND tc.table_name = $1 "
      + "  AND tc.table_schema = current_schema() "
      + "ORDER BY kcu.ordinal_position",
    [table],
  );
  return rows.map((r) => r.column_name);
}

interface FkRow {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  delete_rule: string;
  update_rule: string;
}

async function fetchForeignKeys(
  raw: <T>(sql: string, params?: readonly unknown[]) => Promise<T[]>,
  table: string,
  stripPrefix: string,
): Promise<Array<Omit<FkRow, "foreign_table_name"> & { foreign_table_name: string }>> {
  const rows = await raw<FkRow>(
    "SELECT kcu.column_name, "
      + "       ccu.table_name AS foreign_table_name, "
      + "       ccu.column_name AS foreign_column_name, "
      + "       rc.delete_rule, rc.update_rule "
      + "FROM information_schema.table_constraints tc "
      + "JOIN information_schema.key_column_usage kcu "
      + "  ON tc.constraint_name = kcu.constraint_name "
      + " AND tc.constraint_schema = kcu.constraint_schema "
      + "JOIN information_schema.referential_constraints rc "
      + "  ON tc.constraint_name = rc.constraint_name "
      + " AND tc.constraint_schema = rc.constraint_schema "
      + "JOIN information_schema.constraint_column_usage ccu "
      + "  ON rc.unique_constraint_name = ccu.constraint_name "
      + " AND rc.unique_constraint_schema = ccu.constraint_schema "
      + "WHERE tc.constraint_type = 'FOREIGN KEY' "
      + "  AND tc.table_name = $1 "
      + "  AND tc.table_schema = current_schema() "
      + "ORDER BY kcu.column_name",
    [table],
  );
  return rows
    .map((r) => ({
      ...r,
      foreign_table_name: r.foreign_table_name.replace(stripPrefix, ""),
    }))
    .sort((a, b) => a.column_name.localeCompare(b.column_name));
}
