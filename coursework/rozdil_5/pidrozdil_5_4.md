# 5.4 Подвійний API і DI-сценарії

<!-- Що описати — КЛЮЧОВА теза курсової:
  - YAOI: AR (BaseModel) + Repository (з DI через @EntityRepository, makeRepository)
  - TypeORM: формально підтримує обидва, але DI-інтеграція через @nestjs/typeorm (зовнішня)
  - Objection.js: переважно Active Record style (Model.query()), Repository — користувацький патерн
  - Drizzle: ні AR, ні Repository — тільки функціональний QB
  - Сценарій порівняння: чистий слой репозиторіїв у NestJS-стилі, як написати на кожному
  - Висновок: YAOI унікальний у балансі обидва-з-коробки + однакова робота з ambient tx
-->
