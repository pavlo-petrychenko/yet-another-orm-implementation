# 5.6 Підхід до міграцій

<!-- Що описати:
  - YAOI: вбудований MigrationRunner + CLI, чексуми, advisory lock, transactional DDL
  - TypeORM: typeorm migration:generate/run, без чексумів, відносно нестабільний CLI
  - Objection.js: переадресація до Knex migrations (CLI, чексумів немає)
  - Drizzle: drizzle-kit generate з diff схеми (codegen), не runtime-runner
  - Порівняти за: drift-detection, безпека rollback, generated vs handwritten
  - Висновок: YAOI унікальний акцентом на цілісність (checksum + advisory lock + transactional)
-->
