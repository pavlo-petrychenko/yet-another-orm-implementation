## 5.2 Типобезпека

Типобезпека — вимога Н.1, що формувала структуру YAOI з найперших проєктних рішень. У цьому підрозділі прямо зіставлено, як чотири бібліотеки поводяться у трьох типових ситуаціях: формулювання `WHERE`-фільтра, селективна проекція стовпців і вкладене завантаження зв'язків. Для прикладу використано однакову сутність `User` із полями `id`, `email`, `isActive`, `createdAt` і зв'язком `posts: Post[]`.

### 5.2.1 Гарантії на рівні `WHERE`

YAOI обмежує ключі `Where<T>` множиною `ScalarKeys<T>` — стовпців, тип яких сумісний зі `ScalarParam`. Спроба використати неіснуюче поле (`foo`), relation (`posts`) або несумісний оператор (`{ age: { $like: "%" } }` для числової колонки) дає помилку компілятора з вказівкою на конкретний рядок (підрозділ 2.6). TypeORM в `find({ where: { … } })` приймає `FindOptionsWhere<T>`, що формально обмежує ключі до полів сутності, але оператори побудовані як runtime-фабрики (`Equal(value)`, `In(values)`, `Like(pattern)`) без зв'язку з типом стовпця: запис `Like("%")` для числового поля проходить компіляцію без помилки. Objection.js успадковує API Knex.js: метод `.where(column, operator, value)` приймає `string | object | Knex.Raw` для першого аргументу, тож компілятор не перевіряє ані ключ, ані тип значення; типобезпека `where` досягається лише через додаткові helper'и на кшталт `User.query().where("email", "=", email)`, у яких ключ — звичайний string-literal без зв'язку з полями `User`. Drizzle єдиний серед опонентів утримує повну типобезпеку: оператори `eq(users.email, value)`, `gt(users.createdAt, date)` приймають референси на стовпці-об'єкти, що містять інформацію про тип, і компілятор перевіряє відповідність типів аргументу і операції.

### 5.2.2 Селективна проекція стовпців

YAOI через тип `Strict<T, A>` точно виводить форму результату при `select: { id: true, email: true }` як `Pick<User, "id" | "email">[]`, із виключенням relations за замовчуванням і додаванням лише тих, що явно зазначені в `include`. TypeORM пропонує опцію `select: ["id", "email"]`, що проте не звужує тип повернення: `find` повертає `User[]`, незалежно від `select`. Розробник, що звернеться до `user.isActive` у наступному рядку, отримає `undefined` у runtime замість помилки компілятора. Objection.js робить те саме на рівні API (`Model.query().select("id", "email")`), повертаючи `User[]`. Drizzle, що працює на рівні SQL-виразу, з боку типу абсолютно точний: `db.select({ id: users.id, email: users.email }).from(users)` повертає `{ id: number; email: string }[]` — нічого більше.

### 5.2.3 Вкладене завантаження зв'язків

Тут YAOI відрізняється найбільше. Через рекурсивний `IncludeConfig<T>` запит `User.find({ narrow: true, include: { posts: { include: { comments: true } } } })` виводиться компілятором у точний тип з `posts: Array<...>` і вкладеним `comments: Array<...>`, без явних анотацій (підрозділ 2.6, лістинг 2.6). TypeORM має опцію `relations: ["posts", "posts.comments"]` — рядковий ієрархічний синтаксис, що не звужує тип повернення (relations залишаються опційними у типі `User`, і доступ до `user.posts` у TypeScript дає `Post[] | undefined`). Objection.js пропонує `withGraphFetched("[posts.[comments]]")` — потужний за виразністю, але повністю рядковий: помилка у назві (`coments` замість `comments`) виявляється лише у runtime. Drizzle підтримує два механізми: класичні `with` у Relational Query API (типобезпечні, повертають точний тип результату) або явні `leftJoin` у Core API (також типобезпечні, але вимагають від розробника самостійно складати результат з плоских join-рядків).

### 5.2.4 Підсумкове порівняння через приклад

Лістинг 5.1 показує однотипний запит на чотирьох бібліотеках — «активні користувачі з полів `id`/`email` та їхні дописи» — і вказує, який саме тип результату виводить компілятор.

**Лістинг 5.1 — Селективний запит із вкладеним `include`, чотири бібліотеки**

```ts
// YAOI
const users = await User.find({
  narrow: true,
  where: { isActive: true },
  select: { id: true, email: true },
  include: { posts: true },
});
// users: Array<{ id: number; email: string;
//                posts: Array<Omit<Post, "author" | "comments">> }>

// TypeORM
const users = await userRepo.find({
  where: { isActive: true },
  select: ["id", "email"],
  relations: ["posts"],
});
// users: User[]  — повна сутність, без звуження від select; posts опційне у типі User

// Objection.js
const users = await User.query()
  .where("isActive", true)
  .select("id", "email")
  .withGraphFetched("posts");
// users: User[]  — повна сутність; рядки "isActive"/"id"/"email"/"posts" не перевіряються

// Drizzle (Relational Query API)
const users = await db.query.users.findMany({
  where: eq(users.isActive, true),
  columns: { id: true, email: true },
  with: { posts: true },
});
// users: Array<{ id: number; email: string; posts: Post[] }>
```

### 5.2.5 Висновок

За критерієм типобезпеки тільки два з чотирьох рішень — YAOI та Drizzle — забезпечують наскрізну статичну перевірку, від форми `WHERE` через звуження проекцій до виведення типу результату з вкладеним `include`. TypeORM реалізує часткову типобезпеку: ключі полів обмежені, проте проекції й оператори втрачають інформацію про тип. Objection.js покладається на рядкові ідентифікатори і відповідно отримує слабкі гарантії на рівні компілятора. У межах самих типобезпечних рішень YAOI та Drizzle досягають мети різними шляхами: YAOI оптимізує під декораторний стиль і шаблон Active Record, де метадані сутності — окрема декларація; Drizzle — під query-first зі схемою-як-кодом, де колонки самі по собі є типобезпечними об'єктами. Кожен підхід має власні компроміси у виразності, що детально розглянуто далі.
