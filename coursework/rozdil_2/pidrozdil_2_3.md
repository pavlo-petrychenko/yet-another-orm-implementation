# 2.3 Шар драйверів і діалектів, точки розширення

<!-- Що описати:
  - Інтерфейс Driver (connect, query, ddl, transaction, savepoint)
  - Dialect як набір QueryCompiler'ів для кожного типу AST-вузла
  - DriverFactory як точка реєстрації нових діалектів
  - ParameterManager для безпечного bind-параметрів ($1...$N)
  - Як архітектура полегшує додавання MySQL/SQLite (контракт, що треба реалізувати)
-->
