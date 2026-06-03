# mini-shop — YAOI demo

A minimal Fastify HTTP API that demonstrates the four headline features of YAOI on
a small e-commerce domain (users, products, orders, order items):

- **Migrations** — three handwritten files under `migrations/`, applied by the `yaoi` CLI
  with checksum drift detection, transactional DDL and advisory locking.
- **Active Record + Repository** — `Product.find(...)`, `user.save()` for simple cases;
  a custom `OrderRepository extends Repository<Order>` for the placement workflow.
- **Narrow typing** — typed `where`/`include` across all routes:
  `Order.findOne({ include: { items: { include: { product: true } } } })`.
- **Transactions** — `OrderRepository.placeOrder()` runs inside `dataSource.transaction()`,
  so stock decrement, order creation and order-item creation either all succeed or all roll back.

## Layout

```
examples/mini-shop/
├── yaoi.config.ts          # CLI config (defineConfig)
├── migrations/             # handwritten up()/down() files
├── src/
│   ├── entities/           # User, Product, Order, OrderItem (decorator-based)
│   ├── repositories/       # OrderRepository — custom @EntityRepository(Order)
│   ├── routes/             # Fastify routes (products, orders, users)
│   ├── datasource.ts       # DataSource construction + setDataSource()
│   ├── errors.ts           # DomainError (EMPTY_ORDER, INSUFFICIENT_STOCK, ...)
│   ├── seed.ts             # idempotent demo data
│   └── server.ts           # Fastify entry point
├── web/                    # React + Tailwind frontend (see web/README.md)
├── Dockerfile              # multi-stage image: builds yaoi + bundles the example
└── docker-compose.yml      # postgres + migrate + seed + api
```

## Running via Docker (zero local setup)

```bash
cd examples/mini-shop
docker compose up --build
```

The stack provisions:

1. **postgres** — Postgres 16 with credentials `postgres`/`postgres` and database `mini_shop`.
2. **migrate** — runs `npm run migrate:up` once postgres is healthy, then exits.
3. **seed** — runs `npm run seed` after migrations succeed, then exits.
4. **api** — starts the Fastify server on `http://localhost:3000` after seeding completes.

`docker compose down -v` removes everything including the database volume.

The migrate/seed jobs are one-off containers that wait for their dependency to reach
`service_completed_successfully`, so the API only starts on a fully migrated and seeded
database. To re-apply a fresh migration after editing files locally, run
`docker compose run --rm migrate`.

## Web frontend

A React + Tailwind storefront that drives every endpoint below lives in
[`web/`](web/README.md). Start the API first, then:

```bash
cd web
npm install
npm run dev        # http://localhost:5173, proxies /api/* to the API
```

## Running directly on the host

```bash
# from the repo root: build the local yaoi package first
npm install
npm run build

cd examples/mini-shop
npm install
cp .env.example .env       # adjust connection settings if needed

npm run migrate:up
npm run seed
npm start
```

## Endpoints

| Method | Path                  | Demonstrates                                                    |
| ------ | --------------------- | --------------------------------------------------------------- |
| GET    | /health               | sanity check                                                    |
| GET    | /products             | AR + narrow `where` with `$gt` operator and boolean flag        |
| GET    | /products/:id         | AR `findOne`                                                    |
| POST   | /orders               | `OrderRepository.placeOrder` — transactional stock + order      |
| GET    | /orders/:id           | nested `include` (`order → items → product`)                    |
| GET    | /users/:id            | AR `findOne`                                                    |
| GET    | /users/:id/orders     | filtered `where`, deep `include`, `orderBy`                     |

## Sample requests

```bash
# list active products in stock
curl 'http://localhost:3000/products?inStock=true'

# place an order
curl -X POST http://localhost:3000/orders \
  -H 'content-type: application/json' \
  -d '{
        "userId": 1,
        "items": [
          { "productId": 1, "quantity": 2 },
          { "productId": 3, "quantity": 1 }
        ]
      }'

# fetch an order with all items and their products
curl http://localhost:3000/orders/1

# pending orders of a user
curl 'http://localhost:3000/users/1/orders?status=pending'
```

If the request asks for more stock than available, `placeOrder` raises a `DomainError`
with code `INSUFFICIENT_STOCK`, the transaction is rolled back, and the HTTP response is
`400` with `{"error":"INSUFFICIENT_STOCK","message":"..."}`. The product stock and the
`orders` / `order_items` rows remain unchanged — verifiable by re-fetching `/products`.

## Migrations cheatsheet

```bash
npm run migrate:status                       # list pending / applied / mismatch
npm run migrate:make -- add_some_field       # generate a new migration file
npm run migrate:up                           # apply all pending migrations
npm run migrate:down                         # rollback the latest applied migration
```
