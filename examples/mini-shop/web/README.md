# mini-shop web — React + Tailwind frontend

A small single-page storefront for the [mini-shop](../README.md) YAOI demo API. It
exercises every endpoint the API exposes:

| UI element            | API call                                            |
| --------------------- | --------------------------------------------------- |
| Product grid + filters | `GET /products?inStock=&activeOnly=`               |
| "Place order" button   | `POST /orders` (transactional `placeOrder`)        |
| Orders list + status tabs | `GET /users/:id/orders?status=`                 |
| Order detail modal      | `GET /orders/:id` (nested `items → product`)       |
| User switcher           | scopes the orders list to a seeded user            |

## Stack

- **React 19** + **TypeScript** (strict)
- **Vite 6** dev server / bundler
- **Tailwind CSS v4** via `@tailwindcss/vite`

## Running

The frontend talks to the API through a dev proxy: every `/api/*` request is
forwarded to the Fastify server with the `/api` prefix stripped (see
`vite.config.ts`), so no CORS changes are needed on the server.

1. Start the API first (from `examples/mini-shop`):

   ```bash
   docker compose up --build        # API on http://localhost:3000
   # or run it on the host: npm run migrate:up && npm run seed && npm start
   ```

2. Then start the frontend (from this directory):

   ```bash
   npm install
   npm run dev                      # http://localhost:5173
   ```

If the API runs somewhere other than `http://localhost:3000`, point the proxy at
it with an env var:

```bash
VITE_API_TARGET=http://localhost:4000 npm run dev
```

## Scripts

```bash
npm run dev       # start the dev server with API proxy
npm run build     # type-check (tsc -b) and bundle to dist/
npm run preview   # serve the production build
npm run lint      # eslint (flat config, react-hooks + typescript-eslint)
```

## Notes

- The API has no "list users" endpoint, so the user switcher hardcodes the two
  accounts created by the example's seed script (`src/users.ts`).
- The cart clamps quantities to each product's reported `stock`. The server is
  still the source of truth: requesting more than is available makes
  `placeOrder` return `400 INSUFFICIENT_STOCK`, which the cart surfaces inline.
