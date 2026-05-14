# 5.2 Типобезпека

<!-- Що описати (паралельно по 4 ORM):
  - YAOI: декоратори + narrow generics, рекурсивний IncludeConfig, Strict<T>
  - TypeORM: декоратори, але типи WHERE часто розширюються до any у складних запитах
  - Objection.js: query-first, типи додані пізніше, частково any у join і withGraphFetched
  - Drizzle: schema-as-code TypeScript-схема, повна типобезпека на рівні SQL-виразу
  - Порівняти на конкретному прикладі: SELECT users з вкладеним posts і фільтром
  - Висновок: де YAOI сильніший, де програє Drizzle
-->
