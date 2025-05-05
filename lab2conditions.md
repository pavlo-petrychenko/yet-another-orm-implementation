## Паттерни використані під час роботи над цим проектом

### 1. Facade
Facade is a structural design pattern that provides a simplified interface to a library, a framework, or any other complex set of classes.

Клас [QueryBuilder](./src/query-builder/builder/QueryBuilder.ts)

Клас [QueryBuilder](./src/query-builder/builder/QueryBuilder.ts) виступає у ролі фасаду для множини класів-білдерів різних видів sql запитів.  
Замість прямого виклику кожного з окремих класів-будівельників відповідного типу запиту, цей клас надає можливість взаємодіяти лише з ним, у вигляді Entry point для усіх дій, пов'язаних з використанням QueryBuilder.

#### Де використовується:
- [BaseModelStatic](./src/base-model/BaseModelStatic.ts) : для отримання відповідного QueryBuilder для поточного типу sql запиту.

### 2. Builder
Builder is a creational design pattern that lets you construct complex objects step by step. The pattern allows you to produce different types and representations of an object using the same construction code.

Клас [SelectQueryBuilder](./src/query-builder/builder/select/SelectQueryBuilder.ts)  
Клас [InsertQueryBuilder](./src/query-builder/builder/insert/InsertQueryBuilder.ts)  
Клас [UpdateQueryBuilder](./src/query-builder/builder/update/UpdateQueryBuilder.ts)  
Клас [DeleteQueryBuilder](./src/query-builder/builder/delete/DeleteQueryBuilder.ts)  
Клас [ClauseMixin](./src/query-builder/builder/common/ClauseMixin.ts)  
And more...

