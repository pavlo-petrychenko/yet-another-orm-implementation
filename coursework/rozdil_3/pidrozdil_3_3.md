## 3.3 Реалізація Schema Builder (DDL AST)

Модуль `schema-builder` реалізує другу половину дворівневої архітектури з підрозділу 2.2: складає типобезпечне AST-представлення команд визначення схеми (DDL). Структурно він симетричний до `query-builder` — той самий шаблон «дискримінований союз + ієрархія builder'ів + валідація на стадії `build()`», — проте з двома суттєвими відмінностями: значно багатша система типів колонок і безпосереднє виконання отриманого AST через ін'єктований `Driver` замість повернення дерева назовні.

### 3.3.1 DDL AST і чотири типи команд

Корінь модуля — файл `schema-builder/types/DdlQuery.ts`, що оголошує перелік `DdlQueryType` із чотирма значеннями (`CREATE_TABLE`, `ALTER_TABLE`, `DROP_TABLE`, `RENAME_TABLE`), інтерфейс `DdlQueryCommon` зі спільними полями `type` і `table: TableDescription` (повторно використовується з `query-builder`) та союз `DdlQuery = CreateTableQuery | AlterTableQuery | DropTableQuery | RenameTableQuery`. На рівні системи типів цей союз повністю незалежний від DML-`Query` — у спільній сигнатурі `Driver` оголошено два окремі методи (`query(q: Query)` і `ddl(q: DdlQuery)`), що унеможливлює випадкову передачу DDL у DML-шлях, як обґрунтовано у підрозділі 2.2.

### 3.3.2 `ColumnType` як набір 16 параметризованих варіантів

Найбільш насичена частина типової системи — `ColumnType`, що оголошений у вигляді дискримінованого союзу з шістнадцяти варіантів, кожен з яких має поле-дискримінатор `kind`. Сюди входять стандартні скалярні типи (`varchar` із опційним `length`, `text`, `integer`, `bigint`, `smallint`, `boolean`), числовий тип `decimal` із `precision`/`scale`, темпоральні (`timestamp` із прапорцем `withTimezone`, `date`, `time`), документні (`json`, `jsonb`), `uuid`, автоінкрементні `serial`/`bigserial` і escape-варіант `{ kind: "raw"; sql: string }` для нетипізованого SQL-фрагмента.

Така будова дозволяє компілятору діалекту обробляти кожен тип у власному гілці `switch (column.columnType.kind)` із повним сторожем варіантів (exhaustiveness check): додавання нового варіанту в `ColumnType` неминуче призводить до помилок компіляції у тих компіляторах, де новий case не оброблений. Інтерфейс `ColumnSpec`, у свою чергу, поєднує `name`, `columnType` і набір властивостей колонки — `notNull`, `primary`, `unique`, опційний `default` та опційний `references`, — отримуючи тим самим повну форму однієї DDL-колонки.

### 3.3.3 `SchemaBuilder` як виконавчий фасад

Принципова відмінність від `QueryBuilder` полягає у тому, що `SchemaBuilder` не повертає AST назовні, а одразу виконує його через переданий у конструктор `Driver`. Цей вибір продиктований природою DDL: на відміну від DML, DDL-команди майже завжди потрібно виконати негайно (під час міграції, у тесті, при ініціалізації схеми), а не передавати далі по конвеєру. Тому методи `createTable(name, build)`, `alterTable(name, build)`, `dropTable(name, opts?)` і `renameTable(from, to)` приймають callback на builder, збирають у ньому AST і одразу делегують його у `this.driver.ddl(query)`.

Окремо у `SchemaBuilder` присутні два допоміжні методи без власного AST: `hasTable(name)` виконує одноразовий рантайм-запит до `information_schema.tables` через `driver.raw()` і повертає булеве значення (використовується у міграційних скриптах для ідемпотентності), а `raw(sql, params?)` дозволяє виконати довільний DDL-SQL, що не вкладається у жоден із чотирьох передбачених типів запиту (рідкісні специфічні команди — `CREATE EXTENSION`, `CREATE TYPE` тощо). Крім того, `alterTable` містить мікрооптимізацію: якщо callback не додав жодної операції, виклик до драйвера пропускається без побічних ефектів.

### 3.3.4 `TableBuilder` із цукром і типобезпечними колонками

