# 4.1 MigrationRunner, таблиця yaoi_migrations, статуси

<!-- Що описати:
  - Discovery: сканування директорії на файли-міграції (за розширеннями)
  - Контракт файлу міграції: export up(sb) / export down(sb)
  - Таблиця yaoi_migrations (name, checksum, applied_at)
  - Чотири статуси: applied / pending / orphan / mismatch — що означають
  - Команда migrate:status — як виводить ці статуси
-->
