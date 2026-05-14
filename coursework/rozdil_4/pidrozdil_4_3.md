# 4.3 Транзакційний DDL і atomic rollback

<!-- Що описати:
  - Кожна міграція виконується у BEGIN ... COMMIT
  - У межах транзакції — і виклик up(), і INSERT у yaoi_migrations
  - Якщо up() кидає — ROLLBACK скасовує і DDL, і tracking-рядок (атомарність)
  - Чому це працює в Postgres (transactional DDL) — і обмеження для інших СУБД (наприклад, MySQL не має transactional DDL)
  - Наслідки для майбутніх діалектів — згадка у Розділі 5.5
-->
