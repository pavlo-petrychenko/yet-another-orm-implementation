# 4.5 CLI yaoi: migrate:make/up/down/status

<!-- Що описати:
  - bin/yaoi.js — shim, що завантажує dist/cli
  - Резолв yaoi.config.ts (.js/.cjs/.mjs) у CWD; defineConfig() helper
  - Команди:
    - migrate:make <name> — генерує timestamped-файл міграції
    - migrate:up [--to <name>] — застосовує всі pending або до конкретної
    - migrate:down [--name <name>] — відкочує останню застосовану (або конкретну)
    - migrate:status — друкує таблицю applied/pending/orphan/mismatch
  - Контракт exit-кодів: 0/1/2/3 (за типами помилок CliUsageError, ConfigNotFoundError, ConfigShapeError)
  - Чому CLI — тонкий шар без власної бізнес-логіки (вся логіка в MigrationRunner)
-->
