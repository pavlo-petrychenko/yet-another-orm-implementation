# 3.6 Repository, EntityManager, кастомні репозиторії, DI

<!-- Що описати:
  - Repository<T>: контракт (find/findOne/save/delete/count/upsert)
  - EntityManager як точка, через яку Repository отримує доступ до driver і metadata
  - Кастомні репозиторії: extends Repository<User>, реєстрація через @EntityRepository
  - Глобальний реєстр репозиторіїв (repositoryRegistry) і makeRepository(Entity)
  - DI-сценарій (приклад на псевдокоді NestJS / clean architecture)
  - Як інтегрується з ambient tx (без явного передавання)
  - Фрагмент коду: оголошення UserRepository з кастомним методом
-->
