# 3.9 Тестування (Jest + testcontainers)

<!-- Що описати:
  - Дві категорії тестів: unit (51 сюіт, 456 тестів) і integration (46 сюітів, 171 тест) — точні числа звірити перед здачею через `npm test`
  - Unit-тести покривають QB/SB/compiler/metadata без БД
  - Integration-тести піднімають реальний PostgreSQL через @testcontainers/postgresql
  - Принцип: НЕ мокати БД для інтеграційних — це збережено у feedback memory
  - Структура: jest.config.js + jest.integration.config.js
  - Приклад тесту (фрагмент)
-->
