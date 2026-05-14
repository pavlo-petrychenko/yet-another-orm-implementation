# 3.8 Транзакції та savepoints

<!-- Що описати:
  - DataSource.transaction(cb): BEGIN → cb → COMMIT/ROLLBACK
  - Вкладені транзакції: SAVEPOINT sp_N, RELEASE/ROLLBACK TO
  - AsyncLocalStorage: як AR і Repo автоматично бачать ambient tx
  - withRolledBackTransaction для тестових сценаріїв
  - Фрагмент коду: вкладена транзакція з частковим відкатом
-->
