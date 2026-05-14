# 3.4 Драйвер PostgreSQL і компілятор діалекту

<!-- Що описати:
  - PostgresDriver: connect pool/single, query(), ddl(), transaction()
  - PostgresDialect.buildQuery(ast, ctx) → dispatch до 11 QueryCompiler'ів (Select/Insert/Update/Delete/CreateTable/...)
  - PostgresParameterManager: bind $1...$N, escape identifiers
  - Обробка помилок: DriverError, NotImplementedError для нереалізованих фіч
  - Фрагмент коду: SelectQueryCompiler (як приклад одного з 11)
-->
