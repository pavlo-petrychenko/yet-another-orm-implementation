# Розділ 4. Підсистема міграцій і CLI

**Орієнтовний обсяг:** 3-4 сторінки.

**Мета розділу:** описати, як YAOI керує еволюцією схеми БД у часі — discovery файлів, контроль цілісності через чексуми, транзакційність DDL та CLI-інтерфейс для команд миграції.

## Підрозділи

- [4.1](./pidrozdil_4_1.md) MigrationRunner, таблиця yaoi_migrations, статуси
- [4.2](./pidrozdil_4_2.md) SHA-256 чексуми, drift detection
- [4.3](./pidrozdil_4_3.md) Транзакційний DDL і atomic rollback
- [4.4](./pidrozdil_4_4.md) Advisory lock для concurrency safety
- [4.5](./pidrozdil_4_5.md) CLI yaoi: migrate:make/up/down/status
