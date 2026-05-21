## 5.3 API і Developer Experience

Типобезпека — необхідна, але не достатня умова добре спроєктованої ORM. Не менш важливим є те, як розробник декларує сутності, як складає запити та як модифікує вже існуючий код під час еволюції проєкту. Цей підрозділ зіставляє чотири бібліотеки за трьома сторонами developer experience.

### 5.3.1 Декларація сутності

Декларативні ідіоми ORM поділяються на три родини. **Декоратори на класі** — підхід YAOI і TypeORM: користувач описує сутність як звичайний клас із декораторами `@Entity`, `@Column`, `@OneToMany` тощо; метадані живуть поряд із полями, що дає природну читабельність. **Клас-наслідник з статичними полями** — підхід Objection.js: користувач успадковує `class User extends Model`, а схему описує окремим статичним блоком (`static jsonSchema`, `static relationMappings`). **Schema-as-code** — підхід Drizzle: схема описується як набір TypeScript-значень (`export const users = pgTable("users", { id: serial("id"), … })`), а тип сутності автоматично виводиться через `typeof users.$inferSelect`. Лістинг 5.2 показує мінімальну сутність `User` із полями `id`, `email`, `isActive` і зв'язком `posts` у кожному з чотирьох стилів.

**Лістинг 5.2 — Декларація сутності, чотири бібліотеки**

```ts
// YAOI
@Entity({ tableName: "users" })
class User extends BaseModel {
  @PrimaryKey() public id!: number;
  @Column() public email!: string;
  @Column({ name: "is_active" }) public isActive!: boolean;
  @OneToMany(() => Post, (p) => p.author) public posts!: Relation<Post[]>;
}

// TypeORM
@Entity("users")
class User {
  @PrimaryGeneratedColumn() public id!: number;
  @Column() public email!: string;
  @Column({ name: "is_active" }) public isActive!: boolean;
  @OneToMany(() => Post, (p) => p.author) public posts!: Post[];
}

// Objection.js
class User extends Model {
  public static tableName = "users";
  public id!: number;
  public email!: string;
  public isActive!: boolean;
  public posts!: Post[];

  public static jsonSchema = {
    type: "object",
    required: ["email"],
    properties: {
      id: { type: "integer" },
      email: { type: "string" },
      isActive: { type: "boolean" },
    },
  };
  public static relationMappings = {
    posts: {
      relation: Model.HasManyRelation,
      modelClass: () => Post,
      join: { from: "users.id", to: "posts.user_id" },
    },
  };
}

// Drizzle
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
export type User = typeof users.$inferSelect;
```

Декораторний підхід (YAOI, TypeORM) є найкомпактнішим і найближчим до традиційного OOP-стилю. Objection.js — найбільш «верболізний»: окремі блоки `jsonSchema` і `relationMappings` дублюють інформацію, частково присутню у JSON-схемі або у самій базі даних. Drizzle, формально найдалі від OOP, парадоксально найкомпактніший: одна декларація `users` слугує одночасно і визначенням схеми, і джерелом типу.

### 5.3.2 Локалізованість помилок компілятора

YAOI повертає помилки компілятора з посиланням на конкретне поле або оператор: `User.find({ where: { foo: 1 } })` дає `Object literal may only specify known properties, and 'foo' does not exist in type 'Where<User>'` — повідомлення стандартного TypeScript-формату, що IDE підсвічує підкреслюванням саме на `foo`. Drizzle через свою колонкову модель також дає чіткі повідомлення: спроба `eq(users.email, 42)` породжує `Argument of type 'number' is not assignable to parameter of type 'string'` із указанням на сам аргумент. У TypeORM локалізованість часткова: помилки на рівні ключів `where` мають форму TypeScript-довідну, але через широке використання `any` у внутрішніх типах фактичні повідомлення часто посилаються на далекі від коду користувача симптоми (наприклад, проблеми у виведенні `FindOptionsWhere<T>`). Objection.js не дає компіляторних помилок взагалі для більшості неправильних запитів; розбіжності виявляються лише у runtime через виключення на боці БД.

### 5.3.3 Підтримка автодоповнення в IDE

YAOI забезпечує автодоповнення у трьох ключових місцях: всередині `where` пропонуються `ScalarKeys<T>`, всередині `select` — `ColumnKeys<T>`, всередині `include` — `RelationKeys<T>`. У всіх трьох місцях TypeScript-сервер пропонує суто релевантний набір ключів, а не плоский список усіх властивостей сутності. Drizzle забезпечує автодоповнення на рівні колонок-об'єктів: набирання `users.` миттєво показує усі стовпці з відповідними типами. У TypeORM автодоповнення працює стабільно для `where` і `select`, але слабше для `relations` через рядковий синтаксис. Objection.js дає мінімальне автодоповнення через те, що більшість методів приймає `string`-аргументи.

### 5.3.4 Еволюція коду: додавання поля

Сценарій додавання нового поля (наприклад, `lastLoginAt`) на існуючу сутність дозволяє порівняти бібліотеки за стійкістю коду до змін. У YAOI потрібні три кроки: додати `@Column() public lastLoginAt?: Date` до класу, написати міграцію `t.timestamp("last_login_at").nullable()` і виконати `migrate:up`; усі існуючі запити автоматично побачать нове поле через `Where<T>`, `select`, `Strict<T, A>`. TypeORM вимагає тих же кроків — додавання `@Column` і запис міграції, — але виконання `synchronize: true` (за замовчуванням) у dev-середовищі автоматично оновлює схему без явної міграції; це зручно, але приховує drift. Objection.js — потребує оновлення `jsonSchema` поряд із оголошенням властивості; саму схему БД треба міняти окремо через Knex migrations. Drizzle — оновлення схеми у файлі `schema.ts` і генерація міграції через `drizzle-kit generate` (про різницю в підходах до міграцій див. підрозділ 5.6).

Сумарно YAOI забезпечує найкомпактніший шлях додавання поля з повним статичним покриттям — одна декорована властивість + одна міграція. TypeORM на формальному рівні те саме, але з тонким мінусом неявних `synchronize`-перетворень. Objection.js вимагає синхронізації трьох джерел істини. Drizzle сумісний за компактністю з YAOI, але потребує окремого CLI-кроку (codegen).

### 5.3.5 Висновок

YAOI і Drizzle сходяться у компактності декларацій і високій локалізованості помилок компілятора, відрізняючись стилем (декораторний OOP проти schema-as-code). TypeORM схожий на YAOI декораторною ідіомою, але втрачає очки на типобезпеці й слабшому автодоповненні; Objection.js помітно «галасливіший» через дублювання інформації між декларацією моделі, JSON-схемою і relation mappings. Якщо критерій 5.2 виокремив YAOI і Drizzle як єдину пару типобезпечних рішень, то критерій 5.3 показує, що між ними поділ менш чіткий: вибір зводиться до філософських преференцій декораторного класу проти функціональної декларації.