SelectQueryBuilder\InsertQueryBuilder\UpdateQueryBuilder\... надають методи для покрокової побудови [об'єкта-репрезентації sql запиту](./src/query-builder/queries/Query.ts)  

#### Де використовується:
- [BaseModel](./src/base-model/BaseModel.ts) : для побудови об'єкта-репрезентації sql запиту, використовуючи builder pattern.

### 3. Decorator
Decorator is a structural design pattern that lets you attach new behaviors to objects by placing these objects inside special wrapper objects that contain the behaviors.

Декоратор [Entity](./src/decorators/entity/Entity.decorator.ts)  
Декоратор [Column](./src/decorators/column/Column.decorator.ts)  
Декоратор [PrimaryKey](./src/decorators/column/PrimaryKey.decorator.ts)  
And more...

Ці декоратори дозволяють створювати [метадату](./src/metadata/metadata-storage.ts) для відповідних елементів моделі. Пізніше ця метадата використовується при побудові sql запитів.

#### Де використовується:
- Використовується користувачем(девелопером) при створенні моделі

### 4. Factory
Factory Method is a creational design pattern that provides an interface for creating objects in a superclass, but allows subclasses to alter the type of objects that will be created.

Клас [DriverFactory](./src/drivers/DriverFactory.ts)  

Цей клас створює і повертає новий [Драйвер](./src/drivers/common/Driver.ts) відповідного типу.  
Код, що використовує, DriverFactory не піклується, який саме драйвер був йому повернутий, адже усі драйвери мають однаковий інтерфейс. Різниться лише його імплементація.

#### Де використовується:
- [Connection](./src/connection/Connection.ts) : для отримання відповідного до типу бази даних драйверу

### 5. Singleton
Singleton is a creational design pattern that lets you ensure that a class has only one instance, while providing a global access point to this instance.

Клас [Connection](./src/connection/Connection.ts)
Клас [PostgresDriver](./src/drivers/postgres/PostgresDriver.ts)

Клас [Connection](./src/connection/Connection.ts) надає статичний інтерфейс для естаблішингу і взаємодії з зв'язком з базою даних.  
Враховуючи специфіку проекту, інстанс зв'язку з базою даних має бути один і лише один.
Клас [PostgresDriver](./src/drivers/postgres/PostgresDriver.ts) надає інтерфейс для роботи з sql запитами, враховуючи діалектичні відмінності Postgres.  
Враховуючи специфіку проекту, інстанс драйверу має бути один і лише один.

#### Де використовується:
- [BaseModel](./src/base-model/BaseModel.ts) : для виконання sql запиту.

### 6. Bridge
Bridge is a structural design pattern that lets you split a large class or a set of closely related classes into two separate hierarchies—abstraction and implementation—which can be developed independently of each other.

Клас [ClauseMixin](./src/query-builder/builder/common/ClauseMixin.ts)

Клас [ClauseMixin](./src/query-builder/builder/common/ClauseMixin.ts) виступає як міст між конкретную реалізацію певного типу sql запитів і спільними для усіх типів sql зворотів(таких як WhereClause, LimitClause, GroupByClause, etc)

#### Де використовується:
- [SelectQueryBuilder](./src/query-builder/builder/select/SelectQueryBuilder.ts), [InsertQueryBuilder](./src/query-builder/builder/insert/InsertQueryBuilder.ts), [UpdateQueryBuilder](./src/query-builder/builder/update/UpdateQueryBuilder.ts), [DeleteQueryBuilder](./src/query-builder/builder/delete/DeleteQueryBuilder.ts)
для доступу до спільних sql зворотів між усіма типами sql запиту.

### 7. Composite
Composite is a structural design pattern that lets you compose objects into tree structures and then work with these structures as if they were individual objects.

Клас [Select](./src/query-builder/queries/Select.ts)  
Клас [Insert](./src/query-builder/queries/Insert.ts)  
Клас [Update](./src/query-builder/queries/Update.ts)  
Клас [Delete](./src/query-builder/queries/Delete.ts)  

Ці класи(інтерфейси) зберігають у собі деревоподібну структуру, яка є об'єктом-репрезентацією sql запиту.

### 8. Proxy

Клас [BaseModel](./src/base-model/BaseModel.ts)

Виступає у ролі проксі між кінцевим користувачем(девелопером) і базою даних, надаючи можливість працювати з об'єктами, що репрезентують таблиці(моделі) в базі даних.

#### Де використовується:
- Використовується користувачем(девелопером)

### 9. Chain of Responsibility
Chain of Responsibility is a behavioral design pattern that lets you pass requests along a chain of handlers. Upon receiving a request, each handler decides either to process the request or to pass it to the next handler in the chain.

[Model](./src/base-model/BaseModel.ts)->[QueryBuilder](./src/query-builder/builder/QueryBuilder.ts)->[Dialect](./src/drivers/common/Dialect.ts)->[Driver](./src/drivers/common/Driver.ts)->[Connection](./src/connection/Connection.ts)

Запит побудований користувачем(девелопером), використовуючи інтерфейс Моделі, який в свою чергу використовує QueryBuilder, під час виконання транслюється в SQL строку, використовуючи відповідний Діалект, де після цього, ця строка використовується Драйвером, для виконання запиту і отримання результату, який повертається назад у вигляді об'єкта-репрезентації до Моделі, яка є Entry Point для користувача(девелопера).

### 10. Template Method
Template Method is a behavioral design pattern that defines the skeleton of an algorithm in the superclass but lets subclasses override specific steps of the algorithm without changing its structure.

Клас [Dialect](./src/drivers/common/Dialect.ts)

Виступає у ролі темлейт метода, дозволяючи конкретним реалізаціям діалекту, змінювати алгоритм побудови запиту, залишаючи кроки тим самими.


### 11. Adapter
Adapter is a structural design pattern that allows objects with incompatible interfaces to collaborate.

Клас [QueryBuilder](./src/query-builder/builder/QueryBuilder.ts)

Кожна з реалізацій конкретного типу будівельника запитів містить відмінні інтерфейси, клас [QueryBuilder](./src/query-builder/builder/QueryBuilder.ts) дозволяє працювати з кожним з класів конкретної реалізації, не вдаючись в нюанси їхньої реалізації.

### 13. Strategy
Strategy is a behavioral design pattern that lets you define a family of algorithms, put each of them into a separate class, and make their objects interchangeable.

Клас [Dialect](./src/drivers/common/Dialect.ts)
Клас [ClauseMixin](./src/query-builder/builder/common/ClauseMixin.ts)

Клас ClauseMixin описує алгоритм побудови спільних зворотів sql запиту, дозволяючи роботу і розробку кожного окремого класу-реалізації відповідного sql зворота поокремості.

### 14. Dependency Injection

Клас [PostgresDialect](./src/drivers/postgres/dialect/PostgresDialect.ts)

Використовує класи PostgresParameterManager, PostgresDialectUtils, PostgresConditionCompiler, "інжектуя" їх в інстанс класу, дозволяючи методам саб-класів звертатись до того самого інстану класів-хелперів.  
Особливо важливо це є при використанні PostgresParameterManager, адже усі саб-класи мають мати можливість отримання поточного індексу-параметра.





