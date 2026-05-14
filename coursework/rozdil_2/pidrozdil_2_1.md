# 2.1 Загальна архітектура, 8 модулів, ациклічний граф залежностей

<!-- Що описати:
  - Декомпозиція на 8 модулів: query-builder, schema-builder, metadata, decorators, drivers, model, migrations, cli
  - Рівні: leaves (QB/SB) → registry (metadata/decorators) → runtime (drivers/model) → schema evolution (migrations/cli)
  - Діаграма залежностей (рисунок) — підкреслити ациклічність
  - Принципи: одна відповідальність на модуль, мінімальний публічний API на модуль
-->
