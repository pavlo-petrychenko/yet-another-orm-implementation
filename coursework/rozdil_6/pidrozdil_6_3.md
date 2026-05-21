## 6.3 Реалізація з YAOI (AR-стиль і Repository-стиль)

Реалізація mini-shop свідомо розділена за патерном доступу до даних відповідно до природи кожного юзкейсу: простіші endpoint'и читання реалізовано в AR-стилі через статичні методи `BaseModel`, складніша транзакційна логіка — через кастомний `OrderRepository`. Це не є догматичним правилом, а ілюструє, що подвійний API YAOI дає змогу обирати ідіому за критерієм виразності, без перенесення коду між шарами при зміні рішення.

### 6.3.1 Точка ініціалізації DataSource

`DataSource` створюється і реєструється у глобальному registry один раз при старті процесу, після чого і AR-статика, і `makeRepository(...)` резолвлять `DataSource` без явного передавання. Лістинг 6.2 показує файл `src/datasource.ts`, що виконує цю роль.

**Лістинг 6.2 — `src/datasource.ts` — конструкція і bootstrap `DataSource`**

```ts
import { DataSource, DBType, setDataSource } from "@iriskaik/yaoi";

import "@/repositories/OrderRepository";

import { Order } from "@/entities/Order";
import { OrderItem } from "@/entities/OrderItem";
import { Product } from "@/entities/Product";
import { User } from "@/entities/User";

void [User, Product, Order, OrderItem];

export const dataSource = new DataSource({
  driver: {
    type: DBType.POSTGRES,
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "mini_shop",
    mode: "pool",
    pool: { min: 1, max: 4 },
  },
});

export async function bootstrap(): Promise<DataSource> {
  await dataSource.initialize();
  setDataSource(dataSource);
  return dataSource;
}
```

Два технічні моменти заслуговують пояснення. По-перше, `void [User, Product, Order, OrderItem]` — це side-effect-вираз, який гарантує, що TypeScript не видалить імпорти класів-сутностей при tree-shaking; самі імпорти запускають реєстрацію метаданих через декоратори `@Entity`. По-друге, імпорт `"@/repositories/OrderRepository"` без іменованих ідентифікаторів — це навмисний side-effect: декоратор `@EntityRepository(Order)` у тілі файлу регіструє кастомний підклас у `repositoryRegistry`, і подальші виклики `dataSource.getRepository(Order)` повертатимуть саме `OrderRepository`-екземпляр.

### 6.3.2 AR-стиль у простих handler'ах

Для F.1/F.2/F.5 — простих CRUD-запитів — використано Active Record: статичні методи класу-сутності повертають проміс із результатом, без посередницьких сервісів чи репозиторіїв. Лістинг 6.3 показує файл `src/routes/products.ts`.

**Лістинг 6.3 — AR-стиль: маршрути `/products` (`src/routes/products.ts`)**

```ts
export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: ProductsListQuery }>("/products", async (req) => {
    const inStock = req.query.inStock === "true";
    const activeOnly = req.query.activeOnly !== "false";

    return Product.find({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        ...(inStock ? { stock: { $gt: 0 } } : {}),
      },
      orderBy: [{ name: "asc" }],
    });
  });

  app.get<{ Params: ProductIdParams }>("/products/:id", async (req, reply) => {
    const id = Number(req.params.id);
    const product = await Product.findOne({ where: { id } });
    if (!product) {
      reply.code(404);
      return { error: "product_not_found", id };
    }
    return product;
  });
}
```

TypeScript-сервер усередині `where` пропонує лише ключі-скаляри `Product` (`id`, `sku`, `name`, `priceCents`, `stock`, `isActive`, `createdAt`); навмисна спроба написати `{ orderItems: ... }` дала б помилку компілятора, бо `orderItems` — це `Relation<OrderItem[]>`, а `ScalarKeys<Product>` виключає брендовані relation-типи. Аналогічно `{ stock: { $gt: 0 } }` пропонує оператори `WhereOperators<number>` тільки для числових типів (`$gt`, `$lt` тощо), а `{ isActive: { $gt: false } }` — спричинило б типову помилку.

### 6.3.3 Repository-стиль і транзакційний placeOrder

F.3 — оформлення замовлення — реалізовано через кастомний `OrderRepository`, що пакує всю критичну секцію у `dataSource.transaction()`. Лістинг 6.4 показує тіло методу `placeOrder` (повністю файл `src/repositories/OrderRepository.ts`).

**Лістинг 6.4 — Repository-стиль: транзакційний placeOrder**

```ts
@EntityRepository(Order)
export class OrderRepository extends Repository<Order> {
  public placeOrder(userId: number, lines: readonly PlaceOrderLine[]): Promise<Order> {
    if (lines.length === 0) {
      throw new DomainError("EMPTY_ORDER", "Order must contain at least one line item");
    }

    return this.dataSource.transaction(async () => {
      const products = makeRepository(Product);
      const items = makeRepository(OrderItem);

      const resolved: Array<PlaceOrderLine & { priceCents: number }> = [];
      let totalCents = 0;

      for (const line of lines) {
        if (line.quantity <= 0) {
          throw new DomainError("INVALID_QUANTITY", `quantity must be positive`);
        }
        const product = await products.findOneOrFail({ where: { id: line.productId } });
        if (!product.isActive) {
          throw new DomainError("PRODUCT_INACTIVE", `Product ${product.sku} is not active`);
        }
        if (product.stock < line.quantity) {
          throw new DomainError(
            "INSUFFICIENT_STOCK",
            `Product ${product.sku} has ${product.stock} in stock, requested ${line.quantity}`,
          );
        }
        await products.update({ id: product.id }, { stock: product.stock - line.quantity });
        totalCents += product.priceCents * line.quantity;
        resolved.push({ ...line, priceCents: product.priceCents });
      }

      const order = await this.insert({ userId, status: "pending", totalCents });

      for (const line of resolved) {
        await items.insert({
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          priceAtPurchaseCents: line.priceCents,
        });
      }
      return order;
    });
  }
}
```

