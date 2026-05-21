## 3.2 Реалізація Query Builder (DML AST)

Модуль `query-builder` реалізує DML-гілку дворівневої архітектури, окресленої в підрозділі 2.2: складає типобезпечне AST-представлення SQL-команд маніпуляції даними і повертає його у формі чистих структур даних, придатних до подальшої компіляції у конкретний SQL-діалект. У цьому підрозділі описано форму вузлів AST, ієрархію builder'ів та правила валідації, що виконуються у момент виклику `build()`.

### 3.2.1 AST як дискримінований союз

Корінь типової системи модуля — файл `query-builder/types/query/Query.ts`, у якому оголошено перелік `QueryType` із чотирма значеннями (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), інтерфейс `QueryCommon` зі спільними полями `type` і `table` та сам дискримінований союз `Query = SelectQuery | InsertQuery | UpdateQuery | DeleteQuery`. Кожен елемент союзу — окремий інтерфейс із літеральним типом-маркером (наприклад, `type: QueryType.SELECT`), що дозволяє TypeScript-компілятору автоматично звузити форму у `switch (q.type)` як на боці компілятора діалекту (підрозділ 2.3), так і у будь-якому коді, що працює з AST.

Сам інтерфейс `SelectQuery` агрегує посилання на дев'ять незалежних типів-клауз (`ConditionClause`, `JoinClause`, `GroupByClause`, `OrderByClause`, `LimitClause`, `OffsetClause`, `ReturningClause`, `OnConflictClause`, `RawExpression`), кожен із яких живе у власній теці під `types/clause/` і не залежить від конкретного типу запиту, у якому використовується. Така будова робить клаузи «вільними частинами» AST: ту саму `ConditionClause` без зміни форми використано і в `SelectQuery.where`, і в `UpdateQuery.where`, і в `DeleteQuery.where`, і у вкладеному `SelectQuery` всередині `BaseCondition.right` для предикатів виду `WHERE col IN (SELECT ...)`.

### 3.2.2 Іммутабельне дерево й `ConditionClause`

Усі вузли AST оголошені як прості `interface`, без методів — це чисті об'єкти-носії стану, що серіалізуються у JSON і не потребують спеціального протоколу обходу. Особливої уваги заслуговує `ConditionClause`, що сама є дискримінованим союзом трьох форм: `BaseCondition` (атомарне порівняння виду `left operator right`), `ConditionGroup` (вкладена група з масивом дочірніх умов) і `RawCondition` (фрагмент сирого SQL із позиційними параметрами). Усі три варіанти несуть опціональне поле `connector: LogicalOperator`, що приймає одне з чотирьох значень — `AND`, `OR`, `AND_NOT`, `OR_NOT`, — і визначає, як умова приєднується до попередньої в межах однієї групи; відсутність `connector` зарезервована для самої першої умови.

Така тричленна форма `ConditionClause` напряму відображає правила формальної граматики SQL-предикатів: атом, кон'юнкція або диз'юнкція з можливим запереченням, та екранна щілина у вигляді сирого SQL для випадків, що не вкладаються у решту DSL.

### 3.2.3 Ієрархія builder'ів

Усі побудовники реалізують єдиний інтерфейс `Builder` з одним методом `build(): Query`. Фасадний клас `QueryBuilder` слугує фабрикою чотирьох верхньорівневих побудовників: `select(table)`, `insert(table)`, `update(table)`, `delete(table)` — кожен повертає екземпляр відповідного `*QueryBuilder`. Кінцевий метод `build()` повертає літеральний підтип AST (`SelectQuery`, `InsertQuery` тощо) — це важливо для звуження типу при подальшому використанні і для повноти перевірки в компіляторі діалекту.

Усередині `query-builder/builders/` розміщено лише чотири «верхньорівневі» класи: `SelectQueryBuilder`, `InsertQueryBuilder`, `UpdateQueryBuilder`, `DeleteQueryBuilder`. Сім підпорядкованих builder'ів — `ConditionBuilder`, `JoinClauseBuilder`, `GroupByClauseBuilder`, `OrderByClauseBuilder`, `LimitClauseBuilder`, `OffsetClauseBuilder`, `ReturningClauseBuilder` — винесено у теку `builders/internal/`. Жоден з них не експортується з `query-builder/index.ts`, тож вони є деталями реалізації; кожен підтримує однотипний контракт `isEmpty(): boolean` та `build(): SomeClause`, що дозволяє верхньому builder'у однаково обробляти всі опціональні клаузи у фінальному `build()`.

### 3.2.4 Композиція внутрішніх builder'ів

