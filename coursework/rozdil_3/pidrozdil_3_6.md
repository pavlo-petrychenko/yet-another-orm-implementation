## 3.6 Repository, EntityManager, кастомні репозиторії, DI

Цей підрозділ розглядає реалізаційний бік Repository-шляху: клас `Repository<T>` як спільне ядро обох фасадів (підрозділ 2.5), кореневий об'єкт `DataSource`, транзакційний `EntityManager`, глобальний `repositoryRegistry` та допоміжну функцію `makeRepository`, через яку Repository-шлях інтегрується із зовнішніми DI-контейнерами.

### 3.6.1 `Repository<T>` як спільне ядро

Клас `Repository<T>` містить близько 470 рядків коду й об'єднує усю фактичну логіку доступу до даних. Його публічна поверхня поділена на чотири групи: читання (`findOne`, `findOneOrFail`, `find`, `count`, `exists`), запис (`create`, `insert`, `save`, `update`, `delete`, `deleteMany`), масові операції (`insertMany`, `saveMany`, `upsert`), а також спеціалізовані методи для зв'язків (`loadRelation`) та escape-hatch'ів (`query` для сирого SQL, `qb` для прямого доступу до низькорівневого `SelectQueryBuilder`).

Конструктор приймає чотири аргументи: `dataSource`, `metadata`, `target` (клас сутності) та опційний `txDriver`. Останній — це той самий механізм, через який репозиторій, створений всередині `EntityManager`, прив'язується до конкретного транзакційного з'єднання. Єдиною точкою вибору драйвера у репозиторії є приватний метод `resolveDriver()` зі строго впорядкованим пріоритетом: явний `txDriver`, переданий у конструктор; за його відсутності — `ambientTxFor(this.dataSource)`, що повертає транзакційний драйвер з ALS-сховища (підрозділ 3.8); і лише за відсутності обох — звичайний `this.dataSource.getDriver()`. Усі без винятку методи репозиторію проходять через цей резолвер, що утримує транзакційну поведінку послідовною.

### 3.6.2 Шаблон методу `find` і пайплайн доступу до даних

Усі методи читання реалізують один і той самий пайплайн із чотирьох кроків. Спершу `Repository.find` створює `SelectQueryBuilder` через приватний `buildSelect(a)`, що формує початковий список колонок з урахуванням опції `select` і необхідних FK-стовпців для подальших `include`. Далі через ін'єкцію колбеків викликаються чотири внутрішні утиліти: `compileWhere(a.where, metadata, qb)` перетворює об'єкт-`Where` у виклики `qb.where(...)` із врахуванням операторів `$eq`, `$ne`, `$in` тощо; `compileOrderBy(a.orderBy, metadata, qb)` транслює об'єкт-`OrderBy` у послідовність `qb.orderBy(...)`; `qb.limit(a.take)` і `qb.offset(a.skip)` додають пагінацію. Третій крок — виконання запиту через `resolveDriver().query(qb.build())` із отриманням сирих рядків. Четвертий — гідратація через `hydrateMany(target, metadata, rows)`, що створює інстанси сутності через `Object.create(prototype)` і копіює значення стовпців у відповідні властивості (з урахуванням різниці між `columnName` і `propertyName`).

Якщо в аргументах присутнє `include`, після гідратації запускається `loadIncludes(...)` — окремий рекурсивний завантажувач, що виконує по одному SELECT на кожен включений зв'язок (підрозділ 3.7). Той самий шаблон у компактнішій формі використано в `findOne` (з примусовим `limit(1)`), `count` (з `selectRaw("COUNT(*)::bigint AS count")` замість списку колонок) і `exists` (як обгортка над `findOne`).

### 3.6.3 Запис: інтелектуальний `save` і каскадна обгортка

Метод `save(entity)` сам визначає, виконати `INSERT` чи `UPDATE`. Алгоритм такий: він читає всі колонки первинного ключа з метаданих; якщо на інстансі присутні значення усіх PK (і жодне з них не `undefined`/`null`) — виконується `UPDATE` непервинних колонок (з повторним читанням повної версії з БД через `findOneByPkWithDriver`); інакше — стандартний `INSERT` із отриманням свіжих значень (наприклад, автоінкрементного `id`) через `RETURNING`. Перед обома гілками виконується перевірка `hasCascadeChildren`: якщо у сутності присутні зв'язки з прапорцем `cascade: true`, операція автоматично обгортається у транзакцію, всередині якої викликається `walkCascade` — рекурсивний обхід, що зберігає батьківську й дочірні сутності в правильному порядку (детально розглянуто у підрозділі 3.7).

Окремий публічний метод `update(where, patch)` працює без читання-перепису й виконує одиничний `UPDATE` за `Where`-фільтром; `delete(where)` — аналогічно для `DELETE`. Обидва повертають `rowCount`, тож виклик `await repo.delete({ id: 42 })` повертає кількість фактично видалених рядків.

### 3.6.4 `DataSource` і життєвий цикл

Кореневий об'єкт `DataSource` реалізує стан-машину з трьох станів — `new`, `connected`, `destroyed`. Метод `initialize()` дозволений тільки з `new` (повторні виклики піднімають `DATA_SOURCE_ALREADY_INITIALIZED`); `getRepository()` працює лише з `connected` (інакше — `DATA_SOURCE_NOT_INITIALIZED` або `DATA_SOURCE_DESTROYED`). Метод `destroy()` ідемпотентний — з `destroyed` стану одразу повертається без побічних ефектів.

