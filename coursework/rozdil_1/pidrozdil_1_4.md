# 1.4 Огляд TypeScript/Node.js рішень: TypeORM, Objection.js, Drizzle

<!-- Що описати (по одному короткому огляду на кожен):

  TypeORM:
    - Decorator-based підхід, схожий на Hibernate
    - Підтримує і Active Record, і Data Mapper
    - Мультидіалектний (Postgres, MySQL, SQLite, MSSQL, Oracle тощо)
    - Обмеження: знаменита непослідовність типів у складних запитах, проблеми з migration CLI

  Objection.js:
    - Збудована поверх Knex.js (Query Builder)
    - Орієнтована на JavaScript, типи додані пізніше (слабша типізація)
    - Сильна підтримка eager loading через withGraphFetched
    - Обмеження: типізація менш строга, ніж у конкурентів

  Drizzle:
    - Query-first, schema-as-code (TypeScript-схема)
    - Майже raw SQL, але типобезпечний
    - Дуже легка, без декораторів і метаданих в runtime
    - Обмеження: відсутність Active Record, мінімалістичний API

  Інші згадки для контексту (без детального огляду): Prisma (schema-first, codegen), Sequelize (legacy), MikroORM, Knex (тільки QB).
-->
