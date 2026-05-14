# 2.7 Транзакції та ambient-пропагація через AsyncLocalStorage

<!-- Що описати:
  - Проблема: як прокинути transaction context крізь шари без явного передавання
  - Рішення: AsyncLocalStorage (Node.js) — контекст прив'язаний до async-стеку
  - Nested transactions через SAVEPOINT sp_N
  - dataSource.transaction(async () => {...}) — і AR, і Repo автоматично використовують ambient tx
  - withRolledBackTransaction(...) для тестів
  - Не використовуємо явний параметр tx у методах — це частина DX-аргументації
-->
