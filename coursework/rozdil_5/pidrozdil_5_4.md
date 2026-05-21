## 5.4 Подвійний API і DI-сценарії

Подвійний публічний API — Active Record і Repository на спільному ядрі — є відмітною властивістю YAOI, зафіксованою як вимога Ф.3 (підрозділ 1.6). Цей підрозділ зіставляє, як виглядає реалізація типового сервісного шару у DI-стилі для кожної з чотирьох бібліотек.

### 5.4.1 Підтримка двох стилів у кожному з рішень

YAOI пропонує обидва стилі однаково першокласно: `BaseModel`-нащадки дають AR-сигнатуру (`User.find(...)`, `user.save()`, `user.delete()`), `Repository<User>` через `DataSource.getRepository(User)` або `makeRepository(User)` — Repository-сигнатуру (`repo.find(...)`, `repo.save(entity)`); і AR-методи, і Repository-методи внутрішньо виконуються тим самим класом `Repository<User>` (підрозділ 2.5). Кастомний підклас `Repository<User>` із додатковими методами реєструється через `@EntityRepository(User)` і автоматично використовується при будь-якому шляху резолюції.

TypeORM історично підтримував обидва стилі: AR через `BaseEntity` і Repository через `DataSource.getRepository(User)`. Однак з версії 0.3 AR-режим маркований як легасі, його розвиток зупинено, документація рекомендує Repository-стиль. DI-інтеграція з контейнерами реалізована не через сам TypeORM, а через зовнішній пакет `@nestjs/typeorm` (для NestJS) або через user-land коду (для InversifyJS, TSyringe).

Objection.js за замовчуванням орієнтований на AR-подібний стиль через `Model.query()`: `await User.query().where(...).select(...).withGraphFetched(...)` — типовий запит виходить з статичного методу класу моделі. Repository-патерн можливий як user-land абстракція над цим API, але самою бібліотекою не пропонується і не документований.

Drizzle принципово функціональний: ні AR, ні Repository не реалізовані, а всі операції — методи об'єкта `db` (`db.select(...).from(...)`, `db.insert(...).values(...)`). Для побудови сервісного шару розробник самостійно вирішує, як організувати доступ — найпоширеніший підхід полягає у написанні «функцій-репозиторіїв» (`findActiveUsers(db: DrizzleDb)`), у яких `db` явно передається першим аргументом.

### 5.4.2 Чотири реалізації того самого сервісу

Лістинг 5.3 показує сервіс `UserService` із одним методом `listActive()` у чотирьох ідіомах. Контекст однаковий — NestJS-подібний DI-контейнер, що очікує конструктор-ін'єкцію залежностей.

**Лістинг 5.3 — Сервіс із кастомним репозиторієм, чотири бібліотеки**

```ts
// YAOI
@EntityRepository(User)
class UserRepository extends Repository<User> {
  public findActive(): Promise<User[]> {
    return this.find({ where: { isActive: true } });
  }
}

class UserService {
  constructor(
    private readonly users: UserRepository =
      makeRepository(User) as UserRepository,
  ) {}
  public listActive(): Promise<User[]> {
    return this.users.findActive();
  }
}

// TypeORM (NestJS-style)
@Injectable()
class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  public listActive(): Promise<User[]> {
    return this.users.find({ where: { isActive: true } });
  }
}
// + у модулі: TypeOrmModule.forFeature([User])

// Objection.js (user-land repository)
class UserRepository {
  public findActive(): Promise<User[]> {
    return User.query().where("isActive", true);
  }
}

class UserService {
  constructor(private readonly users: UserRepository = new UserRepository()) {}
  public listActive(): Promise<User[]> {
    return this.users.findActive();
  }
}

// Drizzle (functional)
export async function findActiveUsers(db: DrizzleDb): Promise<User[]> {
  return db.query.users.findMany({ where: eq(users.isActive, true) });
}

class UserService {
  constructor(private readonly db: DrizzleDb) {}
  public listActive(): Promise<User[]> {
    return findActiveUsers(this.db);
  }
}
```

### 5.4.3 Інтеграція з ambient-транзакціями

Окремий важливий аспект подвійного API — підтримка прозорого долучення до зовнішньо відкритої транзакції. YAOI вирішує це через `AsyncLocalStorage` (підрозділ 2.7): і `User.find(...)`, і `userService.listActive()` всередині `ds.transaction(...)` автоматично виходять на pinned-tx Driver через консультацію з ambient-контекстом — прикладний код не змінюється. TypeORM до версії 0.3 покладався на DI-контейнер для прокидування `EntityManager` через decorators (`@Transaction`/`@TransactionManager`), що було неідіоматичним та помилкомістким; у 0.3 з'явилася функція `dataSource.transaction(em => ...)`, що приймає колбек із новим `EntityManager`, який потрібно явно передавати у репозиторії — інтеграції з ALS немає в самому ядрі (але є у `@nestjs/typeorm` як надбудова). Objection.js пропонує `Model.transaction(trx => Model.bindTransaction(trx, async () => ...))` — спеціальний механізм binding'у, що локалізує транзакційний контекст, але вимагає його явного передавання через всі методи. Drizzle підтримує `db.transaction(async (tx) => ...)`, де `tx` — той самий об'єкт `db` зі зміненими методами для транзакційного режиму; знову ж, його потрібно явно передавати.

### 5.4.4 Висновок

YAOI — єдина з чотирьох бібліотек, що пропонує обидва стилі (AR і Repository) як рівноправні фасади над спільним ядром, із підтримкою кастомних репозиторіїв і прозорого долучення до ambient-tx без зміни сигнатур прикладного коду. TypeORM формально пропонує обидва, але має тонший набір гарантій: AR-режим легасі, ambient-tx — лише через зовнішній DI-пакет. Objection.js і Drizzle спеціалізовані на одному стилі (AR-подібний і функціональний відповідно), і Repository-патерн у них реалізується як user-land абстракція. У термінах вимог Ф.3 і часткової Ф.5 (ambient-tx) YAOI займає унікальну позицію у просторі компромісів.
