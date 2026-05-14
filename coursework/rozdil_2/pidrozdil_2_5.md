# 2.5 Подвійний публічний API: Active Record + Repository з DI

<!-- Що описати — ЦЕНТРАЛЬНИЙ підрозділ для роботи:

  Активний рекорд (BaseModel):
    - Сутність розширює BaseModel і отримує статичні Entity.find / Entity.findOne
    - Instance-методи: entity.save() / entity.delete() / entity.reload()
    - Глобальний DataSource (setDataSource / getDataSource)
    - Коли підходить: швидкий прототип, скрипти, прості CRUD

  Repository pattern:
    - dataSource.getRepository(Entity) → Repository<T>
    - find / findOne / save / delete / count / upsert
    - Кастомні репозиторії розширюють Repository і реєструються через @EntityRepository
    - makeRepository(Entity) — резолв через глобальний реєстр для уникнення прокидання DataSource через шари
    - Коли підходить: clean architecture, NestJS, DI-контейнери, тестування з підстановкою

  Чому ОБИДВА в одній бібліотеці:
    - Обидва шаблони мають свою область застосування
    - У YAOI вони ділять однаковий движок (queryBuilder + driver), не дублюючи логіки
    - Обидва автоматично долучаються до ambient-транзакції (AsyncLocalStorage)

  Diagrams: послідовність викликів для AR та для Repo — підкреслити що шлях під капотом однаковий.
-->
