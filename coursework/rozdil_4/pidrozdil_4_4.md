# 4.4 Advisory lock для concurrency safety

<!-- Що описати:
  - Сценарій гонки: два інстанси сервера стартують одночасно, обидва запускають migrate:up
  - Без локу — race condition і ризик двічі застосувати ту саму міграцію
  - pg_advisory_lock з фіксованим key — серіалізує запуски на рівні Postgres
  - Лок утримується до завершення сесії runner'а
  - Альтернативи (table-level lock) і чому advisory lock краще
-->