`TableBuilder` пропонує одразу декілька рівнів абстракції. Найшвидший — це короткі цукрові методи `id(name?)` і `bigId(name?)`, що додають первинний ключ типу `serial`/`bigserial` із прапорцями `primary().notNull()`, та `timestamps()`, що додає пару колонок `created_at`/`updated_at` типу `timestamp with timezone` із дефолтним значенням `NOW()`. Ці методи компактують найпоширеніші ідіоми в один рядок.

Середній рівень — типізовані методи для кожного з шістнадцяти `ColumnType.kind`: `string(name, length?)`, `text(name)`, `integer(name)`, `bigint(name)`, `smallint(name)`, `boolean(name)`, `decimal(name, precision?, scale?)`, `timestamp(name, opts?)`, `date(name)`, `time(name)`, `json(name)`, `jsonb(name)`, `uuid(name)`, `raw(name, sql)`. Кожен з них повертає `ColumnBuilder`, що дозволяє далі додати модифікатори: `.notNull()`, `.nullable()`, `.default(value)` чи `.defaultRaw(sql)`, `.unique()`, `.primary()`, `.references(table, column?)` із подальшими `.onDelete(action)` і `.onUpdate(action)`. Окремий клас `ForeignKeyBuilder` обслуговує більш складні випадки із обмеженням таблиці-рівня та композитними ключами.

Найвищий рівень — обмеження таблиці-рівня: `primary(columns)` оголошує композитний первинний ключ, `unique(columns, opts?)` — табличну унікальність, `index(columns, opts?)` — звичайний чи унікальний індекс, `foreign(columns)` — повертає `ForeignKeyBuilder` з відкладеним викликом `references(table, column?)` для зовнішніх ключів складної форми. Завершальний метод `build()` поєднує усі зібрані частини у `CreateTableQuery`.

### 3.3.5 `AlterTableBuilder` як черга операцій

На відміну від `TableBuilder`, що матеріалізує одну атомарну команду створення таблиці, `AlterTableBuilder` накопичує впорядкований масив операцій, що далі будуть скомпільовані в один SQL-вираз `ALTER TABLE ... <op1>, <op2>, ...`. Тип `AlterOperation` — дискримінований союз восьми варіантів: `addColumn`, `dropColumn`, `renameColumn`, `alterColumn`, `addIndex`, `dropIndex`, `addForeignKey`, `dropConstraint`. Зміни існуючих колонок описуються вузьким типом `AlterColumnChanges` із трьох опційних полів (`setNotNull`, `setType`, `setDefault`), а власне `AlterColumnBuilder` дозволяє виставляти їх по одному з fluent-інтерфейсом.

Лістинг 3.2 показує спільну роботу `SchemaBuilder` і `TableBuilder` та форму AST, що буде передана у `Driver.ddl()` (саме як це відбувається — описано у підрозділі 3.4).

**Лістинг 3.2 — `SchemaBuilder`/`TableBuilder` у дії та форма результуючого AST**

```ts
await schema.createTable("users", (t) => {
  t.id();
  t.string("email", 255).notNull().unique();
  t.boolean("is_active").notNull().default(true);
  t.integer("organization_id").references("organizations").onDelete("CASCADE");
  t.timestamps();
  t.index(["email"], { name: "idx_users_email" });
});

// Внутрішній AST, що передано в driver.ddl():
// {
//   type: "CREATE_TABLE",
//   table: { name: "users" },
//   ifNotExists: false,
//   columns: [
//     { name: "id", columnType: { kind: "serial" },
//       primary: true, notNull: true, unique: false },
//     { name: "email", columnType: { kind: "varchar", length: 255 },
//       notNull: true, primary: false, unique: true },
//     { name: "is_active", columnType: { kind: "boolean" },
//       notNull: true, primary: false, unique: false,
//       default: { kind: "value", value: true } },
//     { name: "organization_id", columnType: { kind: "integer" },
//       notNull: false, primary: false, unique: false,
//       references: { table: "organizations", column: "id",
//                     onDelete: "CASCADE" } },
//     { name: "created_at", columnType: { kind: "timestamp",
//       withTimezone: true }, notNull: true, …,
//       default: { kind: "raw", sql: "NOW()" } },
//     { name: "updated_at", … },
//   ],
//   uniques: [], indexes: [{ name: "idx_users_email",
//                            columns: ["email"], unique: false }],
//   foreignKeys: [],
// }
```

Перетворення цього AST у конкретний SQL-діалект — справа компілятора PostgreSQL, описаного у наступному підрозділі. Інші діалекти будуть мати власні компілятори, що обробляють той самий `DdlQuery` — це і є та точка розширення мультидіалектності, що закладена у формі AST.