Принципова деталь: репозиторії `products` і `items` отримані через `makeRepository(...)` всередині транзакційного колбека. Вони не передаються явно з аргументів — і не мусять. YAOI прозоро направляє виклики через `AsyncLocalStorage`-контекст pinned-tx драйвера (підрозділ 2.7): кожне звертання `products.update(...)`, `items.insert(...)` і `this.insert(...)` всередині колбека резолвить driver через `ambientTxFor(this.dataSource)`, що повертає той самий tx-driver, який тримає всі рядки в межах транзакції. При виході з колбека з помилкою YAOI відкочує транзакцію цілком — включно з усіма `UPDATE products` і `INSERT INTO orders`, що могли встигнути виконатися. Це і дає атомарну гарантію F.3: або всі позиції оформлені й залишок списано на коректну величину, або стан БД повертається у вихідний.

Транспортний шар над `placeOrder` тонкий — `src/routes/orders.ts` лише викликає метод і конвертує `DomainError`-винятки у HTTP-відповідь з кодом 400 (лістинг 6.5).

**Лістинг 6.5 — Транспортний шар над `placeOrder`**

```ts
app.post<{ Body: CreateOrderBody }>("/orders", async (req, reply) => {
  const orders = makeRepository(Order) as OrderRepository;
  try {
    const order = await orders.placeOrder(req.body.userId, req.body.items);
    reply.code(201);
    return order;
  } catch (err) {
    if (err instanceof DomainError) {
      reply.code(400);
      return { error: err.code, message: err.message };
    }
    throw err;
  }
});
```

Каст `as OrderRepository` потрібен тому, що `makeRepository(Order)` за загальним типом повертає `Repository<Order>`. Сам runtime-екземпляр уже є `OrderRepository`-нащадком (бо `@EntityRepository(Order)` зареєстрував підклас у registry, і `DataSource.getRepository(Order)` створив екземпляр через зареєстрований конструктор), тож каст безпечний.

### 6.3.4 Трирівневий include у GET /orders/:id

F.4 — повна картка замовлення з користувачем, всіма позиціями і відповідними товарами — реалізовано одним викликом `findOne` із вкладеним `include` (лістинг 6.6).

**Лістинг 6.6 — Трирівневий `include` для `GET /orders/:id`**

```ts
app.get<{ Params: OrderIdParams }>("/orders/:id", async (req, reply) => {
  const id = Number(req.params.id);
  const order = await Order.findOne({
    where: { id },
    include: {
      user: true,
      items: { include: { product: true } },
    },
  });
  if (!order) {
    reply.code(404);
    return { error: "order_not_found", id };
  }
  return order;
});
```

YAOI компілює це у три SQL-запити: основний `SELECT … FROM orders WHERE id = $1 LIMIT 1`, потім `SELECT … FROM users WHERE id = ANY($1)` (один елемент у масиві — від батьківського замовлення), і `SELECT … FROM order_items WHERE order_id = ANY($1)` із наступним догрузом продуктів за зібраними `product_id`. Це класична N+1-протипатернова рання групація: для одного замовлення з трьома позиціями виконується 4 запити, а не 8 (як було б при naive-lazy-loading кожної relation окремо). TypeScript-тип повернення відображає include-структуру: `order.items[k].product` має ненульовий тип `Product`, а не `Relation<Product>`.

### 6.3.5 Контейнеризація через docker-compose

Для повного відтворення стенду демонстрації написано `docker-compose.yml` із чотирьох сервісів, що утворюють детерміновану стартову послідовність:

1. **postgres** — образ `postgres:16-alpine` з healthcheck'ом через `pg_isready`. Інші сервіси чекають на `condition: service_healthy`, що уникає race condition'у «постгрес ще не приймає з'єднання» при холодному старті.
2. **migrate** — разовий контейнер, що виконує `npm run migrate:up` після того, як postgres визнано healthy. Усередині цей виклик стартує `MigrationRunner`, що бере advisory lock із ключем `0x59414f49` (підрозділ 4.4), здійснює discovery файлів у `migrations/`, обчислює SHA-256 і застосовує усе невиконане у транзакції.
3. **seed** — разовий контейнер з `npm run seed`, що чекає на `condition: service_completed_successfully` для `migrate`, тобто стартує лише якщо міграції закінчилися успішно. Сам файл `src/seed.ts` ідемпотентний — перевіряє `User.count()` і `Product.count()`, додає лише якщо таблиці порожні.
4. **api** — Fastify-сервер, чекає на завершення seed'а; слухає на `0.0.0.0:3000`.

Усі чотири сервіси (`migrate`, `seed`, `api`) використовують однаковий тег образу `yaoi-example-mini-shop`, побудований із multi-stage `Dockerfile`: перший stage збирає YAOI (`npm run build`), другий stage переносить лише `dist/`, `bin/`, `package.json` у фінальний образ і виконує `npm install` уже на боці прикладу. Це дає малий розмір образу (немає вихідних `.ts`-файлів YAOI у фінальному шарі) і єдиний `docker compose up` для повного підняття стенда.
