# 5.7 Підсумкова таблиця, обмеження YAOI, future work

<!-- Що описати:

  Підсумкова таблиця: критерій × ORM, з короткою оцінкою (++ / + / − / −−) або текстовою позначкою.

  Обмеження YAOI:
    - Поки лише PostgreSQL (MySQL/SQLite — на майбутнє)
    - Немає bulk-операцій з ON CONFLICT різних варіантів
    - Немає subquery у where (наскільки актуально звірити перед здачею)
    - Немає raw query escape hatch (або є — звірити)
    - Не зроблено хуків життєвого циклу (beforeInsert тощо)
    - Розмір API менший, ніж у TypeORM

  Future work:
    - Бенчмарки продуктивності (порівняння latency на типових сценаріях)
    - Підтримка MySQL і SQLite
    - Event/lifecycle hooks
    - Schema introspection і генерація сутностей з існуючої БД
    - Інтеграційні пакети для NestJS / Fastify
-->