Завдяки винесенню клауз у окремі мікро-builder'и, тіло `SelectQueryBuilder.build()` зводиться до повторюваного шаблону «якщо клауза не порожня — додати її до результату»: для кожного з восьми опціональних полів виконується перевірка `!builder.isEmpty()`, і лише в цьому випадку поле з'являється у фінальному AST. Це утримує сам клас плоским: попри те, що `SelectQueryBuilder` приймає вісім різних типів клауз, його тіло не містить жодної глибокої вкладеності й кожна частина логіки локалізована в окремому файлі. Той самий шаблон використано в `UpdateQueryBuilder` та `DeleteQueryBuilder`; `InsertQueryBuilder` уникає більшості клауз і обмежується `ReturningClauseBuilder` й опційним `OnConflictClause`, переданим напряму.

### 3.2.5 `ConditionBuilder` із рекурсивними групами

Клас `ConditionBuilder` забезпечує повноту DSL-предикатів. Окрім трьох базових методів (`where`, `andWhere`, `orWhere` і двох симетричних `*Not`-варіантів), він пропонує chainable-зручності `whereIn`, `whereLike`, `whereILike`, `whereBetween`, `whereNull` із їхніми `or*`/`*Not`-двійниками — усього 28 публічних методів. Внутрішня функція `nextConnector()` повертає `AND` для всіх викликів, окрім першого (де `connector` залишається `undefined`), що звільняє користувача від необхідності вручну вказувати початковий зв'язувач: `where(...).whereIn(...).whereNull(...)` автоматично перетворюється у `... AND ... AND ...`.

Підтримка довільно вкладених груп реалізована через метод `group(connector, callback)`, що створює новий екземпляр `ConditionBuilder`, передає його в callback, забирає його накопичені `conditions` і обгортає у вузол `ConditionGroup` із заданим `connector`. Такий підхід відтворює природне правило побудови дужок у SQL: усе, що зібрано всередині callback, стає одним атомом для верхнього рівня.

### 3.2.6 Валідація на стадії `build()`

YAOI приймає рішення про коректність побудованого AST у момент виклику `build()`, до того, як він буде переданий компілятору діалекту. Виокремлюються два режими реакції на проблеми. Перший — hard errors через `QueryBuilderError`: `SelectQueryBuilder` відмовляється збирати запит, що має `having()` без `groupBy()` або `offset()` без `limit()`; `InsertQueryBuilder` вимагає принаймні одного виклику `values()` й непорожнього `onConflict.targetColumns`; `UpdateQueryBuilder` — непорожнього `set()`. Усі повідомлення збираються в один масив і піднімаються однією помилкою, тож розробник бачить повний список проблем, а не зупиняється на першій.

Другий режим — soft warnings через інтерфейс `QueryBuilderWarning` і callback `onWarning(cb)`: `UpdateQueryBuilder` і `DeleteQueryBuilder` за наявності зареєстрованого callback повідомляють про відсутність `where()` (запит, що дійсно зачіпає всі рядки таблиці, можливий, але майже завжди є помилкою — формальною забороною YAOI обмежує себе непотрібно). Лістинг 3.1 показує спільну роботу `SelectQueryBuilder` та `ConditionBuilder` і форму AST, що виходить на виході.

**Лістинг 3.1 — `QueryBuilder` у дії та форма результуючого AST**

```ts
const qb = new QueryBuilder();
const query = qb
  .select({ name: "users" }, { name: "id" }, { name: "email" })
  .where((c) => c
    .where({ name: "is_active" }, "=", true)
    .group(LogicalOperator.AND, (g) => g
      .where({ name: "created_at" }, ">=", new Date("2025-01-01"))
      .orWhere({ name: "is_admin" }, "=", true)
    )
  )
  .orderBy({ name: "created_at" }, OrderDirection.DESC)
  .limit(50)
  .build();

// Тип query звужений до SelectQuery; його структура має вигляд:
// {
//   type: "SELECT",
//   table: { name: "users" },
//   columns: [{ name: "id" }, { name: "email" }],
//   where: {
//     type: "Condition", conditionType: "Group",
//     conditions: [
//       { conditionType: "Base", left: { name: "is_active" },
//         operator: "=", right: true },
//       { conditionType: "Group", connector: "AND",
//         conditions: [
//           { conditionType: "Base", left: { name: "created_at" },
//             operator: ">=", right: <Date> },
//           { conditionType: "Base", connector: "OR",
//             left: { name: "is_admin" }, operator: "=", right: true },
//         ] },
//     ],
//   },
//   orderBy: { … }, limit: { … },
// }
```

Отриманий об'єкт `query` далі передається у `Driver.query(query)`, що делегує його компілятору відповідного діалекту — як саме це відбувається, описано в підрозділі 3.4. Наступний підрозділ розглядає симетричний модуль `schema-builder`, що працює за тим самим принципом «AST + builder + валідація», але для команд визначення схеми.