Сам `DataSource` тримає `Map<EntityTarget, Repository<object>>` як кеш репозиторіїв: при першому виклику `getRepository(entity)` створюється або кастомний клас із `repositoryRegistry`, або базовий `Repository<T>`, і зберігається у кеші. Метод `transaction(fn)` — найскладніша частина класу. Він спершу консультується з ambient-tx: якщо вже активна транзакція цього самого `DataSource`, береться її pinned-tx Driver (вкладений savepoint у підрозділі 3.8), інакше — звичайний драйвер. Далі виконується `driver.withTransaction(...)`, у callback створюється `EntityManager` із прив'язаним до нього `closedRef: { value: boolean }`, формується `TxContext` і виконання користувацького callback обгортається у `runInTx(ctx, () => fn(em))`, що активує ALS-сховище.

### 3.6.5 `EntityManager` як транзакційно-локальний реєстр репозиторіїв

`EntityManager` — короткоживий об'єкт, що існує лише на час відкритої транзакції. Він тримає власну `Map<EntityTarget, Repository<object>>`, незалежну від кешу `DataSource`, бо репозиторії всередині транзакції повинні мати `txDriver`, а поза нею — ні. Метод `getRepository(entity, custom?)` повертає кешований репозиторій або створює новий (як кастомний клас з `repositoryRegistry`, так і базовий `Repository<T>`), завжди передаючи у конструктор поточний `tx: Driver` як четвертий аргумент. Опційний параметр `custom` дозволяє підставити будь-який клас репозиторію поверх реєстру — використовується у тестах для ізоляції.

Захист від некоректного використання реалізовано через приватний `closedRef`: `transaction()` встановлює `closedRef.value = true` у блоці `finally`; усі методи `EntityManager` спершу викликають приватну `assertOpen()`, що піднімає `ModelError` із кодом `"TRANSACTION_CLOSED"`, якщо async-callback продовжує тримати посилання на `em` після завершення транзакції. Це закриває характерну категорію баґів — відкладені звернення до закритого `EntityManager` із вкладених таймерів чи фонових Promise.

### 3.6.6 `repositoryRegistry` і `makeRepository`

Глобальний `repositoryRegistry` оголошений як модульний синглтон у `model/repositoryRegistry.ts` і містить `Map<EntityTarget, RepositoryCtor<object>>`. Метод `register(entity, ctor)` піднімає `ModelError` із кодом `"DUPLICATE_REPOSITORY"` при спробі зареєструвати другий кастомний клас для тієї самої сутності — це і є контракт, згаданий у підрозділі 2.5. Реєстрація виконується декоратором `@EntityRepository(Entity)` (модуль `decorators`), що додає у `ClassDecoratorContext` колбек, який спрацьовує одразу після оголошення класу і викликає `repositoryRegistry.register(...)`.

Функція `makeRepository<T>(entity)` — двохрядкова обгортка: вона викликає `getDataSource().getRepository(entity)`, повертаючи кешований репозиторій (кастомний, якщо такий зареєстрований). Її призначення — служити default-value у параметрі конструктора сервісу, що дозволяє типовим DI-контейнерам (зокрема, NestJS, InversifyJS) автоматично інстанціювати сервіс без явного оголошення провайдера для кожного репозиторію. Лістинг 3.5 демонструє реалізаційний бік такого DI-сценарію.

**Лістинг 3.5 — Реалізаційний шлях кастомного репозиторію**

```ts
@Entity({ tableName: "users" })
class User extends BaseModel {
  @PrimaryKey() public id!: number;
  @Column() public email!: string;
  @Column({ name: "is_active" }) public isActive!: boolean;
}

@EntityRepository(User)
class UserRepository extends Repository<User> {
  public findActive(): Promise<User[]> {
    // base class methods: this.find(), this.resolveDriver(), this.qb()
    return this.find({ where: { isActive: true } });
  }

  public async findByEmailDomain(domain: string): Promise<User[]> {
    // прямий доступ до низькорівневого QueryBuilder через this.qb()
    const qb = this.qb()
      .where({ name: "email" }, "LIKE", `%@${domain}`);
    const result = await this.resolveDriver().query(qb.build());
    return hydrateMany(this.target, this.metadata, result.rows);
  }
}

class UserService {
  // default-value через makeRepository робить DI прозорим
  constructor(
    private readonly users: UserRepository = makeRepository(User) as UserRepository,
  ) {}

  public listActive(): Promise<User[]> {
    return this.users.findActive();
  }
}

// За потреби — кастомне підставлення у тесті без зміни UserService:
new UserService(stubRepository as unknown as UserRepository);
```

Підклас `UserRepository` має повний доступ до protected-полів базового класу (`this.target`, `this.metadata`, `this.resolveDriver()`), що дозволяє писати специфічні методи без дублювання інфраструктурної логіки. Виклики цих методів автоматично враховують ambient-tx: всередині `ds.transaction(...)` той самий `userService.listActive()` отримає `Repository`, прив'язаний до транзакційного драйвера, без зміни сигнатури сервісу.

Завдяки описаній структурі обидва фасади публічного API — Active Record і Repository — поділяють одну й ту саму реалізацію `Repository<T>`. Що залишилося поза увагою у цьому підрозділі — це механізми завантаження зв'язків (`loadIncludes`, `walkCascade`, окремі `RelationLoader`-и для кожного типу зв'язку), і саме вони розглянуті далі.
