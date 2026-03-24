# Query Builder — Feature TODO

## Priority 1: Core SQL features

- [x] **HAVING clause** — `.having(callback)` on ClauseMixin, compiled after GROUP BY
- [x] **DISTINCT** — `.distinct()` on SelectQueryBuilder, emits `SELECT DISTINCT`
- [x] **LIKE / ILIKE / NOT LIKE / NOT ILIKE** — `.whereLike()`, `.whereILike()`, etc.
- [x] **BETWEEN / NOT BETWEEN** — `.whereBetween(col, min, max)`, compiled as `col BETWEEN $1 AND $2`
- [x] **IS NULL / IS NOT NULL** — `.whereNull(col)`, `.whereNotNull(col)`, compiled without right-hand param
- [x] **RETURNING clause wiring** — `.returning(...columns)` on Insert/Update/Delete builders
- [x] **Batch INSERT** — `valuesList([{...}, {...}])` accepts array, compiles multiple VALUES rows

## Priority 2: Common ORM features

- [x] **Table aliases** — `.from("users AS u")`, `.innerJoin("orders AS o", ...)`, compiler emits `AS` syntax
- [x] **Raw expressions** — `RawExpression` type, `.selectRaw()`, `.whereRaw()`, `RawCondition` in conditions
- [x] **Aggregate helpers** — `count()`, `sum()`, `avg()`, `max()`, `min()` return `RawExpression`
- [x] **Subqueries in WHERE** — `.whereIn("id", qb => qb.from("orders").select("user_id"))` callback API
- [x] **UNION / UNION ALL** — `.union(query)`, `.unionAll(query)` on SelectQueryBuilder
- [x] **CROSS JOIN** — `.crossJoin("table")` on JoinClauseBuilder and ClauseMixin

## Priority 3: Advanced features

- [ ] **CTEs (WITH clause)** — Common table expressions
- [ ] **Window functions** — `OVER (PARTITION BY ... ORDER BY ...)`
- [ ] **EXISTS / NOT EXISTS** — Subquery existence checks in WHERE
- [ ] **CASE expressions** — Conditional expressions in SELECT/WHERE
- [ ] **INSERT ... SELECT** — Insert from a subquery
- [ ] **UPSERT (ON CONFLICT)** — PostgreSQL `INSERT ... ON CONFLICT DO UPDATE/NOTHING`
